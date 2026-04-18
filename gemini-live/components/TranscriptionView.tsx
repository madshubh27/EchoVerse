
import React, { useRef, useEffect } from 'react';
import { TranscriptionEntry } from '../types';

interface TranscriptionViewProps {
  entries: TranscriptionEntry[];
}

const TranscriptionView: React.FC<TranscriptionViewProps> = ({ entries }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="flex h-[500px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-800/60 shadow-lg shadow-black/20 backdrop-blur-xl">
      <div className="flex items-center justify-between rounded-t-2xl border-b border-white/10 p-4">
        <h3 className="flex items-center font-semibold text-slate-100">
          <svg className="mr-2 h-4 w-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Interaction Transcript
        </h3>
        <span className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Live Feed</span>
      </div>
      
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 scroll-smooth">
        {entries.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-3 text-center text-slate-500 opacity-70">
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <p className="text-sm font-medium text-slate-400">No conversation history yet</p>
          </div>
        ) : (
          entries.map((entry, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col ${entry.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                entry.role === 'user' 
                  ? 'rounded-tr-none bg-blue-600 text-white' 
                  : 'rounded-tl-none border border-slate-700 bg-slate-900/80 text-slate-200'
              }`}>
                {entry.text}
              </div>
              <span className="mt-1 text-[10px] font-medium text-slate-500">
                {entry.role.toUpperCase()} • {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TranscriptionView;
