// React Native 音频处理模拟
export class AudioProcessor {
  private buffer: Int16Array;
  private bufferWriteIndex: number;
  private onData: (data: ArrayBuffer) => void;

  constructor(bufferSize = 2048) {
    this.buffer = new Int16Array(bufferSize);
    this.bufferWriteIndex = 0;
    this.onData = () => {};
  }

  setOnDataCallback(callback: (data: ArrayBuffer) => void) {
    this.onData = callback;
  }

  processChunk(float32Array: Float32Array) {
    for (let i = 0; i < float32Array.length; i++) {
      // 将 float32 (-1 到 1) 转换为 int16 (-32768 到 32767)
      const int16Value = Math.floor(float32Array[i] * 32768);
      this.buffer[this.bufferWriteIndex++] = int16Value;

      if (this.bufferWriteIndex >= this.buffer.length) {
        this.sendAndClearBuffer();
      }
    }
  }

  private sendAndClearBuffer() {
    if (this.bufferWriteIndex > 0) {
      const data = this.buffer.slice(0, this.bufferWriteIndex).buffer;
      this.onData(data);
      this.bufferWriteIndex = 0;
    }
  }
}

export default AudioProcessor; 