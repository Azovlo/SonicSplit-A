import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Youtube, Play, Pause, RefreshCw, AudioLines, AlertTriangle, Clock, Music } from 'lucide-react';
import { AppState, AudioTrack, AudioInfo } from './types';
import { GlowButton } from './components/ui/GlowButton';
import { ProcessingView } from './components/ProcessingView';
import { TrackRow } from './components/TrackRow';
import { Background } from './components/Background';
import { AudioEngine, TRACKS } from './utils/audioEngine';

// Initial state helpers
const INITIAL_TRACKS = TRACKS.map(t => ({ ...t, isMuted: false, isSolo: false, volume: 100 }));

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [tracks, setTracks] = useState<AudioTrack[]>(INITIAL_TRACKS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null);
  const [processingStep, setProcessingStep] = useState({ label: '', pct: 0 });
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Refs
  const engineRef = useRef<AudioEngine | null>(null);
  const rafRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize engine on mount
  useEffect(() => {
    engineRef.current = new AudioEngine();
    return () => engineRef.current?.dispose();
  }, []);

  // Playback loop
  useEffect(() => {
    const loop = () => {
      if (engineRef.current && isPlaying) {
        setCurrentTime(engineRef.current.getCurrentTime());
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    if (isPlaying) loop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  const handleFile = async (file: File) => {
    if (!engineRef.current) return;
    setAppState(AppState.PROCESSING);
    
    try {
      const info = await engineRef.current.loadFile(file, (step, pct) => {
        setProcessingStep({ label: step, pct });
      });
      setAudioInfo(info);
      setAppState(AppState.RESULTS);
    } catch (e) {
      console.error(e);
      alert('Ошибка при обработке файла. Проверьте формат.');
      setAppState(AppState.IDLE);
    }
  };

  const resetApp = () => {
    engineRef.current?.stop();
    setAppState(AppState.IDLE);
    setIsPlaying(false);
    setCurrentTime(0);
    setTracks(INITIAL_TRACKS);
    setAudioInfo(null);
  };

  const togglePlay = () => {
    if (!engineRef.current) return;
    if (isPlaying) {
      engineRef.current.pause();
    } else {
      engineRef.current.play(() => setIsPlaying(false));
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    engineRef.current?.seekTo(time);
  };

  const toggleMute = (id: string) => {
    setTracks(prev => prev.map(t => {
        if (t.id !== id) return t;
        const newMuted = !t.isMuted;
        engineRef.current?.setMuted(id, newMuted);
        return { ...t, isMuted: newMuted };
    }));
  };

  const toggleSolo = (id: string) => {
    setTracks(prev => {
        const isSoloing = !prev.find(t => t.id === id)?.isSolo;
        engineRef.current?.setSolo(isSoloing ? id : null);
        return prev.map(t => ({
            ...t,
            isSolo: t.id === id ? isSoloing : false,
            // If we are soloing this track, visually mute others (logic handled in engine, this is just for UI state if needed)
        }));
    });
  };

  const changeVolume = (id: string, vol: number) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, volume: vol } : t));
    engineRef.current?.setVolume(id, vol);
  };

  const handleExport = (id: string, name: string) => {
      engineRef.current?.exportTrack(id, name);
  };

  const formatTime = (t: number) => {
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full min-h-screen bg-dark-900 text-white overflow-x-hidden">
      <Background />

      <nav className="absolute top-0 left-0 w-full p-6 z-50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-neon-blue to-neon-purple rounded-lg flex items-center justify-center">
            <AudioLines size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-wider">SonicSplit<span className="text-neon-blue">AI</span></span>
        </div>
        <a href="https://github.com/Azovlo/SonicSplit-A" target="_blank" className="text-sm text-gray-500 hover:text-white transition-colors">v2.0.0 (WebAudio)</a>
      </nav>

      <main className="relative z-10 container mx-auto px-4 pt-32 pb-20 flex flex-col items-center min-h-screen">
        
        <AnimatePresence mode="wait">
          {appState === AppState.IDLE && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-4xl text-center"
              key="idle"
            >
              <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-600">
                Раздели музыку <br/>
                <span className="bg-gradient-to-r from-neon-blue via-neon-purple to-neon-green bg-clip-text text-transparent">на стемы</span>
              </h1>
              <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
                Загрузи трек и получи отдельные дорожки (Vocals, Drums, Bass, Other) прямо в браузере.
                Без серверов. Без ожидания. Бесплатно.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {/* Upload Zone */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="h-64 border border-white/10 bg-dark-800/40 backdrop-blur-sm rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 hover:border-neon-blue/50 transition-all group"
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden"
                    onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                    accept="audio/*"
                  />
                  <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-2xl border border-white/5">
                    <Upload className="text-white group-hover:text-neon-blue transition-colors" size={28} />
                  </div>
                  <h3 className="text-lg font-bold font-display mb-1 text-white">Загрузить файл</h3>
                  <p className="text-sm text-gray-400">MP3, WAV, FLAC</p>
                </div>

                {/* YouTube Zone */}
                <div className="h-64 border border-white/10 bg-dark-800/40 backdrop-blur-sm rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden group">
                   <div className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center p-6 text-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                        <AlertTriangle className="text-yellow-500 mb-2" size={24} />
                        <p className="text-sm text-white font-medium">YouTube недоступен в Web-версии</p>
                        <p className="text-xs text-gray-400 mt-1">CORS ограничения браузера не позволяют скачивать видео напрямую. Загрузите MP3 файл.</p>
                   </div>

                  <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mb-4 shadow-2xl border border-red-500/20">
                    <Youtube className="text-red-500" size={28} />
                  </div>
                  <h3 className="text-lg font-bold font-display mb-4 text-white">YouTube Ссылка</h3>
                  <div className="flex w-full gap-2 relative z-10 opacity-50">
                    <input type="text" placeholder="Ссылка..." className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 text-sm text-white" disabled />
                    <button className="bg-white/10 text-white p-3 rounded-xl" disabled><Play size={18} /></button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {appState === AppState.PROCESSING && (
            <ProcessingView key="processing" step={processingStep.label} pct={processingStep.pct} />
          )}

          {appState === AppState.RESULTS && audioInfo && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-5xl"
              key="results"
            >
              {/* Header Info */}
              <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6 bg-white/5 p-6 rounded-3xl border border-white/5">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                     <div className="p-2 bg-neon-blue/20 rounded-lg text-neon-blue">
                        <Music size={24} />
                     </div>
                     <div>
                        <h2 className="text-2xl font-display font-bold text-white">Project STEMS</h2>
                        <p className="text-xs text-neon-blue font-mono">AI PROCESSED • {audioInfo.sampleRate}Hz • {audioInfo.channels}CH</p>
                     </div>
                  </div>
                  <div className="flex gap-6 mt-4 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-neon-purple" />
                        <span>{formatTime(audioInfo.duration)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AudioLines size={16} className="text-neon-green" />
                        <span>{audioInfo.bpm} BPM</span>
                      </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 w-full md:w-64 bg-black/40 p-2 rounded-xl border border-white/10">
                        <span className="text-xs font-mono text-neon-blue w-10 text-right">{formatTime(currentTime)}</span>
                        <input 
                            type="range" 
                            min="0" 
                            max={audioInfo.duration} 
                            step="0.1"
                            value={currentTime}
                            onChange={handleSeek}
                            className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-neon-blue"
                        />
                        <span className="text-xs font-mono text-gray-500 w-10">{formatTime(audioInfo.duration)}</span>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <GlowButton variant="secondary" onClick={resetApp} icon={<RefreshCw size={18} />}>
                            Заново
                        </GlowButton>
                        <GlowButton 
                            onClick={togglePlay}
                            icon={isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                        >
                            {isPlaying ? 'Пауза' : 'Слушать'}
                        </GlowButton>
                    </div>
                </div>
              </header>

              {/* Tracks */}
              <div className="space-y-4">
                {tracks.map(track => (
                  <TrackRow 
                    key={track.id} 
                    track={track} 
                    analyser={engineRef.current?.getAnalyser(track.id) ?? null}
                    onToggleMute={toggleMute}
                    onToggleSolo={toggleSolo}
                    onVolumeChange={changeVolume}
                    onExport={handleExport}
                    isPlaying={isPlaying}
                  />
                ))}
              </div>

              <div className="mt-8 text-center">
                 <p className="text-xs text-gray-500 font-mono">
                    * Разделение выполнено в реальном времени через WebAudio API BiquadFilters. 
                    Качество зависит от сложности микса.
                 </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;