
export enum SessionStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR'
}

export interface Appointment {
  id: string;
  patientName: string;
  doctorSpecialty: string;
  preferredDate: string;
  preferredTime: string;
  notes: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  bookedAt: number;
  bookedVia: 'manual' | 'voice';
  consultType?: 'voice' | 'video' | 'physical';
  severity?: SeverityLevel;
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

// ------- New Feature Types -------

export type SeverityLevel = 'mild' | 'moderate' | 'severe';

export interface SeverityResult {
  level: SeverityLevel;
  score: number;
  message: string;
  action: 'self_care' | 'book_appointment' | 'emergency';
}

export type ConsultType = 'voice' | 'video' | 'physical';

export interface WaitlistEntry {
  id: string;
  patientName: string;
  doctorSpecialty: string;
  preferredDate: string;
  severityScore: number;
  createdAt: number;
  notified: boolean;
}

export interface DoctorCapacity {
  specialty: string;
  maxPatientsPerDay: number;
  emergencyBuffer: number;
  date: string;
  booked: number;
}

export interface FollowUp {
  id: string;
  patientName: string;
  appointmentId: string;
  checkInDate: string;
  symptoms: string;
  trend: 'improving' | 'stable' | 'worsening' | 'pending';
  createdAt: number;
}

export interface LoadPrediction {
  date: string;
  expectedPatients: number;
  riskLevel: 'low' | 'normal' | 'high' | 'critical';
  recommendedDoctors: number;
  teleconsultPct: number;
}
