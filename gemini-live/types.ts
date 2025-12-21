
export enum SessionStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR'
}

export interface TranscriptionEntry {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface ToolCallEntry {
  id: string;
  name: string;
  args: any;
  result?: any;
  timestamp: number;
}

export interface AudioConfig {
  sampleRate: number;
  channels: number;
}
