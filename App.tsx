
import React, { useState, useEffect, useRef } from 'react';
import { SessionState, UserMetrics, StoryChapter } from './types';
import { GENRES, CO2_KG_PER_MILE, CHAPTER_TIME_TRIGGER, CHAPTER_DISTANCE_TRIGGER, CARPOOL_DISTANCE_MIN, CARPOOL_DISTANCE_MAX } from './constants';
import { Dashboard } from './Dashboard';
import { StoryFeed } from './StoryFeed';
import { Controls } from './Controls';
import { generateChapter, generateTTS } from './geminiService';
import { saveSession, getLocalSessions, getRemoteSessions, deleteSession } from './persistenceService';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'setup' | 'active' | 'dashboard'>('landing');
  const [currentSession, setCurrentSession] = useState<SessionState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [savedSessions, setSavedSessions] = useState<SessionState[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>(GENRES[0]);
  const [customPlot, setCustomPlot] = useState('');
  const [carpoolMode, setCarpoolMode] = useState(false);
  const [metrics, setMetrics] = useState<UserMetrics>({
    currentSpeed: 0,
    totalDistance: 0,
    co2Saved: 0,
    elapsedTime: 0
  });

  const lastChapterTimeRef = useRef(0);
  const lastChapterDistRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  // Auth Initialization
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) refreshSessions(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) refreshSessions(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshSessions = async (uid?: string) => {
    let all = getLocalSessions();
    if (uid) {
      const remote = await getRemoteSessions(uid);
      const merged = [...remote];
      all.forEach(ls => { 
        if (!merged.find(ms => ms.id === ls.id)) merged.push(ls); 
      });
      all = merged;
    }
    setSavedSessions(all);
  };

  const handleGoogleSignIn = async () => {
    if (!isSupabaseConfigured) {
      alert("Neural sync hardware (Supabase) not detected.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) console.error("Identity Sync Error:", error.message);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setView('landing');
  };

  // GPS Tracking
  useEffect(() => {
    let watchId: number | null = null;
    if (isTracking && view === 'active') {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (pos.coords.speed !== null) {
            // Convert m/s to mph
            const mph = pos.coords.speed * 2.23694;
            setMetrics(m => ({ ...m, currentSpeed: mph }));
          }
        },
        (err) => console.warn("GPS Interface Failed:", err),
        { enableHighAccuracy: true }
      );
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [isTracking, view]);

  // Game Logic Loop
  useEffect(() => {
    if (isTracking && view === 'active') {
      timerRef.current = window.setInterval(() => {
        setMetrics(prev => {
          const newTime = prev.elapsedTime + 1;
          const distIncrement = prev.currentSpeed / 3600; // miles per second
          const newDist = prev.totalDistance + distIncrement;
          const newCO2 = newDist * CO2_KG_PER_MILE;

          const timeSinceLast = newTime - lastChapterTimeRef.current;
          const distSinceLast = newDist - lastChapterDistRef.current;

          let shouldTrigger = false;
          if (currentSession?.carpoolMode) {
             const carpoolTrigger = Math.random() * (CARPOOL_DISTANCE_MAX - CARPOOL_DISTANCE_MIN) + CARPOOL_DISTANCE_MIN;
             if (distSinceLast >= carpoolTrigger) shouldTrigger = true;
          } else {
             if (timeSinceLast >= CHAPTER_TIME_TRIGGER || distSinceLast >= CHAPTER_DISTANCE_TRIGGER) shouldTrigger = true;
          }

          if (shouldTrigger && !isGenerating) {
            lastChapterTimeRef.current = newTime;
            lastChapterDistRef.current = newDist;
            // Delay call to next tick to avoid state closure issues
            setTimeout(() => {
              if (currentSession) triggerNewChapter(currentSession, prev.currentSpeed, newDist);
            }, 0);
          }

          return { ...prev, elapsedTime: newTime, totalDistance: newDist, co2Saved: newCO2 };
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTracking, isGenerating, view, currentSession]);

  const triggerNewChapter = async (session: SessionState, speed: number, distance: number) => {
    if (isGenerating) return;
    setIsGenerating(true);
    
    const context = session.chapters.map(c => c.content).join('\n\n');
    const content = await generateChapter(
      session.genre, 
      session.customPlot || '', 
      speed, 
      context, 
      session.chapters.length + 1
    );

    const audio = await generateTTS(content);

    const newChapter: StoryChapter = {
      id: crypto.randomUUID(),
      title: `${session.genre} // Fragment ${session.chapters.length + 1}`,
      content,
      timestamp: Date.now(),
      speedAtCreation: speed,
      distanceAtCreation: distance,
      audioData: audio || undefined,
      genre: session.genre
    };

    setCurrentSession(prev => {
      if (!prev) return null;
      const updated = { ...prev, chapters: [...prev.chapters, newChapter], totalDistance: distance };
      saveSession(updated, user?.id);
      return updated;
    });
    
    setIsGenerating(false);
  };

  const startNewSession = () => {
    const newSession: SessionState = {
      id: crypto.randomUUID(),
      startTime: Date.now(),
      chapters: [],
      totalDistance: 0,
      totalTime: 0,
      genre: selectedGenre,
      customPlot: customPlot,
      carpoolMode: carpoolMode,
      isCompleted: false
    };
    
    setCurrentSession(newSession);
    setMetrics({ currentSpeed: 0, totalDistance: 0, co2Saved: 0, elapsedTime: 0 });
    lastChapterTimeRef.current = 0;
    lastChapterDistRef.current = 0;
    setView('active');
    setIsTracking(true); // Start tracking automatically
    
    // Generate the intro chapter immediately on start
    triggerNewChapter(newSession, 0, 0); 
  };

  if (view === 'landing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-8 bg-[url('https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80&w=2069')] bg-cover bg-center relative">
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
        
        {user && (
          <div className="absolute top-6 right-6 z-20 flex items-center gap-4 bg-black/40 p-2 rounded-full border border-cyan-500/20 backdrop-blur-md">
            <span className="text-[10px] text-cyan-400 cyber-text uppercase tracking-widest pl-4">Ident: {user.email?.split('@')[0]}</span>
            <button onClick={handleSignOut} className="px-4 py-1 bg-red-500/10 text-red-500 border border-red-500/40 rounded-full text-[10px] cyber-text uppercase hover:bg-red-500 hover:text-black transition-all">Disconnect</button>
          </div>
        )}

        <div className="relative z-10 space-y-8 animate-in fade-in duration-1000">
          <h1 className="text-6xl md:text-8xl font-bold cyber-text glow-magenta uppercase italic tracking-tighter">MyJourneyAI</h1>
          <p className="text-cyan-400 text-lg md:text-xl cyber-text max-w-lg mx-auto leading-relaxed border-l-2 border-cyan-500 pl-4">MOVEMENT POWERS THE NARRATIVE.<br/>YOUR VELOCITY DEFINES THE WORLD.</p>
          
          <div className="flex flex-col gap-4 max-w-sm mx-auto w-full">
            <button onClick={() => setView('setup')} className="bg-magenta-600 hover:bg-magenta-500 text-white font-bold py-4 px-10 rounded-sm cyber-text border-b-4 border-magenta-900 shadow-[0_0_30px_rgba(255,0,255,0.4)] transition-all uppercase">Initialize Neural Link</button>
            <button onClick={() => { refreshSessions(user?.id); setView('dashboard'); }} className="bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-400 font-bold py-3 px-10 rounded-sm cyber-text border border-cyan-500 transition-all uppercase">Archived Sessions</button>
            
            {!user && (
               <button onClick={handleGoogleSignIn} className="mt-4 flex items-center justify-center gap-4 bg-white hover:bg-gray-100 text-black font-bold py-4 px-10 rounded-sm cyber-text transition-all shadow-[0_0_25px_rgba(255,255,255,0.3)] group">
                 <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                 Sync Neural Identity
               </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'setup') {
    return (
      <div className="min-h-screen p-6 max-w-xl mx-auto space-y-10 pt-16 animate-in slide-in-from-bottom duration-500">
        <div className="space-y-2">
           <h2 className="text-4xl font-bold cyber-text text-white uppercase glow-cyan">Mission Config</h2>
           <p className="text-[10px] text-cyan-500 uppercase tracking-widest font-bold">Calibration in progress...</p>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase text-cyan-500 font-bold tracking-[0.2em]">Reality Theme</label>
            <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} className="w-full bg-black border border-cyan-500/30 p-4 rounded text-white focus:border-cyan-500 outline-none cyber-text">
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase text-cyan-500 font-bold tracking-[0.2em]">Plot Override (Optional)</label>
            <textarea value={customPlot} onChange={(e) => setCustomPlot(e.target.value)} placeholder="Inject narrative code..." className="w-full bg-black border border-cyan-500/30 p-4 rounded text-white focus:border-cyan-500 outline-none h-24" />
          </div>
          <div className="flex items-center gap-4 bg-blue-900/10 p-4 border border-blue-500/30">
            <input type="checkbox" id="carpool" checked={carpoolMode} onChange={(e) => setCarpoolMode(e.target.checked)} className="w-5 h-5 accent-blue-500" />
            <label htmlFor="carpool" className="text-xs text-blue-400 font-bold cyber-text uppercase">Carpool Protocol (5-10mi intervals)</label>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button onClick={() => setView('landing')} className="flex-1 py-4 border border-red-500 text-red-500 cyber-text uppercase text-sm font-bold">Cancel</button>
          <button onClick={startNewSession} className="flex-1 py-4 bg-cyan-600 text-white cyber-text uppercase text-sm font-bold shadow-[0_0_15px_rgba(0,255,255,0.3)]">Deploy</button>
        </div>
      </div>
    );
  }

  if (view === 'dashboard') {
     return (
        <div className="min-h-screen p-6 max-w-3xl mx-auto pt-16">
           <div className="flex justify-between items-end mb-10 border-b border-magenta-500/30 pb-4">
              <h2 className="text-4xl font-bold cyber-text text-white uppercase glow-magenta">Archives</h2>
              <button onClick={() => setView('landing')} className="text-xs text-cyan-400 cyber-text uppercase hover:underline">Return to Hub</button>
           </div>
           <div className="grid gap-4">
              {savedSessions.length === 0 ? (
                <div className="text-center py-20 text-gray-600 border border-dashed border-gray-800">NO SESSION LOGS DETECTED</div>
              ) : savedSessions.map(s => (
                 <div key={s.id} className="bg-cyan-900/10 border border-cyan-500/30 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group hover:border-cyan-400 transition-colors">
                    <div>
                       <h3 className="text-xl font-bold cyber-text text-white">{s.genre} Sequence</h3>
                       <p className="text-[10px] text-gray-500 uppercase">{new Date(s.startTime).toLocaleDateString()} // {s.chapters.length} Fragments Recorded</p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      <button onClick={() => { setCurrentSession(s); setView('active'); }} className="flex-1 md:flex-none px-6 py-2 bg-magenta-600 text-white cyber-text text-xs font-bold uppercase hover:bg-magenta-500 transition-colors">Resume Link</button>
                      <button onClick={() => { deleteSession(s.id, user?.id); refreshSessions(user?.id); }} className="px-3 py-2 border border-red-500/30 text-red-500 hover:bg-red-500/10"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                    </div>
                 </div>
              ))}
           </div>
        </div>
     );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col bg-[#050505] selection:bg-cyan-500 selection:text-black">
      {currentSession && (
        <>
          <Dashboard metrics={metrics} carpoolMode={currentSession.carpoolMode} />
          <StoryFeed chapters={currentSession.chapters} isGenerating={isGenerating} />
          <Controls 
            isTracking={isTracking} 
            onToggleTrack={() => setIsTracking(!isTracking)} 
            onSaveSession={() => saveSession(currentSession!, user?.id)} 
            onExit={() => { setIsTracking(false); setView('landing'); }} 
            speed={metrics.currentSpeed} 
            setSpeed={(s) => setMetrics(m => ({ ...m, currentSpeed: s }))} 
          />
        </>
      )}
    </div>
  );
};

export default App;
