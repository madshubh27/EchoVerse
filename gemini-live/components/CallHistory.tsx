
import React, { useState } from 'react';
import { SessionRecord } from '../types';

interface CallHistoryProps {
    sessions: SessionRecord[];
    onDelete: (id: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

const CallHistory: React.FC<CallHistoryProps> = ({ sessions, onDelete, isOpen, onClose }) => {
    const [expanded, setExpanded] = useState<string | null>(null);

    if (!isOpen) return null;

    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 no-print" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Call History</h3>
                            <p className="text-xs text-slate-400">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {sessions.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <p className="font-medium">No sessions yet</p>
                            <p className="text-sm">Your call history will appear here</p>
                        </div>
                    ) : (
                        sessions.slice().reverse().map((session) => (
                            <div key={session.id} className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setExpanded(expanded === session.id ? null : session.id)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center shrink-0">
                                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {formatDuration(session.duration)} · {session.language}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-1 rounded-full">
                                            {session.transcriptions.length} msgs
                                        </span>
                                        <svg className={`w-4 h-4 text-slate-400 transition-transform ${expanded === session.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>

                                {expanded === session.id && (
                                    <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700">
                                        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                                            {session.transcriptions.map((t, i) => (
                                                <div key={i} className={`text-xs p-2 rounded-lg ${t.role === 'user' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300'}`}>
                                                    <span className="font-bold uppercase mr-1">{t.role}:</span>{t.text}
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
                                            className="mt-3 text-xs text-red-500 hover:text-red-700 font-medium flex items-center space-x-1"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            <span>Delete session</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default CallHistory;
