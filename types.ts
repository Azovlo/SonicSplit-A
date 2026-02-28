export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  RESULTS = 'RESULTS',
}

export interface AudioTrack {
  id: string;
  name: string;
  color: string;
  isMuted: boolean;
  isSolo: boolean;
  volume: number;
}

export interface AudioInfo {
  duration: number;
  sampleRate: number;
  channels: number;
  bpm: number;
  fileSize: number;
}

export type ProcessingStep = {
  label: string;
  pct: number;
};