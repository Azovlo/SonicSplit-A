export enum AppState {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  RESULTS = 'RESULTS'
}

export interface AudioTrack {
  id: string;
  name: string;
  color: string;
  isMuted: boolean;
  volume: number;
  downloadUrl: string;
}

export type ProcessingStep = {
  id: number;
  label: string;
  completed: boolean;
}