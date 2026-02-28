
import { audioBufferToWav } from './wavEncoder';

export interface TrackInfo {
  id: string;
  name: string;
  color: string;
}

export interface AudioInfo {
  duration: number;
  sampleRate: number;
  channels: number;
  bpm: number;
  fileSize: number;
}

export type ProgressCallback = (step: string, pct: number) => void;

export const TRACKS: TrackInfo[] = [
  { id: 'vocals', name: 'Vocals',  color: '#00f3ff' },
  { id: 'drums',  name: 'Drums',   color: '#bc13fe' },
  { id: 'bass',   name: 'Bass',    color: '#0aff68' },
  { id: 'other',  name: 'Other',   color: '#ffbd00' },
];

/** Apply frequency filters to produce 4 stem tracks from original audio. */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private originalBuffer: AudioBuffer | null = null;
  private trackBuffers: Map<string, AudioBuffer> = new Map();
  private trackGains: Map<string, GainNode> = new Map();
  private trackSources: Map<string, AudioBufferSourceNode> = new Map();
  private trackAnalysers: Map<string, AnalyserNode> = new Map();
  private soloTrack: string | null = null;
  private volumes: Map<string, number> = new Map();
  private mutedTracks: Set<string> = new Set();
  private playing = false;
  private startTime = 0;
  private pausedAt = 0;
  private endedCallback: (() => void) | null = null;

  getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  async loadFile(file: File, onProgress: ProgressCallback): Promise<AudioInfo> {
    const ctx = this.getContext();
    const fileSize = file.size;

    onProgress('Декодирование аудио...', 5);
    const arrayBuffer = await file.arrayBuffer();
    this.originalBuffer = await ctx.decodeAudioData(arrayBuffer);
    onProgress('Анализ спектра...', 15);

    const steps = [
      { id: 'bass',   label: 'Изоляция баса...',        from: 15, to: 38 },
      { id: 'drums',  label: 'Изоляция ударных...',      from: 38, to: 60 },
      { id: 'vocals', label: 'Изоляция вокала...',       from: 60, to: 82 },
      { id: 'other',  label: 'Изоляция инструментов...', from: 82, to: 96 },
    ];

    for (const step of steps) {
      onProgress(step.label, step.from);
      const buf = await this.renderTrack(step.id);
      this.trackBuffers.set(step.id, buf);
      onProgress(step.label, step.to);
    }

    onProgress('Анализ темпа (BPM)...', 97);
    const bpm = this.detectBPM(this.originalBuffer);

    onProgress('Готово!', 100);

    return {
      duration: this.originalBuffer.duration,
      sampleRate: this.originalBuffer.sampleRate,
      channels: this.originalBuffer.numberOfChannels,
      bpm,
      fileSize,
    };
  }

  private async renderTrack(id: string): Promise<AudioBuffer> {
    const src = this.originalBuffer!;
    const offCtx = new OfflineAudioContext(
      src.numberOfChannels,
      src.length,
      src.sampleRate,
    );

    const srcNode = offCtx.createBufferSource();
    srcNode.buffer = src;

    const chain = this.buildFilterChain(id, offCtx);
    srcNode.connect(chain.input);
    chain.output.connect(offCtx.destination);
    srcNode.start(0);

    return offCtx.startRendering();
  }

  private buildFilterChain(
    id: string,
    ctx: BaseAudioContext,
  ): { input: AudioNode; output: AudioNode } {
    switch (id) {
      case 'bass': {
        // Sub-bass + bass: lowpass 200 Hz
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 200;
        lp.Q.value = 0.7;
        return { input: lp, output: lp };
      }
      case 'drums': {
        // Drums: bandpass 60-10000 Hz with transient peaks
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 60;
        hp.Q.value = 0.5;

        const pk1 = ctx.createBiquadFilter();
        pk1.type = 'peaking';
        pk1.frequency.value = 800;
        pk1.gain.value = 6;
        pk1.Q.value = 1.5;

        const pk2 = ctx.createBiquadFilter();
        pk2.type = 'peaking';
        pk2.frequency.value = 5000;
        pk2.gain.value = 5;
        pk2.Q.value = 1.2;

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 10000;
        lp.Q.value = 0.5;

        hp.connect(pk1);
        pk1.connect(pk2);
        pk2.connect(lp);
        return { input: hp, output: lp };
      }
      case 'vocals': {
        // Vocals: mid bandpass 300-3000 Hz
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 300;
        hp.Q.value = 0.5;

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 3000;
        lp.Q.value = 0.5;

        hp.connect(lp);
        return { input: hp, output: lp };
      }
      case 'other':
      default: {
        // Other: highpass 3000 Hz (harmonics, synths)
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 3000;
        hp.Q.value = 0.5;
        return { input: hp, output: hp };
      }
    }
  }

  /** Simple autocorrelation BPM detection. */
  private detectBPM(buffer: AudioBuffer): number {
    const data = buffer.getChannelData(0);
    const sr = buffer.sampleRate;
    // Analyse first 30 seconds max
    const len = Math.min(data.length, sr * 30);
    // Downsample by 4 for speed
    const step = 4;
    const samples: number[] = [];
    for (let i = 0; i < len; i += step) samples.push(data[i]);

    const minBPM = 60, maxBPM = 180;
    const minLag = Math.round((60 / maxBPM) * (sr / step));
    const maxLag = Math.round((60 / minBPM) * (sr / step));

    let bestLag = minLag, bestVal = -Infinity;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < samples.length - lag; i++) {
        sum += samples[i] * samples[i + lag];
      }
      if (sum > bestVal) { bestVal = sum; bestLag = lag; }
    }

    const bpm = Math.round(60 / (bestLag * step / sr));
    return Math.max(60, Math.min(200, bpm));
  }

  play(onEnded?: () => void): void {
    if (!this.originalBuffer) return;
    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();

    this.stopSources();
    this.endedCallback = onEnded || null;

    const startAt = this.pausedAt;
    this.startTime = ctx.currentTime - startAt;

    TRACKS.forEach(({ id }) => {
      const buf = this.trackBuffers.get(id);
      if (!buf) return;

      const gainNode = ctx.createGain();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      const vol = (this.volumes.get(id) ?? 100) / 100;
      const muted = this.mutedTracks.has(id);
      const soloed = this.soloTrack !== null && this.soloTrack !== id;
      gainNode.gain.value = (muted || soloed) ? 0 : vol;

      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.connect(gainNode);
      gainNode.connect(analyser);
      analyser.connect(ctx.destination);
      source.start(0, startAt);

      this.trackGains.set(id, gainNode);
      this.trackAnalysers.set(id, analyser);
      this.trackSources.set(id, source);

      // Trigger ended on last track
      if (id === 'other') {
        source.onended = () => {
          if (this.playing) {
            this.playing = false;
            this.pausedAt = 0;
            this.endedCallback?.();
          }
        };
      }
    });

    this.playing = true;
  }

  pause(): void {
    if (!this.playing) return;
    const ctx = this.getContext();
    this.pausedAt = ctx.currentTime - this.startTime;
    this.stopSources();
    this.playing = false;
  }

  stop(): void {
    this.stopSources();
    this.playing = false;
    this.pausedAt = 0;
  }

  private stopSources(): void {
    this.trackSources.forEach(src => { try { src.stop(); } catch {} });
    this.trackSources.clear();
  }

  getCurrentTime(): number {
    if (!this.ctx) return 0;
    if (!this.playing) return this.pausedAt;
    return this.ctx.currentTime - this.startTime;
  }

  getDuration(): number {
    return this.originalBuffer?.duration ?? 0;
  }

  seekTo(time: number): void {
    const wasPlaying = this.playing;
    this.pausedAt = Math.max(0, Math.min(time, this.getDuration()));
    if (wasPlaying) this.play(this.endedCallback ?? undefined);
  }

  setVolume(id: string, vol: number): void {
    this.volumes.set(id, vol);
    const gain = this.trackGains.get(id);
    if (!gain) return;
    const muted = this.mutedTracks.has(id);
    const soloed = this.soloTrack !== null && this.soloTrack !== id;
    gain.gain.value = (muted || soloed) ? 0 : vol / 100;
  }

  setMuted(id: string, muted: boolean): void {
    if (muted) this.mutedTracks.add(id);
    else this.mutedTracks.delete(id);
    this.setVolume(id, this.volumes.get(id) ?? 100);
  }

  setSolo(id: string | null): void {
    this.soloTrack = id;
    TRACKS.forEach(t => this.setVolume(t.id, this.volumes.get(t.id) ?? 100));
  }

  getAnalyser(id: string): AnalyserNode | null {
    return this.trackAnalysers.get(id) ?? null;
  }

  exportTrack(id: string, name: string): void {
    const buf = this.trackBuffers.get(id);
    if (!buf) return;
    const blob = audioBufferToWav(buf);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.wav`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  isPlaying(): boolean { return this.playing; }

  dispose(): void {
    this.stop();
    this.ctx?.close();
    this.ctx = null;
  }
}
