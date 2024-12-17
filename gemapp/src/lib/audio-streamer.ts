import Sound from 'react-native-sound';
import { EventEmitter } from 'eventemitter3';

export class AudioStreamer extends EventEmitter {
  private sound: Sound | null = null;
  private isPlaying: boolean = false;
  private audioQueue: Float32Array[] = [];
  private sampleRate: number = 24000;

  constructor(public context: any) {
    super();
    Sound.setCategory('Playback');
  }

  async addWorklet<T extends (d: any) => void>(
    workletName: string,
    workletSrc: string,
    handler: T,
  ): Promise<this> {
    // React Native 不支持 AudioWorklet，这里我们模拟这个功能
    return this;
  }

  addPCM16(chunk: Uint8Array) {
    // 将 PCM 数据转换为 Float32Array
    const float32Array = new Float32Array(chunk.length / 2);
    const dataView = new DataView(chunk.buffer);

    for (let i = 0; i < chunk.length / 2; i++) {
      try {
        const int16 = dataView.getInt16(i * 2, true);
        float32Array[i] = int16 / 32768;
      } catch (e) {
        console.error(e);
      }
    }

    this.audioQueue.push(float32Array);

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.playNextBuffer();
    }
  }

  private async playNextBuffer() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    // 在这里实现音频播放逻辑
    // 可以使用 react-native-sound 或其他音频库
  }

  stop() {
    this.isPlaying = false;
    this.audioQueue = [];
    if (this.sound) {
      this.sound.stop();
      this.sound.release();
      this.sound = null;
    }
  }

  async resume() {
    this.isPlaying = true;
    this.playNextBuffer();
  }
} 