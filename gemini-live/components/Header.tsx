
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">HealthSync <span className="text-blue-600">AI</span></h1>
            <p className="text-xs text-slate-400 font-medium">REALTIME VOICE CARE</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-6">
          <div className="flex items-center text-sm font-medium text-slate-600">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Gemini Live 2.5 Active
          </div>
          <button className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-full font-semibold transition-colors">
            Support
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
