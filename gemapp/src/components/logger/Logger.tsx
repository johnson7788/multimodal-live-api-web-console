import React, { ReactNode } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Part } from "@google/generative-ai";
import { useLoggerStore } from "../../lib/store-logger";
import {
  ClientContentMessage,
  isClientContentMessage,
  isInterrupted,
  isModelTurn,
  isServerContenteMessage,
  isToolCallCancellationMessage,
  isToolCallMessage,
  isToolResponseMessage,
  isTurnComplete,
  ModelTurn,
  ServerContentMessage,
  StreamingLog,
  ToolCallCancellationMessage,
  ToolCallMessage,
  ToolResponseMessage,
} from "../../multimodal-live-types";

const formatTime = (d: Date) => d.toLocaleTimeString().slice(0, -3);

const LogEntry = ({
  log,
  MessageComponent,
}: {
  log: StreamingLog;
  MessageComponent: ({
    message,
  }: {
    message: StreamingLog["message"];
  }) => ReactNode;
}): JSX.Element => (
  <View style={[
    styles.plainLog,
    styles[`source${log.type.slice(0, log.type.indexOf("."))}`],
    log.type.includes('receive') && styles.receive,
    log.type.includes('send') && styles.send,
  ]}>
    <Text style={styles.timestamp}>{formatTime(log.date)}</Text>
    <Text style={styles.source}>{log.type}</Text>
    <View style={styles.message}>
      <MessageComponent message={log.message} />
    </View>
    {log.count && <Text style={styles.count}>{log.count}</Text>}
  </View>
);

const PlainTextMessage = ({
  message,
}: {
  message: StreamingLog["message"];
}) => <Text>{message as string}</Text>;

type Message = { message: StreamingLog["message"] };

const AnyMessage = ({ message }: Message) => (
  <Text style={styles.pre}>{JSON.stringify(message, null, 2)}</Text>
);

const RenderPart = ({ part }: { part: Part }) =>
  part.text && part.text.length ? (
    <Text style={styles.partText}>{part.text}</Text>
  ) : (
    <View style={styles.partInlineData}>
      <Text style={styles.h5}>Inline Data: {part.inlineData?.mimeType}</Text>
    </View>
  );

const ClientContentLog = ({ message }: Message) => {
  const { turns, turnComplete } = (message as ClientContentMessage).clientContent;
  return (
    <View style={[styles.richLog, styles.clientContent]}>
      <Text style={[styles.h4, styles.roleUser]}>User</Text>
      {turns.map((turn, i) => (
        <View key={`message-turn-${i}`}>
          {turn.parts
            .filter((part) => !(part.text && part.text === "\n"))
            .map((part, j) => (
              <RenderPart part={part} key={`message-turn-${i}-part-${j}`} />
            ))}
        </View>
      ))}
      {!turnComplete && <Text>turnComplete: false</Text>}
    </View>
  );
};

const ToolCallLog = ({ message }: Message) => {
  const { toolCall } = message as ToolCallMessage;
  return (
    <View style={[styles.richLog, styles.toolCall]}>
      {toolCall.functionCalls.map((fc) => (
        <View key={fc.id} style={styles.partFunctionCall}>
          <Text style={styles.h5}>Function call: {fc.name}</Text>
          <Text style={styles.pre}>{JSON.stringify(fc, null, 2)}</Text>
        </View>
      ))}
    </View>
  );
};

const ToolCallCancellationLog = ({ message }: Message): JSX.Element => (
  <View style={[styles.richLog, styles.toolCallCancellation]}>
    <Text>
      ids:{" "}
      {(message as ToolCallCancellationMessage).toolCallCancellation.ids.map(
        (id) => (
          <Text key={`cancel-${id}`} style={styles.inlineCode}>"{id}"</Text>
        ),
      )}
    </Text>
  </View>
);

const ToolResponseLog = ({ message }: Message): JSX.Element => (
  <View style={[styles.richLog, styles.toolResponse]}>
    {(message as ToolResponseMessage).toolResponse.functionResponses.map(
      (fc) => (
        <View key={`tool-response-${fc.id}`} style={styles.part}>
          <Text style={styles.h5}>Function Response: {fc.id}</Text>
          <Text style={styles.pre}>{JSON.stringify(fc.response, null, 2)}</Text>
        </View>
      ),
    )}
  </View>
);

const ModelTurnLog = ({ message }: Message): JSX.Element => {
  const serverContent = (message as ServerContentMessage).serverContent;
  const { modelTurn } = serverContent as ModelTurn;
  const { parts } = modelTurn;

  return (
    <View style={[styles.richLog, styles.modelTurn]}>
      <Text style={[styles.h4, styles.roleModel]}>Model</Text>
      {parts
        .filter((part) => !(part.text && part.text === "\n"))
        .map((part, j) => (
          <RenderPart part={part} key={`model-turn-part-${j}`} />
        ))}
    </View>
  );
};

const CustomPlainTextLog = (msg: string) => () => (
  <PlainTextMessage message={msg} />
);

export type LoggerFilterType = "conversations" | "tools" | "none";

const filters: Record<LoggerFilterType, (log: StreamingLog) => boolean> = {
  tools: (log: StreamingLog) =>
    isToolCallMessage(log.message) ||
    isToolResponseMessage(log.message) ||
    isToolCallCancellationMessage(log.message),
  conversations: (log: StreamingLog) =>
    isClientContentMessage(log.message) || isServerContenteMessage(log.message),
  none: () => true,
};

const component = (log: StreamingLog) => {
  if (typeof log.message === "string") {
    return PlainTextMessage;
  }
  if (isClientContentMessage(log.message)) {
    return ClientContentLog;
  }
  if (isToolCallMessage(log.message)) {
    return ToolCallLog;
  }
  if (isToolCallCancellationMessage(log.message)) {
    return ToolCallCancellationLog;
  }
  if (isToolResponseMessage(log.message)) {
    return ToolResponseLog;
  }
  if (isServerContenteMessage(log.message)) {
    const { serverContent } = log.message;
    if (isInterrupted(serverContent)) {
      return CustomPlainTextLog("interrupted");
    }
    if (isTurnComplete(serverContent)) {
      return CustomPlainTextLog("turnComplete");
    }
    if (isModelTurn(serverContent)) {
      return ModelTurnLog;
    }
  }
  return AnyMessage;
};

export interface LoggerProps {
  filter?: LoggerFilterType;
}

export default function Logger({ filter = "none" }: LoggerProps) {
  const { logs } = useLoggerStore();
  const filterFn = filters[filter];

  return (
    <View style={styles.logger}>
      <ScrollView style={styles.loggerList}>
        {logs.filter(filterFn).map((log, key) => (
          <LogEntry MessageComponent={component(log)} log={log} key={key} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  logger: {
    flex: 1,
    width: '100%',
  },
  loggerList: {
    paddingHorizontal: 25,
  },
  richLog: {
    gap: 4,
  },
  pre: {
    fontFamily: 'monospace',
  },
  h4: {
    fontSize: 14,
    textTransform: 'uppercase',
    paddingVertical: 8,
  },
  h5: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3133',
  },
  part: {
    backgroundColor: '#FBFBFB',
    padding: 14,
    marginBottom: 4,
    borderRadius: 8,
  },
  partText: {
    color: '#1A1D1E',
  },
  partInlineData: {
    backgroundColor: '#FBFBFB',
    padding: 14,
    borderRadius: 8,
  },
  partFunctionCall: {
    backgroundColor: '#FBFBFB',
    padding: 14,
    borderRadius: 8,
  },
  plainLog: {
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'center',
  },
  timestamp: {
    width: 70,
    color: '#707577',
    fontFamily: 'monospace',
    fontSize: 14,
  },
  source: {
    fontWeight: 'bold',
    marginRight: 4,
  },
  message: {
    flex: 1,
    color: '#707577',
  },
  count: {
    backgroundColor: '#FBFBFB',
    fontSize: 10,
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderRadius: 8,
    color: '#2962FF',
  },
  inlineCode: {
    fontStyle: 'italic',
    marginRight: 4,
  },
  roleUser: {
    color: '#4CAF50',
  },
  roleModel: {
    color: '#2962FF',
  },
  sourceServer: {
    color: '#2962FF',
  },
  sourceClient: {
    color: '#4CAF50',
  },
  receive: {
    color: '#2962FF',
  },
  send: {
    color: '#4CAF50',
  },
  clientContent: {},
  toolCall: {},
  toolCallCancellation: {},
  toolResponse: {},
  modelTurn: {},
}); 