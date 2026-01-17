
import React from 'react';
import { UserMetrics } from '../types';

interface DashboardProps {
  metrics: UserMetrics;
  carpoolMode: boolean;
}

const MetricCard: React.FC<{ label: string; value: string; unit: string; colorClass: string }> = ({ label, value, unit, colorClass }) => (
  <div className={`bg-black/50 border-l-4 ${colorClass} p-3 rounded-r-lg flex flex-col justify-center min-w-[100px]`}>
    <span className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">{label}</span>
    <div className="flex items-baseline gap-1">
      <span className={`text-xl font-bold cyber-text ${colorClass.replace('border-', 'text-')}`}>{value}</span>
      <span className="text-[10px] text-gray-500">{unit}</span>
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ metrics, carpoolMode }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 sticky top-0 bg-[#050505]/80 backdrop-blur-md py-4 z-40 border-b border-cyan-900/30">
      <MetricCard 
        label="Velocity" 
        value={metrics.currentSpeed.toFixed(1)} 
        unit="MPH" 
        colorClass="border-cyan-500" 
      />
      <MetricCard 
        label="Distance" 
        value={metrics.totalDistance.toFixed(2)} 
        unit="MI" 
        colorClass="border-magenta-500" 
      />
      <MetricCard 
        label="CO2 Shield" 
        value={metrics.co2Saved.toFixed(3)} 
        unit="KG" 
        colorClass="border-green-500" 
      />
      <MetricCard 
        label="Session" 
        value={Math.floor(metrics.elapsedTime / 60).toString().padStart(2, '0') + ':' + (metrics.elapsedTime % 60).toString().padStart(2, '0')} 
        unit="TIME" 
        colorClass="border-yellow-500" 
      />
      {carpoolMode && (
        <div className="col-span-full bg-blue-900/20 text-blue-400 text-[10px] py-1 px-3 text-center uppercase tracking-tighter border border-blue-500/30 rounded">
          Carpool Sync Active: Chapter trigger increased to 5-10 mile intervals
        </div>
      )}
    </div>
  );
};
