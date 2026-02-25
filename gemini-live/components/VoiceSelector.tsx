
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
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4">
            <div className="flex items-center space-x-2 mb-3">
                <div className="w-7 h-7 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072M12 6v12M9.172 9.172a4 4 0 000 5.656M6.343 6.343a8 8 0 000 11.314" />
                    </svg>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">AI Voice</h4>
                    <p className="text-[10px] text-slate-400">Powered by ElevenLabs</p>
                </div>
                <span className="ml-auto text-[10px] bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-bold">11LABS</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {ELEVENLABS_VOICES.map((voice) => (
                    <button
                        key={voice.voice_id}
                        onClick={() => !disabled && onVoiceChange(voice.voice_id)}
                        disabled={disabled}
                        className={`text-left px-3 py-2 rounded-lg border transition-all text-xs ${selectedVoiceId === voice.voice_id
                                ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-600'
                                : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <div className="flex items-center space-x-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedVoiceId === voice.voice_id
                                    ? 'bg-purple-500 text-white'
                                    : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400'
                                }`}>
                                {voice.name[0]}
                            </div>
                            <div>
                                <p className={`font-semibold ${selectedVoiceId === voice.voice_id ? 'text-purple-700 dark:text-purple-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {voice.name}
                                </p>
                                <p className="text-[10px] text-slate-400 leading-tight">{voice.description}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
            {disabled && (
                <p className="text-[10px] text-slate-400 mt-2 text-center">Cannot change voice during an active call</p>
            )}
        </div>
    );
};

export default VoiceSelector;
