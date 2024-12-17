// React Native 音量计算模拟
export class VolumeMeter {
  private volume: number;
  private updateIntervalInMS: number;
  private onVolume: (volume: number) => void;
  private intervalId?: number;

  constructor() {
    this.volume = 0;
    this.updateIntervalInMS = 25;
    this.onVolume = () => {};
  }

  setUpdateInterval(ms: number) {
    this.updateIntervalInMS = ms;
  }

  setOnVolumeCallback(callback: (volume: number) => void) {
    this.onVolume = callback;
  }

  start() {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.onVolume(this.volume);
    }, this.updateIntervalInMS) as any;
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  processAudioData(samples: Float32Array) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }

    const rms = Math.sqrt(sum / samples.length);
    this.volume = Math.max(rms, this.volume * 0.7);
  }
}

export default VolumeMeter; 