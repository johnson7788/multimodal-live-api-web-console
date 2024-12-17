import { EventEmitter } from 'eventemitter3';
import AudioRecord from 'react-native-audio-record';

export class AudioRecorder extends EventEmitter {
  private isRecording: boolean = false;
  private options: any;

  constructor(public sampleRate = 16000) {
    super();
    this.options = {
      sampleRate: sampleRate,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6,
      wavFile: 'audio.wav'
    };
  }

  async start() {
    try {
      await AudioRecord.init(this.options);
      AudioRecord.start();
      
      this.isRecording = true;
      
      AudioRecord.on('data', (data: any) => {
        const base64String = Buffer.from(data).toString('base64');
        this.emit('data', base64String);
        
        // 计算音量
        const volume = this.calculateVolume(data);
        this.emit('volume', volume);
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }

  private calculateVolume(data: any): number {
    // 简单的音量计算实现
    const buffer = new Int16Array(data);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += Math.abs(buffer[i]);
    }
    return sum / buffer.length / 32768;
  }

  stop() {
    if (this.isRecording) {
      AudioRecord.stop();
      this.isRecording = false;
    }
  }
} 