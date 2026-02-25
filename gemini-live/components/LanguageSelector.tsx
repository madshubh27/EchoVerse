
import React from 'react';
import { Language } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';

interface LanguageSelectorProps {
    selectedLanguage: string;
    onLanguageChange: (lang: string) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ selectedLanguage, onLanguageChange }) => {
    return (
        <div className="relative">
            <select
                value={selectedLanguage}
                onChange={(e) => onLanguageChange(e.target.value)}
                className="appearance-none bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-2 pr-8 rounded-full cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors border-0 outline-none"
            >
                {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.name}>
                        {lang.nativeName} ({lang.name})
                    </option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                <svg className="w-3 h-3 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </div>
        </div>
    );
};

export default LanguageSelector;
