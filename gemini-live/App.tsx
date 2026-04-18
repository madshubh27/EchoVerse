import React, { useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import VoiceAgent from './components/VoiceAgent';
import TranscriptionView from './components/TranscriptionView';
import VoiceSelector from './components/VoiceSelector';
import FollowUpMonitor from './components/FollowUpMonitor';
import SeverityBanner from './components/SeverityBanner';
import { classifySeverityFromText } from './services/severity';
import { checkRedFlags } from './services/redFlags';
import { DEFAULT_VOICE_ID } from './services/elevenlabs';
import {
  Appointment,
  SessionStatus,
  SeverityResult,
  ToolCallEntry,
  TranscriptionEntry,
  UserProfile as UserProfileType,
} from './types';

const defaultProfile: UserProfileType = {
  name: 'Sarah',
  age: '32',
  allergies: 'None known',
  conditions: 'Seasonal asthma',
  medications: 'Albuterol inhaler as needed',
};

const DEFAULT_APPOINTMENTS: Appointment[] = [
  {
    id: 'appt-1',
    patientName: 'Sarah',
    doctorSpecialty: 'Cardiologist',
    preferredDate: '2026-02-26',
    preferredTime: '10:30 AM',
    notes: 'Follow-up after intermittent body pain and chest tightness',
    status: 'upcoming',
    bookedAt: Date.now() - 1000 * 60 * 60 * 48,
    bookedVia: 'manual',
    consultType: 'voice',
  },
];

const seedFollowUps = () => {
  if (typeof window === 'undefined') return;
  const key = 'med_ai_followups';
  if (localStorage.getItem(key)) return;

  localStorage.setItem(
    key,
    JSON.stringify([
      {
        id: 'followup-1',
        patientName: 'Sarah',
        appointmentId: 'appt-1',
        checkInDate: '2026-02-26',
        symptoms: 'i am having body pain',
        trend: 'stable',
        createdAt: Date.now() - 1000 * 60 * 60 * 24,
      },
      {
        id: 'followup-2',
        patientName: 'Sarah',
        appointmentId: 'appt-1',
        checkInDate: '2026-02-27',
        symptoms: 'pain is still there but manageable',
        trend: 'stable',
        createdAt: Date.now(),
      },
    ])
  );
};

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('English (English)');
  const [status, setStatus] = useState(SessionStatus.IDLE);
  const [selectedVoiceId, setSelectedVoiceId] = useState(DEFAULT_VOICE_ID);
  const [symptomInput, setSymptomInput] = useState('');
  const [severityResult, setSeverityResult] = useState<SeverityResult | null>(null);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [toolActivities, setToolActivities] = useState<ToolCallEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [appointments] = useState<Appointment[]>(DEFAULT_APPOINTMENTS);
  const [userProfile] = useState<UserProfileType>(defaultProfile);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    seedFollowUps();
  }, []);

  const statusLabel = useMemo(() => {
    if (status === SessionStatus.CONNECTING) return 'Connecting...';
    if (status === SessionStatus.ACTIVE) return 'Live';
    return 'Ready';
  }, [status]);

  const handleAnalyzeSymptoms = () => {
    const value = symptomInput.trim();
    if (!value) {
      setSeverityResult({
        level: 'mild',
        score: 0,
        message: 'Please describe your symptoms to begin the assessment.',
        action: 'self_care',
      });
      return;
    }

    const redFlag = checkRedFlags(value);
    if (redFlag.triggered) {
      setSeverityResult({
        level: 'severe',
        score: 10,
        message: redFlag.emergencyMessage,
        action: 'emergency',
      });
      return;
    }

    setSeverityResult(classifySeverityFromText(value));
  };

  const handleStart = () => setStatus(SessionStatus.CONNECTING);
  const handleEnd = () => setStatus(SessionStatus.IDLE);

  const handleTranscription = (role: 'user' | 'assistant', text: string) => {
    setTranscriptions(prev => [...prev, { role, text, timestamp: Date.now() }]);
  };

  const handleToolCall = (call: Omit<ToolCallEntry, 'timestamp'>) => {
    setToolActivities(prev => [...prev, { ...call, timestamp: Date.now() }]);
  };

  const handleToolResult = (id: string, result: any) => {
    setToolActivities(prev => prev.map(call => (call.id === id ? { ...call, result } : call)));
  };

  const handleError = (message: string) => {
    setError(message);
  };

  const handleVoiceBookAppointment = (_dept: string, _time: string, _reason: string) => {
    setError('Voice booking is available in the live call flow.');
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Header
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(value => !value)}
        language={language}
        onLanguageChange={setLanguage}
        onOpenProfile={() => setError('Profile modal is hidden in this screenshot layout.')}
        onOpenHistory={() => setError('History modal is hidden in this screenshot layout.')}
        onOpenAppointments={() => setError('Appointments modal is hidden in this screenshot layout.')}
      />

      <main className="mx-auto max-w-[1240px] px-4 sm:px-6 py-4 space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.95fr)]">
          <div className="space-y-4">
            <VoiceAgent
              status={status}
              setStatus={setStatus}
              onStart={handleStart}
              onEnd={handleEnd}
              onTranscription={handleTranscription}
              onToolCall={handleToolCall}
              onToolResult={handleToolResult}
              onError={handleError}
              language={language}
              userProfile={userProfile}
              onSessionEnd={() => setStatus(SessionStatus.IDLE)}
              selectedVoiceId={selectedVoiceId}
              onVoiceBookAppointment={handleVoiceBookAppointment}
            />

            <section className="rounded-2xl border border-white/10 bg-slate-800/60 backdrop-blur-xl p-4 shadow-lg shadow-black/10">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🩺</span>
                  <h3 className="font-semibold text-slate-100">AI Symptom Checker</h3>
                </div>
                <span className="rounded-full bg-slate-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Instant Severity Assessment
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={symptomInput}
                  onChange={e => setSymptomInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleAnalyzeSymptoms();
                    }
                  }}
                  placeholder="Describe your symptoms (e.g. chest pain, fever...)"
                  className="h-11 flex-1 rounded-xl border border-slate-600/70 bg-slate-900 px-4 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleAnalyzeSymptoms}
                  className="h-11 rounded-xl bg-cyan-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
                >
                  Check
                </button>
              </div>

              {severityResult && (
                <div className="mt-4">
                  <SeverityBanner
                    result={severityResult}
                    symptoms={[symptomInput]}
                    onBookAppointment={() => setError('Appointment booking opens from the appointment modal in the full app.')}
                    onEmergency={() => setError('Emergency action is shown in the banner.')}
                    onDismiss={() => setSeverityResult(null)}
                  />
                </div>
              )}
            </section>

            <VoiceSelector
              selectedVoiceId={selectedVoiceId}
              onVoiceChange={setSelectedVoiceId}
              disabled={status !== SessionStatus.IDLE}
            />
          </div>

          <div className="space-y-4">
            <TranscriptionView entries={transcriptions} />
            <FollowUpMonitor appointments={appointments} patientName={userProfile.name} />
          </div>
        </div>
      </main>

      <button
        onClick={() => setError('Load dashboard is part of the previous view. The layout now matches the screenshot.')}
        className="fixed bottom-5 left-4 z-30 flex items-center gap-2 rounded-xl border border-cyan-500/60 bg-slate-800/90 px-4 py-2 text-xs font-semibold text-slate-100 shadow-xl shadow-black/20 backdrop-blur hover:border-cyan-400 hover:text-cyan-300"
      >
        <span>📊</span>
        <span>Load Dashboard</span>
      </button>

      {error && (
        <div className="fixed bottom-5 right-5 z-40 max-w-sm rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 shadow-xl shadow-black/20">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="font-semibold text-red-100">Notice</p>
              <p className="mt-0.5 text-xs text-red-200/90">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-300 hover:text-white">
              ×
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-5 right-5 hidden" />

      <div className="fixed top-4 right-4 hidden">{statusLabel}</div>
    </div>
  );
};

export default App;