export type UseMediaStreamResult = {
  type: "camera" | "screen";
  start: () => Promise<any>;  // React Native 中的媒体流类型
  stop: () => void;
  isStreaming: boolean;
  stream: any | null;  // React Native 中的媒体流
}; 