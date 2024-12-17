import { createContext, FC, ReactNode, useContext } from "react";
import { useLiveApi, UseLiveAPIResults } from "../hooks/use-live-api";

// 创建 LiveAPI 上下文
const LiveAPIContext = createContext<UseLiveAPIResults | undefined>(undefined);

// LiveAPIProvider 属性类型定义
export type LiveAPIProviderProps = {
  children: ReactNode;
  url?: string;
  apiKey: string;
};

// LiveAPIProvider 组件
export const LiveAPIProvider: FC<LiveAPIProviderProps> = ({
  url,
  apiKey,
  children,
}) => {
  const liveAPI = useLiveApi({ url, apiKey });

  return (
    <LiveAPIContext.Provider value={liveAPI}>
      {children}
    </LiveAPIContext.Provider>
  );
};

// 自定义 hook 用于访问 LiveAPI 上下文
export const useLiveAPIContext = () => {
  const context = useContext(LiveAPIContext);
  if (!context) {
    throw new Error("useLiveAPIContext must be used within a LiveAPIProvider");
  }
  return context;
};

// 导出 UseLiveAPIResults 类型，供其他组件使用
export type { UseLiveAPIResults }; 