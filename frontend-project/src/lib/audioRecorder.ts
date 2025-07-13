import { AudioConfigManager, type AudioFormat } from './audioConfig';

export interface AudioRecorderEvents {
  onStart?: () => void;
  onStop?: (audioFile: File) => void;
  onError?: (error: Error) => void;
  onProgress?: (duration: number) => void;
}

export class ConfigurableAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private stream: MediaStream | null = null;
  private configManager: AudioConfigManager;
  private events: AudioRecorderEvents = {};
  private startTime: number = 0;
  private progressInterval: NodeJS.Timeout | null = null;

  constructor(configManager?: AudioConfigManager) {
    this.configManager = configManager || new AudioConfigManager();
  }

  setEvents(events: AudioRecorderEvents): void {
    this.events = { ...this.events, ...events };
  }

  async startRecording(): Promise<void> {
    try {
      const constraints = {
        audio: this.configManager.getConstraints()
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      const bestFormat = this.configManager.getBestFormat();
      const options = this.configManager.getRecorderOptions(bestFormat);

      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.chunks = [];
      this.startTime = Date.now();

      this.setupRecorderEvents(bestFormat);
      this.mediaRecorder.start(this.configManager.getChunkInterval());
      
      this.startProgressTracking();
      this.events.onStart?.();

    } catch (error) {
      this.cleanup();
      const errorMessage = error instanceof Error ? error.message : 'Unknown recording error';
      const recordingError = new Error(`Recording initialization failed: ${errorMessage}`);
      this.events.onError?.(recordingError);
      throw recordingError;
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    this.stopProgressTracking();
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  getCurrentDuration(): number {
    return this.startTime ? Date.now() - this.startTime : 0;
  }

  private setupRecorderEvents(format: AudioFormat): void {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      try {
        const blob = new Blob(this.chunks, { type: format.mimeType });
        const fileName = this.configManager.createFileName(
          `recording_${Date.now()}`, 
          format
        );
        const audioFile = new File([blob], fileName, { 
          type: format.mimeType,
          lastModified: Date.now()
        });
        
        this.events.onStop?.(audioFile);
      } catch (error) {
        const stopError = new Error(`Failed to process recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
        this.events.onError?.(stopError);
      } finally {
        this.cleanup();
      }
    };

    this.mediaRecorder.onerror = (event) => {
      const error = new Error(`MediaRecorder error: ${event}`);
      this.events.onError?.(error);
      this.cleanup();
    };

    // Auto-stop at max duration
    const maxDuration = this.configManager.getMaxDuration();
    setTimeout(() => {
      if (this.isRecording()) {
        this.stopRecording();
      }
    }, maxDuration);
  }

  private startProgressTracking(): void {
    this.progressInterval = setInterval(() => {
      if (this.isRecording()) {
        const duration = this.getCurrentDuration();
        this.events.onProgress?.(duration);
      }
    }, 100);
  }

  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private cleanup(): void {
    this.stopProgressTracking();
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.mediaRecorder = null;
    this.chunks = [];
    this.startTime = 0;
  }

  // Get current configuration info
  getConfigInfo(): {
    supportedFormats: AudioFormat[];
    selectedFormat: AudioFormat;
    constraints: MediaTrackConstraints;
    maxDuration: number;
  } {
    return {
      supportedFormats: this.configManager.getSupportedFormats(),
      selectedFormat: this.configManager.getBestFormat(),
      constraints: this.configManager.getConstraints(),
      maxDuration: this.configManager.getMaxDuration()
    };
  }

  // Update configuration
  updateConfig(updates: Parameters<AudioConfigManager['updateConfig']>[0]): void {
    this.configManager.updateConfig(updates);
  }
}