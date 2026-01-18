
import React, { useState, useEffect, useRef } from 'react';
import { SessionState, UserMetrics, StoryChapter } from './types';
import { GENRES, CO2_KG_PER_MILE, CHAPTER_TIME_TRIGGER, CHAPTER_DISTANCE_TRIGGER, CARPOOL_DISTANCE_MIN, CARPOOL_DISTANCE_MAX } from './constants';
import { Dashboard } from './Dashboard';
import { StoryFeed } from './StoryFeed';
import { Controls } from './Controls';
import { generateChapter, generateTTS } from './geminiService';
import { saveSession, getSessions, deleteSession } from './persistenceService';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User } from '@supabase/supabase-js';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Session UI State
  const [view, setView] = useState<'landing' | 'setup' | 'active' | 'dashboard'>('landing');
  const [currentSession, setCurrentSession] = useState<SessionState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [savedSessions, setSavedSessions] = useState<SessionState[]>([]);

  // Setup Form State
  const [selectedGenre, setSelectedGenre] = useState<string>(GENRES[0]);
  const [customPlot, setCustomPlot] = useState('');
  const [carpoolMode, setCarpoolMode] = useState(false);

  // Metrics State
  const [metrics, setMetrics] = useState<UserMetrics>({
    currentSpeed: 0,
    totalDistance: 0,
    co2Saved: 0,
    elapsedTime: 0
  });

  // Trackers for trigger
  const lastChapterTimeRef = useRef(0);
  const lastChapterDistRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  // Auth Initialization
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoadingAuth(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initialize Data
  useEffect(() => {
    if (user || !isSupabaseConfigured) {
      setSavedSessions(getSessions());
    }
  }, [user]);

  const handleSignIn = async () => {
    if (!isSupabaseConfigured) {
      alert("Authentication system is not configured. Please provide SUPABASE_URL and SUPABASE_ANON_KEY.");
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  };

  const handleSignOut = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setView('landing');
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
    triggerNewChapter(newSession, 0, 0); // Start the intro
  };

  const resumeSession = (session: SessionState) => {
    setCurrentSession(session);
    setMetrics({
      currentSpeed: 0,
      totalDistance: session.totalDistance,
      co2Saved: session.totalDistance * CO2_KG_PER_MILE,
      elapsedTime: session.totalTime
    });
    lastChapterTimeRef.current = session.totalTime;
    lastChapterDistRef.current = session.totalDistance;
    setView('active');
  };

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
      title: `Fragment ${session.chapters.length + 1}`,
      content,
      timestamp: Date.now(),
      speedAtCreation: speed,
      distanceAtCreation: distance,
      audioData: audio || undefined,
      genre: session.genre
    };

    setCurrentSession(prev => {
      if (!prev) return null;
      const updated = { ...prev, chapters: [...prev.chapters, newChapter] };
      saveSession(updated);
      return updated;
    });
    
    setIsGenerating(false);
  };

  // Main Tracking Loop
  useEffect(() => {
    if (isTracking && view === 'active') {
      timerRef.current = window.setInterval(() => {
        setMetrics(prev => {
          const newTime = prev.elapsedTime + 1;
          const distIncrement = prev.currentSpeed / 3600;
          const newDist = prev.totalDistance + distIncrement;
          const newCO2 = newDist * CO2_KG_PER_MILE;

          const timeSinceLast = newTime - lastChapterTimeRef.current;
          const distSinceLast = newDist - lastChapterDistRef.current;

          let trigger = false;
          if (currentSession?.carpoolMode) {
             const carpoolTrigger = Math.random() * (CARPOOL_DISTANCE_MAX - CARPOOL_DISTANCE_MIN) + CARPOOL_DISTANCE_MIN;
             if (distSinceLast >= carpoolTrigger) trigger = true;
          } else {
             if (timeSinceLast >= CHAPTER_TIME_TRIGGER || distSinceLast >= CHAPTER_DISTANCE_TRIGGER) trigger = true;
          }

          if (trigger && !isGenerating) {
            lastChapterTimeRef.current = newTime;
            lastChapterDistRef.current = newDist;
            setTimeout(() => {
              if (currentSession) triggerNewChapter(currentSession, prev.currentSpeed, newDist);
            }, 0);
          }

          return {
            ...prev,
            elapsedTime: newTime,
            totalDistance: newDist,
            co2Saved: newCO2
          };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTracking, isGenerating, view, currentSession]);

  const handleManualSave = () => {
    if (currentSession) {
      const updated = { ...currentSession, totalDistance: metrics.totalDistance, totalTime: metrics.elapsedTime };
      saveSession(updated);
      setSavedSessions(getSessions());
      alert('SYNCHRONIZATION COMPLETE. STATE PERSISTED.');
    }
  };

  const handleExit = () => {
    if (confirm('TERMINATE NEURAL LINK? ALL UNSAVED PROGRESS WILL BE LOST.')) {
      handleManualSave();
      setIsTracking(false);
      setView('landing');
      setCurrentSession(null);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="cyber-text text-cyan-500 animate-pulse text-xl tracking-[0.3em]">SYNCHING NEURAL ACCESS...</div>
      </div>
    );
  }

  if (view === 'landing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-8 bg-[url('https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80&w=2069')] bg-cover bg-center relative">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        
        {user && (
          <div className="absolute top-6 right-6 z-20 flex items-center gap-4 bg-black/40 p-2 rounded-full border border-cyan-500/20 backdrop-blur-md">
            <span className="text-[10px] text-cyan-400 cyber-text uppercase tracking-widest pl-4">Ident: {user.user_metadata?.full_name?.split(' ')[0] || 'Unknown'}</span>
            <button 
              onClick={handleSignOut}
              className="px-4 py-1 bg-red-500/10 text-red-500 border border-red-500/40 rounded-full text-[10px] cyber-text uppercase hover:bg-red-500 hover:text-black transition-all"
            >
              Disconnect
            </button>
          </div>
        )}

        <div className="relative z-10 space-y-6">
          <h1 className="text-6xl md:text-8xl font-bold cyber-text glow-magenta uppercase italic tracking-tighter">MyJourneyAI</h1>
          <p className="text-cyan-400 text-lg md:text-xl cyber-text max-w-lg mx-auto">Movement powers the narrative. Speed defines the mood. Your journey is the story.</p>
          
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            {user || !isSupabaseConfigured ? (
              <>
                <button 
                  onClick={() => setView('setup')}
                  className="bg-magenta-600 hover:bg-magenta-500 text-white font-bold py-4 px-10 rounded-lg cyber-text border-b-4 border-magenta-900 transition-all shadow-[0_0_20px_rgba(255,0,255,0.4)]"
                >
                  INITIALIZE PROTOCOL
                </button>
                <button 
                  onClick={() => { setSavedSessions(getSessions()); setView('dashboard'); }}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 px-10 rounded-lg cyber-text border-b-4 border-cyan-900 transition-all shadow-[0_0_20px_rgba(0,255,255,0.4)]"
                >
                  ARCHIVED DATA
                </button>
                {!isSupabaseConfigured && (
                  <div className="absolute bottom-4 left-0 right-0 text-[10px] text-yellow-500/50 cyber-text uppercase">
                    Auth system offline: Local mode active
                  </div>
                )}
              </>
            ) : (
              <button 
                onClick={handleSignIn}
                className="flex items-center gap-4 bg-white hover:bg-gray-100 text-black font-bold py-4 px-10 rounded-lg cyber-text transition-all shadow-[0_0_25px_rgba(255,255,255,0.3)] group"
              >
                <svg className="w-6 h-6" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                SYNC NEURAL IDENTITY
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Setup view
  if (view === 'setup') {
    return (
      <div className="min-h-screen p-6 max-w-xl mx-auto space-y-8 pt-12">
        <h2 className="text-4xl font-bold cyber-text text-white uppercase glow-cyan">Parameter Calibration</h2>
        
        <div className="space-y-4">
          <label className="block text-xs uppercase tracking-widest text-cyan-500 font-bold">Thematic Genre</label>
          <select 
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="w-full bg-black border border-cyan-500/30 p-4 rounded text-white focus:border-cyan-500 outline-none"
          >
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div className="space-y-4">
          <label className="block text-xs uppercase tracking-widest text-cyan-500 font-bold">Deep Plot Injection (Optional)</label>
          <textarea 
            value={customPlot}
            onChange={(e) => setCustomPlot(e.target.value)}
            placeholder="e.g., A detective chasing a phantom in a floating city..."
            className="w-full bg-black border border-cyan-500/30 p-4 rounded text-white focus:border-cyan-500 outline-none h-32"
          />
        </div>

        <div className="flex items-center gap-4 bg-blue-900/10 p-4 border border-blue-500/30 rounded">
          <input 
            type="checkbox" 
            id="carpool"
            checked={carpoolMode}
            onChange={(e) => setCarpoolMode(e.target.checked)}
            className="w-6 h-6 accent-blue-500"
          />
          <label htmlFor="carpool" className="text-sm text-blue-400 font-bold cyber-text uppercase">Enable Carpool Sync Mode</label>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => setView('landing')}
            className="flex-1 py-4 border border-red-500 text-red-500 cyber-text uppercase text-sm font-bold"
          >
            Abort
          </button>
          <button 
            onClick={startNewSession}
            className="flex-1 py-4 bg-cyan-600 text-white cyber-text uppercase text-sm font-bold shadow-[0_0_15px_rgba(0,255,255,0.3)]"
          >
            Engage
          </button>
        </div>
      </div>
    );
  }

  // Dashboard view
  if (view === 'dashboard') {
    return (
      <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-8 pt-12">
        <div className="flex justify-between items-center">
          <h2 className="text-4xl font-bold cyber-text text-white uppercase glow-magenta">Archives</h2>
          <button onClick={() => setView('landing')} className="text-cyan-500 cyber-text uppercase text-xs">Back</button>
        </div>

        <div className="grid gap-4">
          {savedSessions.length === 0 ? (
            <div className="text-center py-20 text-gray-500 border border-dashed border-gray-800 rounded">NO ARCHIVES FOUND</div>
          ) : (
            savedSessions.map(s => (
              <div key={s.id} className="bg-black/50 border border-cyan-500/30 p-6 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-cyan-500 transition-colors">
                <div>
                  <h3 className="text-xl text-white font-bold cyber-text">{s.genre} Sequence</h3>
                  <p className="text-xs text-gray-500 uppercase tracking-tighter">{new Date(s.startTime).toLocaleDateString()} // {s.chapters.length} Fragments</p>
                  <p className="text-[10px] text-magenta-400 mt-2 uppercase">{s.totalDistance.toFixed(2)} Miles Traversed</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => resumeSession(s)}
                    className="flex-1 md:flex-none px-6 py-2 bg-cyan-600 text-white text-xs font-bold cyber-text uppercase rounded"
                  >
                    Load Neural State
                  </button>
                  <button 
                    onClick={() => { deleteSession(s.id); setSavedSessions(getSessions()); }}
                    className="p-2 border border-red-500/50 text-red-500 rounded hover:bg-red-500/10"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Active view
  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col bg-[#050505]">
      {currentSession && (
        <>
          <Dashboard metrics={metrics} carpoolMode={currentSession.carpoolMode} />
          <StoryFeed chapters={currentSession.chapters} isGenerating={isGenerating} />
          <Controls 
            isTracking={isTracking}
            onToggleTrack={() => setIsTracking(!isTracking)}
            onSaveSession={handleManualSave}
            onExit={handleExit}
            speed={metrics.currentSpeed}
            setSpeed={(s) => setMetrics(prev => ({ ...prev, currentSpeed: s }))}
          />
        </>
      )}
    </div>
  );
};

export default App;
