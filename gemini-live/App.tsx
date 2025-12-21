
import React, { useState, useCallback, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { SessionStatus, TranscriptionEntry, ToolCallEntry } from './types';
import { 
  GEMINI_MODEL, 
  INPUT_SAMPLE_RATE, 
  OUTPUT_SAMPLE_RATE, 
  HEALTHCARE_TOOLS, 
  SYSTEM_INSTRUCTION 
} from './constants';
import VoiceAgent from './components/VoiceAgent';
import Header from './components/Header';
import ToolActivity from './components/ToolActivity';
import TranscriptionView from './components/TranscriptionView';

const App: React.FC = () => {
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.IDLE);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [toolActivity, setToolActivity] = useState<ToolCallEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addTranscription = useCallback((role: 'user' | 'assistant', text: string) => {
    setTranscriptions(prev => [...prev, { role, text, timestamp: Date.now() }]);
  }, []);

  const addToolCall = useCallback((call: Omit<ToolCallEntry, 'timestamp'>) => {
    setToolActivity(prev => [...prev, { ...call, timestamp: Date.now() }]);
  }, []);

  const updateToolResult = useCallback((id: string, result: any) => {
    setToolActivity(prev => prev.map(t => t.id === id ? { ...t, result } : t));
  }, []);

  const handleStartSession = useCallback(async () => {
    setStatus(SessionStatus.CONNECTING);
    setError(null);
  }, []);

  const handleEndSession = useCallback(() => {
    setStatus(SessionStatus.IDLE);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Voice Interaction and Tool Status */}
        <div className="lg:col-span-2 space-y-6">
          <VoiceAgent 
            status={status}
            onStart={handleStartSession}
            onEnd={handleEndSession}
            onTranscription={addTranscription}
            onToolCall={addToolCall}
            onToolResult={updateToolResult}
            onError={setError}
            setStatus={setStatus}
          />
          
          <ToolActivity activities={toolActivity} />
        </div>

        {/* Right Column: Transcription History */}
        <div className="lg:col-span-1">
          <TranscriptionView entries={transcriptions} />
        </div>
      </main>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg max-w-md z-50">
          <p className="font-bold">Error Occurred</p>
          <p>{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-sm underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}
      
      <footer className="bg-white border-t py-4 text-center text-slate-500 text-sm">
        <p>&copy; 2024 HealthSync AI. For demonstration purposes only. Always consult a professional for medical emergencies.</p>
      </footer>
    </div>
  );
};

export default App;
