#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Date  : 2024/11/13 09:28
# @File  : Gemini relay
# @Author: 
# @Desc  :
import os
import logging
from dotenv import load_dotenv
load_dotenv()

log_path = os.path.join(os.path.dirname(__file__), "logs")
if not os.path.exists(log_path):
    os.makedirs(log_path)
logfile = os.path.join(log_path, f"backend.log")
# 日志的格式
# 配置 logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
file_handler = logging.FileHandler(logfile)
file_handler.setLevel(logging.DEBUG)  # 设置文件日志级别
file_handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
# 获取根日志记录器并添加处理器
root_logger = logging.getLogger()
root_logger.addHandler(file_handler)

import collections
import sys
import json
import re
import time
import random
import inspect
import subprocess
import copy
from queue import Queue
from websockets import WebSocketClientProtocol
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from websockets_proxy import Proxy, proxy_connect
from typing import Dict
import uvicorn
import asyncio
import uuid
import logging
import websockets
from rich.console import Console
from rich.traceback import install

# 获取模块专属日志记录器,就是日志的前缀名称会改变
logger = logging.getLogger(__name__)

class ServerManager:
    def __init__(self, use_proxy=True):
        self.app = FastAPI()
        # Enable CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        self.SERVICE_URL = f"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"
        self.PROXY_URL = "http://127.0.0.1:7890"
        self.GEMINI_KEY = os.environ.get("REACT_APP_GEMINI_API_KEY")
        assert self.GEMINI_KEY, "REACT_APP_GEMINI_API_KEY is not set"
        self.use_proxy = use_proxy
        self._setup_routes()

        self.console = Console()
        install()  # This enables rich traceback formatting for exceptions

    async def send_to_server(self, websocket: WebSocket, gemini_ws: WebSocketClientProtocol) -> None:
        """直接转发给gemini
        用户的消息都是语音，记录没啥用
        """
        try:
            while True:
                data = await websocket.receive_text()
                # 解码成json, 判断是否时更新session的instructions，如果是，不能放过
                try:
                    json_data = json.loads(data)
                    logging.info(f"Received 客户端数据: {json_data}")
                except Exception as e:
                    print(f"Error decoding JSON: {e}")
                logging.info(f"send_to_gemini: {data}")
                await gemini_ws.send(data)
        except WebSocketDisconnect:
            print("error send_to_gemini.")
            if gemini_ws.open:
                await gemini_ws.close()

    async def send_to_webclient(self, websocket: WebSocket, gemini_ws: WebSocketClientProtocol) -> None:
        """直接转发前端"""
        try:
            while True:
                data = await gemini_ws.recv()
                logging.info(f"send_to_webclient: {data}")
                try:
                    await websocket.send_text(data)
                except WebSocketDisconnect:
                    print("WebSocket disconnected while sending to client.")
                    break
        except Exception as e:
            print(f"用户可能断开了Error in send_to_webclient: {e}")

    async def send_session_update(self, gemini_ws: WebSocketClientProtocol, voice:str="Aoede") -> None:
        """Send the session update to the Gemini WebSocket.
        """
        session_update = {
            "setup": {
                "model": "models/gemini-2.0-flash-exp",
                "generationConfig": {
                    "responseModalities": "audio",
                    "speechConfig": {
                        "voiceConfig": {
                            "prebuiltVoiceConfig": {
                                "voiceName": voice
                            }
                        }
                    }
                },
                "systemInstruction": {
                    "parts": [
                        {
                            "text": "You are my helpful assistant. Any time I ask you for a graph call the \"render_altair\" function I have provided you. Dont ask for additional information just make your best judgement."
                        }
                    ]
                },
                "tools": [
                    {
                        "googleSearch": {

                        }
                    },
                    {
                        "functionDeclarations": [
                            {
                                "name": "render_altair",
                                "description": "Displays an altair graph in json format.",
                                "parameters": {
                                    "type": "object",
                                    "properties": {
                                        "json_graph": {
                                            "type": "string",
                                            "description": "JSON STRING representation of the graph to render. Must be a string, not a json object"
                                        }
                                    },
                                    "required": [
                                        "json_graph"
                                    ]
                                }
                            }
                        ]
                    }
                ]
            }
        }
        print(f'Sending session update for Gemini')
        await gemini_ws.send(json.dumps(session_update))

    def _setup_routes(self):
        @self.app.websocket("/ws/gemini")
        async def gemini_stream_endpoint(websocket: WebSocket, key: str|None = None, voice: str = "Aoede"):
            """
            完全透明的websocket用于兼容gemini
            ws://yourdomain/ws/gemini
            voice: 传入的输入是类似这样的，需要从？后面去掉:
            """
            connection_id = str(uuid.uuid4())  # 生成唯一的连接ID
            if key is None:
                key = self.GEMINI_KEY
            try:
                client_protocols = websocket.headers.get("sec-websocket-protocol")
                if client_protocols:
                    # 提取客户端协议，选择一个返回
                    client_protocols = client_protocols.split(",")  # 分割多个协议
                    selected_protocol = client_protocols[0].strip()  # 选择第一个或其他合适的协议
                    await websocket.accept(subprotocol=selected_protocol)
                else:
                    await websocket.accept()  # 客户端没有提供协议时直接接受连接
                # 修改voice的值
                voice = voice.split("?")[0]
                headers = {
                    "Accept-Encoding": "gzip, deflate, br, zstd",
                    "Sec-WebSocket-Key": "rAuNRZSSMTrjkaNnYqikXg==",
                    "Sec-WebSocket-Version": "13",
                    "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits",
                    "Connection": "Upgrade",
                    "Upgrade": "websocket",
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

                }
                gemini_url = self.SERVICE_URL + "?key=" + key
                # 双向数据流的传输是一直连接
                if self.use_proxy:
                    logger.info("使用代理连接 WebSocket")
                    proxy = Proxy.from_url(self.PROXY_URL)
                    async with proxy_connect(gemini_url, extra_headers=headers, proxy=proxy) as gemini_ws:
                        print("Connected to Gemini WebSocket With Proxy.")
                        # 初始化chikka和director
                        await self.send_session_update(gemini_ws,voice)  # 更新session
                        # 处理连接建立
                        await self.handle_websocket_connect(websocket, connection_id)
                        await asyncio.gather(
                            self.send_to_server(websocket, gemini_ws),
                            self.send_to_webclient(websocket, gemini_ws)
                        )
                else:
                    logger.info("直接连接 WebSocket")
                    async with websockets.connect(gemini_url, extra_headers=headers) as gemini_ws:
                        # 初始化chikka和director
                        await self.send_session_update(gemini_ws,voice)  # 更新session
                        # 处理连接建立
                        await self.handle_websocket_connect(websocket, connection_id)
                        await asyncio.gather(
                            self.send_to_server(websocket, gemini_ws),
                            self.send_to_webclient(websocket, gemini_ws)
                        )
            except WebSocketDisconnect:
                logging.info(f"WebSocket连接断开: {connection_id}")
                self.console.print(
                    f"[bold yellow]⚠️  WebSocket disconnected[/bold yellow] for agent type: [green][/green]")
            except Exception as e:
                logging.error(f"WebSocket错误: {str(e)}")
                self.console.print(f"[bold red]⛔  Error in voice stream:[/bold red] {str(e)}", style="red")
            finally:
                # 处理连接断开
                pass

        @self.app.on_event("startup")
        async def startup_event():
            # 移除全局的_handle_inter_agent_communication启动
            pass

        @self.app.websocket("/health")
        async def health_check(websocket: WebSocket):
            await websocket.accept()
            await websocket.close()

        @self.app.websocket("/ping")
        async def ping_check(websocket: WebSocket):
            await websocket.accept()
            data = await websocket.receive_text()
            print(f"Received message: {data}")
            await websocket.send_text("pong")
            await websocket.close()

        @self.app.api_route("/ping", methods=["GET", "POST"])
        async def ping():
            return "Pong"

    def run(self, host: str = "0.0.0.0", port: int = 8080):
        uvicorn.run(self.app, host=host, port=port)

server = ServerManager()
# 用于uvicorn启动
app = server.app

if __name__ == "__main__":
    server.run()


