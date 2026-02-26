
import React, { useState, useEffect } from 'react';
import { FollowUp, Appointment } from '../types';

const STORAGE_KEY = 'med_ai_followups';

function loadFollowUps(): FollowUp[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveFollowUps(list: FollowUp[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

interface FollowUpMonitorProps {
    appointments: Appointment[];
    patientName: string;
}

const FollowUpMonitor: React.FC<FollowUpMonitorProps> = ({ appointments, patientName }) => {
    const [followUps, setFollowUps] = useState<FollowUp[]>(loadFollowUps);
    const [checkInFor, setCheckInFor] = useState<string | null>(null);
    const [checkInText, setCheckInText] = useState('');

    const completedAppts = appointments.filter(a => a.status === 'completed' || a.status === 'upcoming');

    const handleCheckIn = (apptId: string) => {
        if (!checkInText.trim()) return;
        const lower = checkInText.toLowerCase();
        let trend: FollowUp['trend'] = 'stable';
        if (['better', 'improving', 'fine', 'good', 'well', 'recovered'].some(w => lower.includes(w))) trend = 'improving';
        else if (['worse', 'worsening', 'bad', 'terrible', 'more pain', 'severe'].some(w => lower.includes(w))) trend = 'worsening';

        const entry: FollowUp = {
            id: crypto.randomUUID(),
            patientName,
            appointmentId: apptId,
            checkInDate: new Date().toISOString().split('T')[0],
            symptoms: checkInText,
            trend,
            createdAt: Date.now(),
        };
        const updated = [...followUps, entry];
        setFollowUps(updated);
        saveFollowUps(updated);
        setCheckInFor(null);
        setCheckInText('');

        if (trend === 'worsening') {
            setTimeout(() => {
                alert('⚠️ Your symptoms appear to be worsening. We recommend booking a follow-up consultation soon.');
            }, 300);
        }
    };

    const trendColors: Record<FollowUp['trend'], string> = {
        improving: 'text-green-400 bg-green-500/10',
        stable: 'text-blue-400 bg-blue-500/10',
        worsening: 'text-red-400 bg-red-500/10',
        pending: 'text-slate-400 bg-slate-700',
    };

    const trendIcons: Record<FollowUp['trend'], string> = {
        improving: '📈', stable: '➡️', worsening: '📉', pending: '⏳',
    };

    const getFollowUpsForAppt = (id: string) => followUps.filter(f => f.appointmentId === id);

    if (completedAppts.length === 0) return null;

    return (
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
                <span className="text-lg">🔄</span>
                <h3 className="font-semibold text-slate-100">AI Follow-Up Monitor</h3>
                <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full ml-auto">
                    {completedAppts.length} tracked
                </span>
            </div>

            <div className="space-y-3">
                {completedAppts.map(appt => {
                    const apptFollowUps = getFollowUpsForAppt(appt.id);
                    const latest = apptFollowUps[apptFollowUps.length - 1];
                    return (
                        <div key={appt.id} className="border border-slate-700/50 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-medium text-slate-200">{appt.doctorSpecialty}</div>
                                    <div className="text-xs text-slate-400">{appt.preferredDate}</div>
                                </div>
                                {latest && (
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${trendColors[latest.trend]}`}>
                                        {trendIcons[latest.trend]} {latest.trend}
                                    </span>
                                )}
                            </div>

                            {/* History */}
                            {apptFollowUps.length > 0 && (
                                <div className="space-y-1">
                                    {apptFollowUps.slice(-3).map(fu => (
                                        <div key={fu.id} className="flex items-start gap-2">
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${trendColors[fu.trend]}`}>
                                                {trendIcons[fu.trend]}
                                            </span>
                                            <div>
                                                <div className="text-xs text-slate-300">{fu.symptoms}</div>
                                                <div className="text-xs text-slate-500">{fu.checkInDate}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Check-in form */}
                            {checkInFor === appt.id ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={checkInText}
                                        onChange={e => setCheckInText(e.target.value)}
                                        placeholder="How are you feeling today? Describe your symptoms..."
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm text-slate-200 placeholder-slate-500 resize-none h-20 focus:outline-none focus:border-cyan-500"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleCheckIn(appt.id)}
                                            className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-lg transition-colors"
                                        >
                                            Submit Check-In
                                        </button>
                                        <button
                                            onClick={() => setCheckInFor(null)}
                                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setCheckInFor(appt.id)}
                                    className="w-full py-1.5 border border-dashed border-slate-600 hover:border-cyan-500 text-xs text-slate-400 hover:text-cyan-400 rounded-lg transition-colors"
                                >
                                    + Daily Check-In
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FollowUpMonitor;
