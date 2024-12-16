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

import { createContext, FC, ReactNode, useContext } from "react";
import { useLiveAPI, UseLiveAPIResults } from "../hooks/use-live-api";

// 创建 LiveAPI 上下文，用于在组件树中共享 LiveAPI 状态
const LiveAPIContext = createContext<UseLiveAPIResults | undefined>(undefined);

// LiveAPIProvider 组件的属性类型定义
export type LiveAPIProviderProps = {
  children: ReactNode;  // 子组件
  url?: string;        // API 服务器地址
  apiKey: string;      // API 密钥
};

// LiveAPIProvider 组件：为子组件提供 LiveAPI 上下文
export const LiveAPIProvider: FC<LiveAPIProviderProps> = ({
  url,
  apiKey,
  children,
}) => {
  // 使用 useLiveAPI hook 获取 LiveAPI 实例
  const liveAPI = useLiveAPI({ url, apiKey });

  return (
    <LiveAPIContext.Provider value={liveAPI}>
      {children}
    </LiveAPIContext.Provider>
  );
};

// 自定义 hook，用于在组件中获取 LiveAPI 上下文
export const useLiveAPIContext = () => {
  const context = useContext(LiveAPIContext);
  // 如果在 Provider 外部使用此 hook，抛出错误
  if (!context) {
    throw new Error("useLiveAPIContext must be used wihin a LiveAPIProvider");
  }
  return context;
};
