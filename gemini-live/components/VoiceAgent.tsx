
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { SessionStatus, TranscriptionEntry, ToolCallEntry } from '../types';
import { 
  GEMINI_MODEL, 
  INPUT_SAMPLE_RATE, 
  OUTPUT_SAMPLE_RATE, 
  HEALTHCARE_TOOLS, 
  SYSTEM_INSTRUCTION 
} from '../constants';
import AudioVisualizer from './AudioVisualizer';

interface VoiceAgentProps {
  status: SessionStatus;
  setStatus: (status: SessionStatus) => void;
  onStart: () => void;
  onEnd: () => void;
  onTranscription: (role: 'user' | 'assistant', text: string) => void;
  onToolCall: (call: Omit<ToolCallEntry, 'timestamp'>) => void;
  onToolResult: (id: string, result: any) => void;
  onError: (error: string) => void;
}

const VoiceAgent: React.FC<VoiceAgentProps> = ({ 
  status, 
  setStatus, 
  onStart, 
  onEnd, 
  onTranscription,
  onToolCall,
  onToolResult,
  onError 
}) => {
  const sessionRef = useRef<any>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  
  const currentInputTranscription = useRef<string>('');
  const currentOutputTranscription = useRef<string>('');

  // Audio Processing Helpers
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const createBlob = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const stopAudio = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextInRef.current) {
      audioContextInRef.current.close();
    }
    if (audioContextOutRef.current) {
      audioContextOutRef.current.close();
    }
    sessionRef.current?.close();
    sessionRef.current = null;
    setStatus(SessionStatus.IDLE);
  };

  useEffect(() => {
    if (status === SessionStatus.CONNECTING) {
      const connect = async () => {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
          audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
          const outputNode = audioContextOutRef.current.createGain();
          outputNode.connect(audioContextOutRef.current.destination);

          streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

          const sessionPromise = ai.live.connect({
            model: GEMINI_MODEL,
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
              },
              systemInstruction: SYSTEM_INSTRUCTION,
              tools: [{ functionDeclarations: HEALTHCARE_TOOLS }],
              inputAudioTranscription: {},
              outputAudioTranscription: {},
            },
            callbacks: {
              onopen: () => {
                console.log('Gemini Live Session Opened');
                setStatus(SessionStatus.ACTIVE);
                
                const source = audioContextInRef.current!.createMediaStreamSource(streamRef.current!);
                const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
                
                scriptProcessor.onaudioprocess = (e) => {
                  const inputData = e.inputBuffer.getChannelData(0);
                  const pcmBlob = createBlob(inputData);
                  sessionPromise.then(session => {
                    session.sendRealtimeInput({ media: pcmBlob });
                  });
                };

                source.connect(scriptProcessor);
                scriptProcessor.connect(audioContextInRef.current!.destination);
              },
              onmessage: async (message: LiveServerMessage) => {
                // Audio output
                const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (base64Audio && audioContextOutRef.current) {
                  nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextOutRef.current.currentTime);
                  const audioBuffer = await decodeAudioData(decode(base64Audio), audioContextOutRef.current, OUTPUT_SAMPLE_RATE, 1);
                  const source = audioContextOutRef.current.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(outputNode);
                  source.addEventListener('ended', () => {
                    sourcesRef.current.delete(source);
                  });
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += audioBuffer.duration;
                  sourcesRef.current.add(source);
                }

                // Transcription handling
                if (message.serverContent?.inputTranscription) {
                  currentInputTranscription.current += message.serverContent.inputTranscription.text;
                }
                if (message.serverContent?.outputTranscription) {
                  currentOutputTranscription.current += message.serverContent.outputTranscription.text;
                }
                if (message.serverContent?.turnComplete) {
                  if (currentInputTranscription.current) {
                    onTranscription('user', currentInputTranscription.current);
                    currentInputTranscription.current = '';
                  }
                  if (currentOutputTranscription.current) {
                    onTranscription('assistant', currentOutputTranscription.current);
                    currentOutputTranscription.current = '';
                  }
                }

                // Tool handling
                if (message.toolCall) {
                  for (const fc of message.toolCall.functionCalls) {
                    onToolCall({ id: fc.id, name: fc.name, args: fc.args });
                    
                    // Simulate healthcare backend logic
                    let result = "Action completed successfully.";
                    if (fc.name === 'checkSymptomSeverity') {
                       result = "Severity: Moderate. Recommended action: Please visit an urgent care center within 24 hours for evaluation.";
                    } else if (fc.name === 'bookAppointment') {
                       result = `Appointment provisionally scheduled for ${fc.args.preferredTime} in ${fc.args.department}. Confirmation sent to your profile.`;
                    }

                    onToolResult(fc.id, result);
                    
                    sessionPromise.then(session => {
                      session.sendToolResponse({
                        functionResponses: {
                          id: fc.id,
                          name: fc.name,
                          response: { result },
                        }
                      });
                    });
                  }
                }

                if (message.serverContent?.interrupted) {
                  sourcesRef.current.forEach(s => s.stop());
                  sourcesRef.current.clear();
                  nextStartTimeRef.current = 0;
                }
              },
              onerror: (e) => {
                console.error('Gemini error:', e);
                onError('A connection error occurred with the AI agent.');
                stopAudio();
              },
              onclose: () => {
                console.log('Gemini Live Session Closed');
                setStatus(SessionStatus.IDLE);
              },
            }
          });
          
          sessionRef.current = await sessionPromise;
        } catch (err: any) {
          console.error(err);
          onError(err.message || 'Failed to initialize microphone or connection.');
          setStatus(SessionStatus.IDLE);
        }
      };

      connect();
    }
  }, [status]);

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-6">
      <div className="relative">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-inner ${
          status === SessionStatus.ACTIVE ? 'bg-blue-50' : 'bg-slate-50'
        }`}>
          <AudioVisualizer active={status === SessionStatus.ACTIVE} />
          <div className={`absolute inset-0 rounded-full border-4 transition-all duration-700 ${
            status === SessionStatus.ACTIVE ? 'border-blue-200 animate-pulse' : 'border-slate-100'
          }`}></div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-800">
          {status === SessionStatus.IDLE && "Ready to Help"}
          {status === SessionStatus.CONNECTING && "Establishing Secure Connection..."}
          {status === SessionStatus.ACTIVE && "I'm Listening..."}
        </h2>
        <p className="text-slate-500 max-w-sm mx-auto">
          {status === SessionStatus.IDLE && "Click start to speak with your personal healthcare assistant."}
          {status === SessionStatus.ACTIVE && "Ask about symptoms, find clinics, or book an appointment."}
        </p>
      </div>

      <div className="pt-4 w-full flex justify-center">
        {status === SessionStatus.IDLE ? (
          <button 
            onClick={onStart}
            className="group flex items-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-bold shadow-lg shadow-blue-200 transition-all transform hover:scale-105 active:scale-95"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            <span>Start Conversation</span>
          </button>
        ) : (
          <button 
            onClick={stopAudio}
            className="flex items-center space-x-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-8 py-4 rounded-full font-bold transition-all"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
            <span>End Call</span>
          </button>
        )}
      </div>

      {status === SessionStatus.ACTIVE && (
        <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1 rounded-full">
           <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span>LIVE AUDIO ENCRYPTION ACTIVE</span>
        </div>
      )}
    </div>
  );
};

export default VoiceAgent;
