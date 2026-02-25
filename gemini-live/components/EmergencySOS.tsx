
import React from 'react';

const EmergencySOS: React.FC = () => {
    const handleSOS = () => {
        if (confirm('This will attempt to call emergency services (911). Continue?')) {
            window.location.href = 'tel:911';
        }
    };

    return (
        <button
            onClick={handleSOS}
            className="fixed bottom-6 left-6 z-50 flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-full font-bold shadow-lg shadow-red-300 dark:shadow-red-900/50 transition-all transform hover:scale-105 active:scale-95 animate-pulse no-print"
            title="Emergency SOS - Call 911"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>SOS</span>
            <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
        </button>
    );
};

export default EmergencySOS;
