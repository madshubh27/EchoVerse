
import React, { useMemo } from 'react';
import { predictLoad } from '../services/capacity';

interface LoadDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

const RISK_COLORS = {
    low: { bar: 'bg-green-500', text: 'text-green-400', badge: 'bg-green-500/20 text-green-400' },
    normal: { bar: 'bg-blue-500', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400' },
    high: { bar: 'bg-yellow-500', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400' },
    critical: { bar: 'bg-red-500', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400' },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const LoadDashboard: React.FC<LoadDashboardProps> = ({ isOpen, onClose }) => {
    const predictions = useMemo(() => predictLoad(14), []);

    if (!isOpen) return null;

    const maxLoad = Math.max(...predictions.map(p => p.expected), 1);
    const avgLoad = Math.round(predictions.reduce((a, p) => a + p.expected, 0) / predictions.length);
    const highRiskDays = predictions.filter(p => p.risk === 'high' || p.risk === 'critical').length;
    const busiest = predictions.reduce((a, b) => a.expected > b.expected ? a : b);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
                    <div>
                        <h2 className="text-lg font-bold text-white">📊 Predictive Load Dashboard</h2>
                        <p className="text-xs text-slate-400">Next 14-day patient load forecast</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">×</button>
                </div>

                {/* KPI Summary */}
                <div className="grid grid-cols-3 gap-3 p-5">
                    <div className="bg-slate-800/60 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-cyan-400">{avgLoad}</div>
                        <div className="text-xs text-slate-400 mt-1">Avg Patients/Day</div>
                    </div>
                    <div className="bg-slate-800/60 rounded-xl p-4 text-center">
                        <div className={`text-2xl font-bold ${highRiskDays > 3 ? 'text-red-400' : 'text-yellow-400'}`}>{highRiskDays}</div>
                        <div className="text-xs text-slate-400 mt-1">High-Risk Days</div>
                    </div>
                    <div className="bg-slate-800/60 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-purple-400">{Math.ceil(avgLoad / 20)}</div>
                        <div className="text-xs text-slate-400 mt-1">Recommended Doctors</div>
                    </div>
                </div>

                {/* Load Heatmap / Bar Chart */}
                <div className="px-5 pb-3">
                    <div className="text-sm font-semibold text-slate-300 mb-3">📈 14-Day Patient Load Forecast</div>
                    <div className="space-y-2">
                        {predictions.map(p => {
                            const d = new Date(p.date);
                            const dayName = DAY_NAMES[d.getDay()];
                            const pct = (p.expected / maxLoad) * 100;
                            const c = RISK_COLORS[p.risk];
                            return (
                                <div key={p.date} className="flex items-center gap-3">
                                    <div className="w-8 text-right text-xs text-slate-400 shrink-0">{dayName}</div>
                                    <div className="text-xs text-slate-500 w-20 shrink-0">{p.date.slice(5)}</div>
                                    <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden">
                                        <div
                                            className={`h-4 rounded-full transition-all duration-700 ${c.bar}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className={`text-xs font-bold w-6 text-right ${c.text}`}>{p.expected}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full w-16 text-center ${c.badge}`}>{p.risk}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Staffing Recommendations */}
                <div className="p-5 border-t border-slate-700/50 space-y-3">
                    <div className="text-sm font-semibold text-slate-300">🧑‍⚕️ Staffing Recommendations</div>
                    {predictions.filter(p => p.risk !== 'low').slice(0, 4).map(p => (
                        <div key={p.date} className={`flex items-center justify-between p-3 rounded-xl border ${RISK_COLORS[p.risk].badge.replace('20', '10')} border-opacity-50`}>
                            <div>
                                <span className="text-xs font-medium text-slate-200">{p.date}</span>
                                <span className={`ml-2 text-xs ${RISK_COLORS[p.risk].text}`}>{p.risk.toUpperCase()}</span>
                            </div>
                            <div className="text-xs text-slate-300">
                                {Math.ceil(p.expected / 20)} doctors · {Math.round(p.expected * 0.3)} teleconsult slots
                            </div>
                        </div>
                    ))}

                    <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <div className="text-xs font-semibold text-blue-400 mb-2">⚡ Spike Alert</div>
                        <p className="text-xs text-slate-300">
                            Busiest day predicted: <strong className="text-white">{busiest.date}</strong> with ~{busiest.expected} patients.
                            Ensure {Math.ceil(busiest.expected / 20)} doctors and prioritize teleconsult slots to manage flow.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadDashboard;
