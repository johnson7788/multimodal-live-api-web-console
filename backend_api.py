import os
import asyncio
import json
import dotenv
import logging
import websockets
from websockets.legacy.protocol import WebSocketCommonProtocol
from websockets.legacy.server import WebSocketServerProtocol
from websockets_proxy import Proxy, proxy_connect
# 不可用g
DEBUG = True
# 配置logging
logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend.log'),
        logging.StreamHandler()  # 同时输出到控制台
    ]
)
logger = logging.getLogger(__name__)

dotenv.load_dotenv()
API_KEY = os.getenv("REACT_APP_GEMINI_API_KEY")
logger.info(f"API_KEY: {API_KEY}")
assert API_KEY, "需要设置环境变量 REACT_APP_GEMINI_API_KEY in .env"
SERVICE_URL = f"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"
SERVICE_URL += f"?key={API_KEY}"
PROXY_URL = "http://127.0.0.1:7890"
# PROXY_URL = ""

setup_message = {
    "setup": {
        "model": "models/gemini-2.0-flash-exp",
        "generationConfig": {
            "responseModalities": "audio",
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": "Aoede"
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
# WebSocket 代理服务器的实现，主要用于在客户端和 Google Cloud AI Platform 之间转发消息。
async def proxy_task(
    source_websocket: WebSocketCommonProtocol, 
    target_websocket: WebSocketCommonProtocol,
    name: str = "unknown"  # 添加名称用于调试
) -> None:
    try:
        async for message in source_websocket:
            await target_websocket.send(message)
            try:
                data = json.loads(message)
                logger.debug(f"{name} forwarding: {data}")
            except json.JSONDecodeError as e:
                # 处理非JSON消息
                logger.debug(f"{name} forwarding raw message")
            except Exception as e:
                logger.error(f"{name} error processing message: {e}", exc_info=True)
                break
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"{name} connection closed normally")
    except Exception as e:
        logger.error(f"{name} connection error: {e}", exc_info=True)
    finally:
        logger.info(f"{name} proxy task ending")
        if not target_websocket.closed:
            await target_websocket.close()


async def create_proxy(
    client_websocket: WebSocketCommonProtocol, bearer_token: str
) -> None:
    """
    Establishes a WebSocket connection to the server and creates two tasks for
    bidirectional message forwarding between the client and the server.

    Args:
        client_websocket: The WebSocket connection of the client.
        bearer_token: The bearer token for authentication with the server.
    """

    headers = {
        "Content-Type": "application/json",
        # "Authorization": f"Bearer {bearer_token}",
    }
    if PROXY_URL:
        logger.info(f"Using proxy: {PROXY_URL}")
        proxy = Proxy.from_url(PROXY_URL)
        async with proxy_connect(SERVICE_URL, extra_headers=headers, proxy=proxy) as server_websocket:
            await server_websocket.send(json.dumps(setup_message)) # 发送设置消息
            client_to_server_task = asyncio.create_task(
                proxy_task(client_websocket, server_websocket, "client_to_server")
            )
            server_to_client_task = asyncio.create_task(
                proxy_task(server_websocket, client_websocket, "server_to_client")
            )
            await asyncio.gather(client_to_server_task, server_to_client_task)
    else:
        async with websockets.connect(
            SERVICE_URL, extra_headers=headers
        ) as server_websocket:
            await server_websocket.send(json.dumps(setup_message)) # 发送设置消息
            client_to_server_task = asyncio.create_task(
                proxy_task(client_websocket, server_websocket, "client_to_server")
            )
            server_to_client_task = asyncio.create_task(
                proxy_task(server_websocket, client_websocket, "server_to_client")
            )
            await asyncio.gather(client_to_server_task, server_to_client_task)


async def handle_client(client_websocket: WebSocketServerProtocol) -> None:
    """
    Handles a new client connection, expecting the first message to contain a bearer token.
    Establishes a proxy connection to the server upon successful authentication.

    Args:
        client_websocket: The WebSocket connection of the client.
    """
    logger.info("New connection received")
    try:
        auth_message = await asyncio.wait_for(client_websocket.recv(), timeout=5.0)
        auth_data = json.loads(auth_message)

        if "bearer_token" in auth_data:
            bearer_token = auth_data["bearer_token"]
        elif API_KEY is not None:
            logger.info("Using 环境变量中的 API_KEY for authentication")
            bearer_token = API_KEY
        else:
            logger.error("Bearer token not found in the first message")
            await client_websocket.close(code=1008, reason="Bearer token missing")
            return

        await create_proxy(client_websocket, bearer_token)
    except Exception as e:
        logger.error(f"Error handling client: {e}", exc_info=True)


async def main() -> None:
    """
    Starts the WebSocket server and listens for incoming client connections.
    """
    try:
        async with websockets.serve(handle_client, "localhost", 8080):
            logger.info("Running websocket server localhost:8080...")
            await asyncio.Future()
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)


if __name__ == "__main__":
    asyncio.run(main())
