
import React, { useRef } from 'react';
import { StoryChapter } from './types';
import { decodeAudio, decodeAudioData } from './geminiService';

interface StoryFeedProps {
  chapters: StoryChapter[];
  isGenerating: boolean;
}

const AudioPlayer: React.FC<{ audioBase64?: string }> = ({ audioBase64 }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const handlePlay = async () => {
    if (!audioBase64) return;
    if (isPlaying) {
      sourceRef.current?.stop();
      setIsPlaying(false);
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    const data = decodeAudio(audioBase64);
    const buffer = await decodeAudioData(data, audioContextRef.current, 24000, 1);
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => setIsPlaying(false);
    
    source.start(0);
    sourceRef.current = source;
    setIsPlaying(true);
  };

  if (!audioBase64) return null;

  return (
    <button 
      onClick={handlePlay}
      className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500 text-xs tracking-widest uppercase transition-all ${isPlaying ? 'bg-cyan-500 text-black' : 'text-cyan-500 hover:bg-cyan-500/10'}`}
    >
      {isPlaying ? (
        <><span className="w-2 h-2 bg-black rounded-full animate-ping" /> STOP NARRATION</>
      ) : (
        <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> PLAY NARRATION</>
      )}
    </button>
  );
};

export const StoryFeed: React.FC<StoryFeedProps> = ({ chapters, isGenerating }) => {
  const feedEndRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chapters, isGenerating]);

  return (
    <div className="space-y-12 pb-32 max-w-2xl mx-auto">
      {chapters.map((chapter, idx) => (
        <article key={chapter.id} className="relative group">
          <div className="absolute -left-4 top-0 bottom-0 w-[1px] bg-gradient-to-b from-cyan-500/50 to-transparent group-hover:from-magenta-500 transition-colors" />
          <header className="mb-6">
            <span className="text-[10px] text-magenta-500 cyber-text uppercase tracking-tighter block mb-1">
              DATA SEGMENT {idx + 1} // {new Date(chapter.timestamp).toLocaleTimeString()}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-white cyber-text glow-cyan uppercase">
              {chapter.title || `Chapter ${idx + 1}`}
            </h2>
          </header>
          
          <div className="story-text text-lg md:text-xl text-gray-300 leading-relaxed space-y-6">
            {chapter.content.split('\n\n').map((para, pIdx) => (
              <p key={pIdx} className={`${pIdx === 0 ? 'drop-cap' : ''}`}>
                {para.trim()}
              </p>
            ))}
          </div>

          <AudioPlayer audioBase64={chapter.audioData} />
        </article>
      ))}

      {isGenerating && (
        <div className="space-y-6 shimmer">
          <div className="h-8 w-1/2 bg-cyan-900/30 rounded" />
          <div className="h-32 bg-cyan-900/10 rounded" />
          <div className="h-32 bg-cyan-900/10 rounded" />
        </div>
      )}
      <div ref={feedEndRef} />
    </div>
  );
};
