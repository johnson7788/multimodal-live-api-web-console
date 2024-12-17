/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useRef, useState } from "react";
import "./App.scss";
import { LiveAPIProvider } from "./contexts/LiveAPIContext";
import SidePanel from "./components/side-panel/SidePanel";
import { Altair } from "./components/altair/Altair";
import ControlTray from "./components/control-tray/ControlTray";
import cn from "classnames";

// 从环境变量中获取 Gemini API 密钥
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;
if (typeof API_KEY !== "string") {
  throw new Error("set REACT_APP_GEMINI_APIK_KEY in .env");
}
const uri = process.env.REACT_APP_GEMINI_URI as string;
if (!uri) {
  throw new Error("需要设置环境变量 REACT_APP_GEMINI_URI in .env");
}

function App() {
  // 创建视频元素的引用，用于显示活动的视频流（网络摄像头或屏幕共享）
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // 状态管理：存储当前的视频流（可以是屏幕共享、摄像头视频或空值）
  // 如果为空值，则隐藏视频元素
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  return (
    <div className="App">
      {/* LiveAPIProvider 提供实时 API 上下文 */}
      <LiveAPIProvider url={uri} apiKey={API_KEY}>
        <div className="streaming-console">
          {/* 侧边面板组件 */}
          <SidePanel />
          <main>
            <div className="main-app-area">
              {/* Altair 主应用组件 */}
              <Altair />
              {/* 视频显示区域 */}
              <video
                className={cn("stream", {
                  // 当视频引用不存在或没有视频流时隐藏
                  hidden: !videoRef.current || !videoStream,
                })}
                ref={videoRef}
                autoPlay
                playsInline
              />
            </div>

            {/* 控制面板组件 */}
            <ControlTray
              videoRef={videoRef}
              supportsVideo={true}
              onVideoStreamChange={setVideoStream}
            >
              {/* 可以在这里添加自定义按钮 */}
            </ControlTray>
          </main>
        </div>
      </LiveAPIProvider>
    </div>
  );
}

export default App;
