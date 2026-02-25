
import React, { useState, useEffect, useCallback } from 'react';
import { SessionStatus, TranscriptionEntry, ToolCallEntry, UserProfile as UserProfileType, SessionRecord } from './types';
import Header from './components/Header';
import VoiceAgent from './components/VoiceAgent';
import TranscriptionView from './components/TranscriptionView';
import ToolActivity from './components/ToolActivity';
import EmergencySOS from './components/EmergencySOS';
import UserProfileModal from './components/UserProfile';
import CallHistory from './components/CallHistory';
import SessionSummary from './components/SessionSummary';
import VoiceSelector from './components/VoiceSelector';
import AppointmentModal from './components/AppointmentModal';
import { DEFAULT_VOICE_ID } from './services/elevenlabs';
import { Appointment } from './types';

const STORAGE_KEYS = {
  DARK_MODE: 'medai_darkMode',
  LANGUAGE: 'medai_language',
  PROFILE: 'medai_userProfile',
  SESSIONS: 'medai_sessions',
  VOICE_ID: 'medai_voiceId',
  APPOINTMENTS: 'medai_appointments',
};

const defaultProfile: UserProfileType = {
  name: '',
  age: '',
  allergies: '',
  conditions: '',
  medications: '',
};

const App: React.FC = () => {
  // Core state
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.IDLE);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [toolActivities, setToolActivities] = useState<ToolCallEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Feature state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEYS.DARK_MODE) === 'true'; } catch { return false; }
  });
  const [language, setLanguage] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEYS.LANGUAGE) || 'English'; } catch { return 'English'; }
  });
  const [userProfile, setUserProfile] = useState<UserProfileType>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return saved ? JSON.parse(saved) : defaultProfile;
    } catch { return defaultProfile; }
  });
  const [sessions, setSessions] = useState<SessionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEYS.VOICE_ID) || DEFAULT_VOICE_ID; } catch { return DEFAULT_VOICE_ID; }
  });
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // UI modals
  const [showProfile, setShowProfile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);
  const [lastSessionDuration, setLastSessionDuration] = useState(0);

  // Dark mode effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.classList.toggle('light', !darkMode);
    try { localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(darkMode)); } catch { }
  }, [darkMode]);

  // Persist language
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.LANGUAGE, language); } catch { }
  }, [language]);

  // Persist profile
  const handleSaveProfile = (profile: UserProfileType) => {
    setUserProfile(profile);
    try { localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile)); } catch { }
  };

  // Persist sessions
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions)); } catch { }
  }, [sessions]);

  // Persist voice selection
  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    try { localStorage.setItem(STORAGE_KEYS.VOICE_ID, voiceId); } catch { }
  };

  // Persist appointments
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments)); } catch { }
  }, [appointments]);

  const handleBookAppointment = (appt: Omit<Appointment, 'id' | 'bookedAt' | 'status' | 'bookedVia'>, via: 'manual' | 'voice' = 'manual') => {
    const newAppt: Appointment = {
      ...appt,
      id: crypto.randomUUID(),
      bookedAt: Date.now(),
      status: 'upcoming',
      bookedVia: via
    };
    setAppointments(prev => [...prev, newAppt]);
  };

  const handleCancelAppointment = (id: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
  };

  // Handlers
  const handleStart = () => setStatus(SessionStatus.CONNECTING);

  const handleEnd = () => setStatus(SessionStatus.IDLE);

  const handleTranscription = useCallback((role: 'user' | 'assistant', text: string) => {
    setTranscriptions(prev => [...prev, { role, text, timestamp: Date.now() }]);
  }, []);

  const handleToolCall = useCallback((call: Omit<ToolCallEntry, 'timestamp'>) => {
    setToolActivities(prev => [...prev, { ...call, timestamp: Date.now() }]);
  }, []);

  const handleToolResult = useCallback((id: string, result: any) => {
    setToolActivities(prev =>
      prev.map(t => t.id === id ? { ...t, result } : t)
    );
  }, []);

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
    setTimeout(() => setError(null), 8000);
  };

  const handleSessionEnd = (startTime: number) => {
    const duration = Date.now() - startTime;
    setLastSessionDuration(duration);
    if (transcriptions.length > 0) {
      setShowSummary(true);
    }
  };

  const handleSaveSession = () => {
    const session: SessionRecord = {
      id: crypto.randomUUID(),
      date: Date.now(),
      duration: lastSessionDuration,
      transcriptions: [...transcriptions],
      toolCalls: [...toolActivities],
      language,
    };
    setSessions(prev => [...prev, session]);
    setShowSummary(false);

    // Reset for next session
    setTranscriptions([]);
    setToolActivities([]);
  };

  const handleDeleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const handleCloseSummary = () => {
    setShowSummary(false);
    setTranscriptions([]);
    setToolActivities([]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(d => !d)}
        language={language}
        onLanguageChange={setLanguage}
        onOpenProfile={() => setShowProfile(true)}
        onOpenHistory={() => setShowHistory(true)}
        onOpenAppointments={() => setShowAppointments(true)}
      />

      <main className="flex-1 container mx-auto p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
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
              onSessionEnd={handleSessionEnd}
              selectedVoiceId={selectedVoiceId}
              onVoiceBookAppointment={(dept, time, res) => handleBookAppointment({
                patientName: userProfile.name || 'Patient',
                doctorSpecialty: dept,
                preferredDate: time.split('T')[0] || new Date().toISOString().split('T')[0],
                preferredTime: '10:00 AM', // Default for voice
                notes: res || ''
              }, 'voice')}
            />

            <VoiceSelector
              selectedVoiceId={selectedVoiceId}
              onVoiceChange={handleVoiceChange}
              disabled={status !== SessionStatus.IDLE}
            />

            <ToolActivity activities={toolActivities} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <TranscriptionView entries={transcriptions} />
          </div>
        </div>
      </main>

      {/* Emergency SOS — only visible during active calls */}
      {status === SessionStatus.ACTIVE && <EmergencySOS />}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-6 right-6 z-40 bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl shadow-lg max-w-sm no-print">
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <p className="font-bold text-sm">Error Occurred</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-sm font-medium">Dismiss</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t py-4 text-center text-slate-500 text-sm no-print">
        <p>&copy; 2025 med_ai. For demonstration purposes only. Always consult a professional for medical emergencies.</p>
      </footer>

      {/* Modals */}
      <UserProfileModal
        profile={userProfile}
        onSave={handleSaveProfile}
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />

      <CallHistory
        sessions={sessions}
        onDelete={handleDeleteSession}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />

      <SessionSummary
        isOpen={showSummary}
        onClose={handleCloseSummary}
        onSave={handleSaveSession}
        duration={lastSessionDuration}
        transcriptions={transcriptions}
        toolCalls={toolActivities}
        language={language}
      />

      <AppointmentModal
        isOpen={showAppointments}
        onClose={() => setShowAppointments(false)}
        appointments={appointments}
        onBook={handleBookAppointment}
        onCancel={handleCancelAppointment}
        patientName={userProfile.name}
      />
    </div>
  );
};

export default App;
