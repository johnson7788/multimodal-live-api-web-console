import { useState, useEffect } from "react";
import { Camera } from 'react-native-vision-camera';
import { UseMediaStreamResult } from "./use-media-stream-mux";

export function useWebcam(): UseMediaStreamResult {
  const [stream, setStream] = useState<any>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      const cameraPermission = await Camera.requestCameraPermission();
      const micPermission = await Camera.requestMicrophonePermission();
      return cameraPermission === 'granted' && micPermission === 'granted';
    };
    checkPermission();
  }, []);

  const start = async () => {
    try {
      // 使用 react-native-vision-camera 启动相机
      const devices = await Camera.getAvailableCameraDevices();
      const device = devices.find(d => d.position === 'front');
      
      if (device) {
        setStream(device);
        setIsStreaming(true);
        return device;
      }
      throw new Error('No camera device found');
    } catch (error) {
      console.error('Camera error:', error);
      throw error;
    }
  };

  const stop = () => {
    if (stream) {
      // 停止相机流
      setStream(null);
      setIsStreaming(false);
    }
  };

  return {
    type: "camera",
    start,
    stop,
    isStreaming,
    stream,
  };
} 