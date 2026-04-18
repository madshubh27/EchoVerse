
import React from 'react';
import { ELEVENLABS_VOICES, ElevenLabsVoice } from '../services/elevenlabs';

interface VoiceSelectorProps {
    selectedVoiceId: string;
    onVoiceChange: (voiceId: string) => void;
    disabled?: boolean;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoiceId, onVoiceChange, disabled }) => {
    const selectedVoice = ELEVENLABS_VOICES.find(v => v.voice_id === selectedVoiceId);

    return (
        <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-4 shadow-lg shadow-black/20 backdrop-blur-xl">
            <div className="mb-3 flex items-center space-x-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15">
                    <svg className="h-4 w-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072M12 6v12M9.172 9.172a4 4 0 000 5.656M6.343 6.343a8 8 0 000 11.314" />
                    </svg>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-100">AI Voice</h4>
                    <p className="text-[10px] text-slate-500">Powered by ElevenLabs</p>
                </div>
                <span className="ml-auto rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-300">11LABS</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {ELEVENLABS_VOICES.map((voice) => (
                    <button
                        key={voice.voice_id}
                        onClick={() => !disabled && onVoiceChange(voice.voice_id)}
                        disabled={disabled}
                        className={`text-left rounded-xl border px-3 py-2 text-xs transition-all ${selectedVoiceId === voice.voice_id
                                ? 'border-purple-400/60 bg-purple-500/15'
                                : 'border-slate-700 bg-slate-900/50 hover:border-slate-500 hover:bg-slate-900'
                            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    >
                        <div className="flex items-center space-x-2">
                            <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${selectedVoiceId === voice.voice_id
                                    ? 'bg-purple-400 text-slate-950'
                                    : 'bg-slate-700 text-slate-300'
                                }`}>
                                {voice.name[0]}
                            </div>
                            <div>
                                <p className={`font-semibold ${selectedVoiceId === voice.voice_id ? 'text-purple-200' : 'text-slate-200'}`}>
                                    {voice.name}
                                </p>
                                <p className="leading-tight text-[10px] text-slate-500">{voice.description}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
            {disabled && (
                <p className="mt-2 text-center text-[10px] text-slate-500">Cannot change voice during an active call</p>
            )}
        </div>
    );
};

export default VoiceSelector;
