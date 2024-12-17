import { Platform } from 'react-native';
import Sound from 'react-native-sound';

export type GetAudioContextOptions = {
  id?: string;
  sampleRate?: number;
};

const audioContextMap = new Map<string, any>();

// React Native 音频上下文模拟
export const audioContext = async (options?: GetAudioContextOptions) => {
  if (options?.id && audioContextMap.has(options.id)) {
    return audioContextMap.get(options.id);
  }

  // 创建一个简单的音频上下文模拟对象
  const ctx = {
    sampleRate: options?.sampleRate || 44100,
    state: 'running',
    createGain: () => ({
      connect: () => {},
      gain: {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
      },
      disconnect: () => {},
    }),
    createBufferSource: () => ({
      connect: () => {},
      start: () => {},
      disconnect: () => {},
    }),
    destination: {},
  };

  if (options?.id) {
    audioContextMap.set(options.id, ctx);
  }

  return ctx;
};

export const blobToJSON = async (data: any) => {
  try {
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    if (data instanceof ArrayBuffer) {
      const decoder = new TextDecoder();
      const text = decoder.decode(data);
      return JSON.parse(text);
    }
    return data;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    throw error;
  }
};

export function base64ToArrayBuffer(base64: string) {
  const binaryString = Buffer.from(base64, 'base64');
  return binaryString.buffer.slice(
    binaryString.byteOffset,
    binaryString.byteOffset + binaryString.byteLength
  );
} 