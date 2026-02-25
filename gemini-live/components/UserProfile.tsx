
import React, { useState } from 'react';
import { UserProfile as UserProfileType } from '../types';

interface UserProfileProps {
    profile: UserProfileType;
    onSave: (profile: UserProfileType) => void;
    isOpen: boolean;
    onClose: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ profile, onSave, isOpen, onClose }) => {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<UserProfileType>(profile);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(form);
        setEditing(false);
    };

    const handleChange = (field: keyof UserProfileType, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Patient Profile</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {(['name', 'age', 'allergies', 'conditions', 'medications'] as const).map((field) => (
                        <div key={field}>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                {field === 'conditions' ? 'Existing Conditions' : field.charAt(0).toUpperCase() + field.slice(1)}
                            </label>
                            {editing ? (
                                field === 'allergies' || field === 'conditions' || field === 'medications' ? (
                                    <textarea
                                        value={form[field]}
                                        onChange={(e) => handleChange(field, e.target.value)}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        rows={2}
                                        placeholder={`Enter your ${field}...`}
                                    />
                                ) : (
                                    <input
                                        type={field === 'age' ? 'number' : 'text'}
                                        value={form[field]}
                                        onChange={(e) => handleChange(field, e.target.value)}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder={`Enter your ${field}...`}
                                    />
                                )
                            ) : (
                                <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 rounded-lg">
                                    {form[field] || <span className="text-slate-400 italic">Not provided</span>}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-5 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-3">
                    {editing ? (
                        <>
                            <button onClick={() => { setForm(profile); setEditing(false); }} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                                Save Profile
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setEditing(true)} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                            Edit Profile
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
