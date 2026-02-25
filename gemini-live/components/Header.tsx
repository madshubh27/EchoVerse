
import React from 'react';
import DarkModeToggle from './DarkModeToggle';
import LanguageSelector from './LanguageSelector';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  onOpenProfile: () => void;
  onOpenHistory: () => void;
  onOpenAppointments: () => void;
}

const Header: React.FC<HeaderProps> = ({ darkMode, onToggleDarkMode, language, onLanguageChange, onOpenProfile, onOpenHistory, onOpenAppointments }) => {
  return (
    <header className="bg-white border-b sticky top-0 z-30 shadow-sm no-print">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">med<span className="text-blue-600">_ai</span></h1>
            <p className="text-xs text-slate-400 font-medium">REALTIME VOICE CARE</p>
          </div>
        </div>

        <nav className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden sm:flex items-center text-sm font-medium text-slate-600">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Gemini Live 2.5
          </div>

          <LanguageSelector selectedLanguage={language} onLanguageChange={onLanguageChange} />

          {/* Appointments Button */}
          <button
            onClick={onOpenAppointments}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
            title="Book Appointment"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
            title="Call History"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Profile Button */}
          <button
            onClick={onOpenProfile}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
            title="Patient Profile"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>

          <DarkModeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />
        </nav>
      </div>
    </header>
  );
};

export default Header;
