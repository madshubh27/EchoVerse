
import React from 'react';

interface AudioVisualizerProps {
  active: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ active }) => {
  return (
    <div className="flex items-center justify-center space-x-1 h-12">
      {[...Array(5)].map((_, i) => (
        <div 
          key={i}
          className={`w-1.5 bg-blue-500 rounded-full transition-all duration-300 ${
            active ? 'animate-bounce' : 'h-2 bg-slate-300'
          }`}
          style={{ 
            animationDelay: `${i * 0.1}s`,
            height: active ? `${20 + Math.random() * 30}px` : '8px'
          }}
        ></div>
      ))}
    </div>
  );
};

export default AudioVisualizer;
