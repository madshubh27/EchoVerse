
import React from 'react';
import { SeverityResult } from '../types';
import { getSelfCareTips } from '../services/severity';

interface SeverityBannerProps {
    result: SeverityResult;
    symptoms: string[];
    onBookAppointment: () => void;
    onEmergency: () => void;
    onDismiss: () => void;
}

const SeverityBanner: React.FC<SeverityBannerProps> = ({
    result, symptoms, onBookAppointment, onEmergency, onDismiss,
}) => {
    const tips = result.action === 'self_care' ? getSelfCareTips(symptoms) : [];

    const colorMap = {
        mild: { border: 'border-green-500/40', bg: 'bg-green-500/10', text: 'text-green-400', btn: 'bg-green-500 hover:bg-green-600' },
        moderate: { border: 'border-yellow-500/40', bg: 'bg-yellow-500/10', text: 'text-yellow-400', btn: 'bg-yellow-500 hover:bg-yellow-600' },
        severe: { border: 'border-red-500/40', bg: 'bg-red-500/10', text: 'text-red-400', btn: 'bg-red-500 hover:bg-red-600' },
    };
    const c = colorMap[result.level];

    return (
        <div className={`rounded-2xl border ${c.border} ${c.bg} p-5 space-y-4 animate-in slide-in-from-top-2`}>
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className={`text-xs font-bold uppercase tracking-wider ${c.text}`}>
                        {result.level === 'mild' ? '✅ Mild Condition' : result.level === 'moderate' ? '⚠️ Moderate Condition' : '🚨 Severe — Emergency'}
                    </div>
                    <p className="text-slate-200 text-sm mt-1">{result.message}</p>
                </div>
                <button onClick={onDismiss} className="text-slate-400 hover:text-white ml-3 text-lg leading-none">×</button>
            </div>

            {/* Severity Score Bar */}
            <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Severity Score</span>
                    <span>{result.score}/10</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all duration-700 ${result.level === 'mild' ? 'bg-green-500' : result.level === 'moderate' ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${(result.score / 10) * 100}%` }}
                    />
                </div>
            </div>

            {/* Self-care tips for mild */}
            {result.action === 'self_care' && tips.length > 0 && (
                <div>
                    <div className="text-xs font-semibold text-green-400 mb-2">💊 Self-Care Tips</div>
                    <ul className="space-y-1">
                        {tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                <span className="text-green-400 mt-0.5">•</span>
                                {tip}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
                {result.action === 'emergency' && (
                    <button
                        onClick={onEmergency}
                        className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
                    >
                        📞 Call Emergency Services
                    </button>
                )}
                {result.action === 'book_appointment' && (
                    <button
                        onClick={onBookAppointment}
                        className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold transition-colors"
                    >
                        📅 Book Consultation
                    </button>
                )}
                {result.action === 'self_care' && (
                    <button
                        onClick={onDismiss}
                        className="flex-1 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
                    >
                        Got it — I'll try these tips
                    </button>
                )}
            </div>
        </div>
    );
};

export default SeverityBanner;
