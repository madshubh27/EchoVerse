
import React from 'react';
import { TranscriptionEntry, ToolCallEntry } from '../types';

interface SessionSummaryProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    duration: number;
    transcriptions: TranscriptionEntry[];
    toolCalls: ToolCallEntry[];
    language: string;
}

const SessionSummary: React.FC<SessionSummaryProps> = ({
    isOpen, onClose, onSave, duration, transcriptions, toolCalls, language
}) => {
    if (!isOpen) return null;

    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m} min ${s} sec`;
    };

    const uniqueTopics = [...new Set(toolCalls.map(t => t.name.replace(/([A-Z])/g, ' $1').trim()))];
    const userMessages = transcriptions.filter(t => t.role === 'user');
    const assistantMessages = transcriptions.filter(t => t.role === 'assistant');

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-blue-600 to-blue-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Session Summary</h3>
                                <p className="text-xs text-blue-200">Consultation Report</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-5 space-y-4">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-blue-600">{formatDuration(duration).split(' ')[0]}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Duration</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-green-600">{transcriptions.length}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Messages</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-purple-600">{toolCalls.length}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tools Used</p>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Language</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{language}</p>
                        </div>
                        {uniqueTopics.length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tools Activated</p>
                                <div className="flex flex-wrap gap-2">
                                    {uniqueTopics.map((topic, i) => (
                                        <span key={i} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full font-medium">
                                            {topic}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {transcriptions.length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Key Exchanges</p>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {transcriptions.slice(-6).map((t, i) => (
                                        <p key={i} className={`text-xs p-2 rounded-lg ${t.role === 'user' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300'}`}>
                                            <span className="font-bold">{t.role === 'user' ? 'You' : 'med_ai'}:</span> {t.text.slice(0, 120)}{t.text.length > 120 ? '...' : ''}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Disclaimer */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                            ⚠️ This is an AI-generated summary for reference only. Always consult a healthcare professional for medical advice.
                        </p>
                    </div>
                </div>

                <div className="p-5 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-3">
                    <button onClick={handlePrint} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span>Print for Doctor</span>
                    </button>
                    <button onClick={onSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                        Save to History
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SessionSummary;
