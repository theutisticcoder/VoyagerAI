
import React from 'react';

interface ControlsProps {
  isTracking: boolean;
  onToggleTrack: () => void;
  onSaveSession: () => void;
  onExit: () => void;
  speed: number;
  setSpeed: (s: number) => void;
}

export const Controls: React.FC<ControlsProps> = ({ 
  isTracking, 
  onToggleTrack, 
  onSaveSession, 
  onExit,
  speed,
  setSpeed
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#050505]/90 border-t border-magenta-500/30 backdrop-blur-xl z-50">
      <div className="max-w-4xl mx-auto flex flex-col gap-4">
        {/* Speed Slider Simulator */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px] text-gray-500 uppercase cyber-text">
            <span>Idle</span>
            <span className="text-cyan-400">Current Simulator: {speed.toFixed(1)} MPH</span>
            <span>Sprint</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="12" 
            step="0.1" 
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full accent-cyan-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="flex justify-between items-center gap-2">
          <button 
            onClick={onToggleTrack}
            className={`flex-1 py-3 px-4 rounded-lg cyber-text text-sm font-bold tracking-widest transition-all border-2 ${isTracking ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-cyan-500/20 border-cyan-500 text-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]'}`}
          >
            {isTracking ? 'PAUSE PROTOCOL' : 'INITIATE JOURNEY'}
          </button>
          
          <div className="flex gap-2">
             <button 
              onClick={onSaveSession}
              className="p-3 rounded-lg border border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 transition-colors"
              title="Save State"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
            </button>
            <button 
              onClick={onExit}
              className="p-3 rounded-lg border border-red-500/50 text-red-500 hover:bg-red-500/10 transition-colors"
              title="Exit Session"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
