
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

export interface UserProfile {
  name: string;
  age: string;
  allergies: string;
  conditions: string;
  medications: string;
}

export interface SessionRecord {
  id: string;
  date: number;
  duration: number;
  transcriptions: TranscriptionEntry[];
  toolCalls: ToolCallEntry[];
  language: string;
}

export interface PrescriptionReminder {
  id: string;
  medication: string;
  time: string;
  frequency: string;
  createdAt: number;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}
