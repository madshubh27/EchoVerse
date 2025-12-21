
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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[500px]">
      <div className="p-4 border-b bg-slate-50 rounded-t-2xl flex items-center justify-between">
        <h3 className="font-bold text-slate-700 flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Interaction Transcript
        </h3>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Live Feed</span>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {entries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 opacity-60">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <p className="text-sm font-medium">No conversation history yet</p>
          </div>
        ) : (
          entries.map((entry, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col ${entry.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                entry.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200'
              }`}>
                {entry.text}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 font-medium">
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
