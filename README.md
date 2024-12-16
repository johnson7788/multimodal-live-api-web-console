# Multimodal Live API - Web控制台

本代码库包含一个基于React的启动应用程序，用于通过websocket使用[Multimodal Live API]([https://ai.google.dev/gemini-api](https://ai.google.dev/api/multimodal-live))。它提供了用于流式音频播放、录制用户媒体(如麦克风、网络摄像头或屏幕捕获)的模块，以及统一的日志视图，以帮助您开发应用程序。

首先，[创建一个免费的Gemini API密钥](https://aistudio.google.com/apikey)。我们在代码库的其他分支上提供了几个示例应用：

- [demos/GenExplainer](https://github.com/google-gemini/multimodal-live-api-web-console/tree/demos/genexplainer)
- [demos/GenWeather](https://github.com/google-gemini/multimodal-live-api-web-console/tree/demos/genweather)

以下是一个完整应用程序的示例，它将使用Google搜索作为基础，然后使用[vega-embed](https://github.com/vega/vega-embed)渲染图表：

```typescript
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

export const declaration: FunctionDeclaration = {
  name: "render_altair",
  description: "显示altair图表的json格式。",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      json_graph: {
        type: SchemaType.STRING,
        description:
          "要渲染的图表的JSON字符串表示。必须是字符串，而不是json对象",
      },
    },
    required: ["json_graph"],
  },
};

export function Altair() {
  const [jsonString, setJSONString] = useState<string>("");
  const { client, setConfig } = useLiveAPIContext();

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      systemInstruction: {
        parts: [
          {
            text: '你是我的助手。每当我要求你绘制图表时，调用我提供的"render_altair"函数。不要询问额外信息，只需做出你最好的判断。',
          },
        ],
      },
      tools: [{ googleSearch: {} }, { functionDeclarations: [declaration] }],
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      console.log(`收到工具调用`, toolCall);
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name
      );
      if (fc) {
        const str = (fc.args as any).json_graph;
        setJSONString(str);
      }
    };
    client.on("toolcall", onToolCall);
    return () => {
        client.off("toolcall", onToolCall);
    };
  }, [client]);

  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedRef.current && jsonString) {
      vegaEmbed(embedRef.current, JSON.parse(jsonString));
    }
  }, [embedRef, jsonString]);
  return <div className="vega-embed" ref={embedRef} />;
}
```

# 目录结构和重要文件解释

```
src/
├── components/               # 组件目录
│   ├── altair/              # 图表渲染组件
│   │   └── Altair.tsx       # Vega-Altair图表渲染实现
│   └── side-panel/          # 侧边面板组件
│       └── side-panel.scss  # 侧边面板样式
├── contexts/                # React上下文目录
│   └── LiveAPIContext.tsx   # Multimodal Live API的上下文提供者
├── hooks/                   # 自定义Hook目录
│   ├── use-live-api.ts      # Multimodal Live API的Hook封装
│   ├── use-media-stream-mux.ts  # 媒体流复用Hook
│   ├── use-screen-capture.ts    # 屏幕捕获Hook
│   └── use-webcam.ts        # 网络摄像头Hook
├── lib/                     # 工具库目录
│   ├── audioworklet-registry.ts  # 音频工作器注册
│   ├── audio-recorder.ts    # 音频录制实现
│   ├── audio-streamer.ts    # 音频流处理
│   └── worklets/            # 音频工作器
│       └── vol-meter.ts     # 音量计量器实现
└── multimodal-live-types.ts # 类型定义文件
```

### 核心文件说明

- **LiveAPIContext.tsx**: 提供了与Multimodal Live API交互的核心上下文，管理全局状态和配置。

- **use-live-api.ts**: 封装了与API交互的主要逻辑，提供了易用的Hook接口。

- **音频相关模块**:
  - `audio-recorder.ts`: 处理音频录制功能
  - `audio-streamer.ts`: 管理音频流的收发
  - `vol-meter.ts`: 实现实时音量监测

- **媒体捕获Hooks**:
  - `use-media-stream-mux.ts`: 用于合并多个媒体流
  - `use-screen-capture.ts`: 处理屏幕录制功能
  - `use-webcam.ts`: 管理网络摄像头接入

- **Altair.tsx**: 示例组件，展示了如何使用API进行图表渲染，集成了Vega-Embed可视化库。

### 配置文件

- **.env**: 环境配置文件，用于存储API密钥等敏感信息
- **react-app-env.d.ts**: React应用的类型声明文件
- **setupTests.ts**: 测试配置文件

# 开发

本项目使用[Create React App](https://github.com/facebook/create-react-app)引导创建。
项目包含：

- 一个基于事件发射的websocket客户端，用于简化websocket和前端之间的通信
- 用于处理音频输入输出的通信层
- 用于开始构建应用程序和查看日志的样板视图

## 可用脚本

在项目目录中，您可以运行：

### `npm start`

在开发模式下运行应用程序。\
在浏览器中打开[http://localhost:3000](http://localhost:3000)查看。

当您进行编辑时，页面将重新加载。\
您还将在控制台中看到任何lint错误。

### `npm run build`

将应用程序构建到`build`文件夹中用于生产。\
它在生产模式下正确打包React并优化构建以获得最佳性能。

构建被压缩，文件名包含哈希值。\
您的应用程序已准备好部署！

有关更多信息，请参阅[部署](https://facebook.github.io/create-react-app/docs/deployment)部分。
