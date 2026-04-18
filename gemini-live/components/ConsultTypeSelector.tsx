
import React from 'react';
import { ConsultType } from '../types';

interface ConsultOption {
    type: ConsultType;
    label: string;
    icon: string;
    eta: string;
    description: string;
    color: string;
}

const CONSULT_OPTIONS: ConsultOption[] = [
    {
        type: 'voice',
        label: 'Telephonic Consultation',
        icon: '☎️',
        eta: '15-30 min wait',
        description: 'Phone consultation with registered physician. Suitable for follow-up, prescription queries, minor concerns. Duration: 10-20 min.',
        color: 'border-cyan-500/40 hover:bg-cyan-500/10',
    },
    {
        type: 'video',
        label: 'Video Consultation',
        icon: '🎥',
        eta: '30-45 min wait',
        description: 'Video consultation for visual assessment. Better for rashes, wounds, posture checks. Duration: 15-25 min.',
        color: 'border-purple-500/40 hover:bg-purple-500/10',
    },
    {
        type: 'physical',
        label: 'In-Clinic Examination',
        icon: '🏥',
        eta: 'Next available',
        description: 'Physical examination at accredited clinic with diagnostic capability. For complex cases requiring tests. Duration: 30-45 min.',
        color: 'border-blue-500/40 hover:bg-blue-500/10',
    },
];

interface ConsultTypeSelectorProps {
    selected: ConsultType;
    onChange: (type: ConsultType) => void;
    recommendation?: ConsultType;
}

const ConsultTypeSelector: React.FC<ConsultTypeSelectorProps> = ({ selected, onChange, recommendation = 'voice' }) => {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-300">Consultation Type</label>
                <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                    ⭐ Recommended: {CONSULT_OPTIONS.find(o => o.type === recommendation)?.label}
                </span>
            </div>
            <div className="grid gap-2">
                {CONSULT_OPTIONS.map(opt => (
                    <button
                        key={opt.type}
                        onClick={() => onChange(opt.type)}
                        className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${selected === opt.type
                                ? 'border-cyan-500 bg-cyan-500/15 ring-1 ring-cyan-500/30'
                                : `border-slate-700 ${opt.color}`
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <span className="text-xl">{opt.icon}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-slate-200">{opt.label}</span>
                                    <span className="text-xs text-slate-400">{opt.eta}</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">{opt.description}</p>
                            </div>
                            {selected === opt.type && (
                                <span className="text-cyan-400 text-base shrink-0">✓</span>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ConsultTypeSelector;
