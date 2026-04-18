
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
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl no-print shadow-[0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-4 sm:px-6">
        <div className="flex items-center space-x-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold leading-none text-white">med<span className="text-blue-400">_ai</span></h1>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">Realtime Voice Care</p>
          </div>
        </div>

        <nav className="flex items-center space-x-2 sm:space-x-3">
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-slate-800/90 px-4 py-2 text-sm font-semibold text-slate-100 shadow-inner shadow-black/20">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"></span>
            Gemini Live 2.5
          </div>

          <LanguageSelector selectedLanguage={language} onLanguageChange={onLanguageChange} />

          <button
            onClick={onOpenAppointments}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/5 text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            title="Book Appointment"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          <button
            onClick={onOpenHistory}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/5 text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            title="Call History"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <button
            onClick={onOpenProfile}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/5 text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            title="Patient Profile"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>

          <button
            onClick={onToggleDarkMode}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/5 text-yellow-300 transition-colors hover:bg-white/5"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? '☀' : '☾'}
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
