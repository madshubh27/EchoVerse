import React, { useState } from 'react';
import { Appointment } from '../types';

interface AppointmentModalProps {
    isOpen: boolean;
    appointments: Appointment[];
    onBook: (appt: Omit<Appointment, 'id' | 'bookedAt' | 'status' | 'bookedVia'>) => void;
    onCancel: (id: string) => void;
    onClose: () => void;
    patientName: string;
}

const SPECIALTIES = [
    'General Physician', 'Cardiologist', 'Dermatologist', 'Neurologist',
    'Orthopedic', 'Pediatrician', 'Psychiatrist', 'Gynecologist',
    'Ophthalmologist', 'ENT Specialist', 'Endocrinologist', 'Urologist',
];

const TIME_SLOTS = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM',
    '04:30 PM', '05:00 PM',
];

const AppointmentModal: React.FC<AppointmentModalProps> = ({
    isOpen, appointments, onBook, onCancel, onClose, patientName,
}) => {
    const [tab, setTab] = useState<'upcoming' | 'book'>('upcoming');
    const [form, setForm] = useState({
        patientName: patientName || '',
        doctorSpecialty: SPECIALTIES[0],
        preferredDate: '',
        preferredTime: TIME_SLOTS[0],
        notes: '',
    });
    const [submitted, setSubmitted] = useState(false);
    const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);

    // Filter appointments
    const upcoming = appointments.filter(a => a.status === 'upcoming');
    const past = appointments.filter(a => a.status !== 'upcoming');

    const today = new Date().toISOString().split('T')[0];

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.preferredDate) return;
        onBook(form);
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setTab('upcoming');
            setForm(f => ({ ...f, preferredDate: '', notes: '' }));
        }, 2000);
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            });
        } catch { return dateStr; }
    };

    const statusColors: Record<string, string> = {
        upcoming: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        completed: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        cancelled: 'bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400',
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800 dark:text-white">Appointments</h2>
                            <p className="text-xs text-slate-400">{upcoming.length} upcoming</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                    <button
                        onClick={() => setTab('upcoming')}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === 'upcoming' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                        My Appointments
                    </button>
                    <button
                        onClick={() => setTab('book')}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === 'book' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                        + Book New
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {tab === 'upcoming' ? (
                        <div className="space-y-4">
                            {upcoming.length === 0 && past.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No appointments yet</p>
                                    <p className="text-slate-400 text-xs mt-1">Book one manually or ask the AI during a call</p>
                                    <button
                                        onClick={() => setTab('book')}
                                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2 rounded-full font-semibold transition-all"
                                    >
                                        Book Your First Appointment
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {upcoming.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Upcoming</h3>
                                            <div className="space-y-3">
                                                {upcoming.map(appt => (
                                                    <div key={appt.id} className="border border-blue-100 dark:border-slate-700 rounded-xl p-4 bg-blue-50/40 dark:bg-slate-800/50">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center space-x-2 mb-1">
                                                                    <p className="font-bold text-slate-800 dark:text-white text-sm">{appt.doctorSpecialty}</p>
                                                                    {appt.bookedVia === 'voice' && (
                                                                        <span className="text-[10px] bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-semibold">AI Booked</span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                                    <span>{formatDate(appt.preferredDate)}</span>
                                                                </p>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5">
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                    <span>{appt.preferredTime}</span>
                                                                </p>
                                                                {appt.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">"{appt.notes}"</p>}
                                                            </div>
                                                            <div className="flex flex-col items-end space-y-2 ml-3">
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColors[appt.status]}`}>
                                                                    {appt.status}
                                                                </span>
                                                                {cancelConfirm === appt.id ? (
                                                                    <div className="flex space-x-1">
                                                                        <button onClick={() => { onCancel(appt.id); setCancelConfirm(null); }} className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full">Confirm</button>
                                                                        <button onClick={() => setCancelConfirm(null)} className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">No</button>
                                                                    </div>
                                                                ) : (
                                                                    <button onClick={() => setCancelConfirm(appt.id)} className="text-[10px] text-red-500 hover:text-red-600 underline">Cancel</button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {past.length > 0 && (
                                        <div className="mt-6">
                                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Past</h3>
                                            <div className="space-y-2">
                                                {past.map(appt => (
                                                    <div key={appt.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-3 opacity-60">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{appt.doctorSpecialty}</p>
                                                                <p className="text-xs text-slate-400">{formatDate(appt.preferredDate)} · {appt.preferredTime}</p>
                                                            </div>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColors[appt.status]}`}>{appt.status}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {submitted ? (
                                <div className="text-center py-12">
                                    <div className="w-14 h-14 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="font-bold text-slate-800 dark:text-white">Appointment Booked!</p>
                                    <p className="text-xs text-slate-500 mt-1">Redirecting to your appointments...</p>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Patient Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={form.patientName}
                                            onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))}
                                            placeholder="Your full name"
                                            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Doctor Specialty</label>
                                        <select
                                            value={form.doctorSpecialty}
                                            onChange={e => setForm(f => ({ ...f, doctorSpecialty: e.target.value }))}
                                            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                                        >
                                            {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Preferred Date</label>
                                            <input
                                                type="date"
                                                required
                                                min={today}
                                                value={form.preferredDate}
                                                onChange={e => setForm(f => ({ ...f, preferredDate: e.target.value }))}
                                                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Time Slot</label>
                                            <select
                                                value={form.preferredTime}
                                                onChange={e => setForm(f => ({ ...f, preferredTime: e.target.value }))}
                                                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                                            >
                                                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Notes <span className="font-normal text-slate-400">(optional)</span></label>
                                        <textarea
                                            value={form.notes}
                                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                            placeholder="Describe your symptoms or reason for visit..."
                                            rows={3}
                                            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all resize-none"
                                        />
                                    </div>

                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-xs text-blue-600 dark:text-blue-400 flex items-start space-x-2">
                                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
                                        </svg>
                                        <span>You can also book by voice — just say <em>"Book a cardiology appointment for next Monday at 10 AM"</em> during a call.</span>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-200 dark:shadow-blue-900/30"
                                    >
                                        Confirm Appointment
                                    </button>
                                </>
                            )}
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppointmentModal;
