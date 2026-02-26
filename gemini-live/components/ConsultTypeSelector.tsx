
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
        label: 'Voice Consult',
        icon: '📞',
        eta: '~15 min wait',
        description: 'Quick audio call with a general physician. Best for mild-moderate issues.',
        color: 'border-cyan-500/40 hover:bg-cyan-500/10',
    },
    {
        type: 'video',
        label: 'Video Consult',
        icon: '📹',
        eta: '~20 min wait',
        description: 'Face-to-face video consultation. Ideal for visual symptoms or detailed consultation.',
        color: 'border-purple-500/40 hover:bg-purple-500/10',
    },
    {
        type: 'physical',
        label: 'In-Person Visit',
        icon: '🏥',
        eta: 'Next available slot',
        description: 'Physical examination at the clinic. Required for complex conditions.',
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
