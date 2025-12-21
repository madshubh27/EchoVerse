
import React from 'react';
import { ToolCallEntry } from '../types';

interface ToolActivityProps {
  activities: ToolCallEntry[];
}

const ToolActivity: React.FC<ToolActivityProps> = ({ activities }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-slate-50 flex items-center space-x-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <h3 className="font-bold text-slate-700">Medical Engine Activity</h3>
      </div>
      
      <div className="p-4 space-y-3">
        {activities.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Clinical tools will activate when needed during dialogue.</p>
        ) : (
          activities.map((tool) => (
            <div key={tool.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                  {tool.name.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{tool.id}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Parameters</p>
                  <pre className="text-[11px] bg-white p-2 rounded border border-slate-100 overflow-x-auto font-mono text-slate-600">
                    {JSON.stringify(tool.args, null, 2)}
                  </pre>
                </div>
                
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Clinical Output</p>
                  {tool.result ? (
                    <div className="text-[11px] bg-green-50 p-2 rounded border border-green-100 font-medium text-green-700 h-full">
                      {typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result)}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 h-full">
                      <div className="w-3 h-3 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ToolActivity;
