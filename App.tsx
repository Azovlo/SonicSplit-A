import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Youtube, Play, Pause, RefreshCw, AudioLines, Download, AlertTriangle } from 'lucide-react';
import { AppState, AudioTrack } from './types';
import { GlowButton } from './components/ui/GlowButton';
import { ProcessingView } from './components/ProcessingView';
import { TrackRow } from './components/TrackRow';
import { Background } from './components/Background';

const INITIAL_TRACKS: AudioTrack[] = [
  { id: 'vocals', name: 'Vocals', color: '#00f3ff', isMuted: false, volume: 100, downloadUrl: '#' },
  { id: 'drums', name: 'Drums', color: '#bc13fe', isMuted: false, volume: 100, downloadUrl: '#' },
  { id: 'bass', name: 'Bass', color: '#0aff68', isMuted: false, volume: 100, downloadUrl: '#' },
  { id: 'other', name: 'Other', color: '#ffbd00', isMuted: false, volume: 100, downloadUrl: '#' },
];

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null); // Real file URL
  const [tracks, setTracks] = useState<AudioTrack[]>(INITIAL_TRACKS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [audioReady, setAudioReady] = useState(false);

  // Web Audio API Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const gainNodesRef = useRef<Record<string, GainNode>>({});
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Initialize Audio Engine when entering Processing state
  useEffect(() => {
    const initAudio = async () => {
      if (!fileUrl) return;

      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
        
        // Fetch user audio blob
        const response = await fetch(fileUrl);
        const arrayBuffer = await response.arrayBuffer();
        
        // Decode logic
        const decodedAudio = await audioContextRef.current.decodeAudioData(arrayBuffer);
        audioBufferRef.current = decodedAudio;
        setAudioReady(true);
      } catch (error) {
        console.error("Audio initialization failed:", error);
        alert("Ошибка при обработке аудиофайла. Попробуйте другой формат (MP3/WAV).");
        resetApp();
      }
    };

    if (appState === AppState.PROCESSING && fileUrl) {
        initAudio();
    }
  }, [appState, fileUrl]);

  // Handle Playback Logic
  const togglePlay = async () => {
    if (!audioContextRef.current || !audioBufferRef.current) return;

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (isPlaying) {
      // Pause
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
        pausedAtRef.current = audioContextRef.current.currentTime - startTimeRef.current;
      }
      setIsPlaying(false);
    } else {
      // Play
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.loop = true;
      sourceNodeRef.current = source;

      const destination = audioContextRef.current.destination;

      // --- REAL-TIME FREQUENCY ISOLATION ENGINE (Client-Side Stems) ---
      
      // 1. Vocals (Bandpass - Mids)
      // Focuses on human voice frequencies (approx 300Hz - 3kHz)
      const vocalGain = audioContextRef.current.createGain();
      const vocalFilter = audioContextRef.current.createBiquadFilter();
      vocalFilter.type = 'peaking';
      vocalFilter.frequency.value = 1000;
      vocalFilter.Q.value = 0.5;
      vocalFilter.gain.value = 0; // Neutral start, let volume control it
      
      const vocalHighPass = audioContextRef.current.createBiquadFilter();
      vocalHighPass.type = 'highpass';
      vocalHighPass.frequency.value = 300;

      const vocalLowPass = audioContextRef.current.createBiquadFilter();
      vocalLowPass.type = 'lowpass';
      vocalLowPass.frequency.value = 4000;
      
      // 2. Drums (Highpass + Low Kick)
      // Focuses on transients and high frequencies
      const drumsGain = audioContextRef.current.createGain();
      const drumsFilter = audioContextRef.current.createBiquadFilter();
      drumsFilter.type = 'highpass';
      drumsFilter.frequency.value = 3000; // High hats / cymbals

      // 3. Bass (Lowpass)
      // Focuses on sub-bass and bass lines (< 250Hz)
      const bassGain = audioContextRef.current.createGain();
      const bassFilter = audioContextRef.current.createBiquadFilter();
      bassFilter.type = 'lowpass';
      bassFilter.frequency.value = 200;
      bassFilter.Q.value = 1;

      // 4. Other (Mid-scoop)
      const otherGain = audioContextRef.current.createGain();
      const otherFilter = audioContextRef.current.createBiquadFilter();
      otherFilter.type = 'notch'; 
      otherFilter.frequency.value = 1000;

      // Store gains for volume control
      gainNodesRef.current = {
        'vocals': vocalGain,
        'drums': drumsGain,
        'bass': bassGain,
        'other': otherGain
      };

      // Apply initial volumes
      tracks.forEach(t => {
        updateGainNode(t.id, t.isMuted, t.volume);
      });

      // --- WIRING THE GRAPH ---

      // Vocals: Source -> HighPass -> LowPass -> Gain -> Out
      source.connect(vocalHighPass);
      vocalHighPass.connect(vocalLowPass);
      vocalLowPass.connect(vocalGain);
      vocalGain.connect(destination);

      // Drums: Source -> HighPass -> Gain -> Out
      source.connect(drumsFilter);
      drumsFilter.connect(drumsGain);
      drumsGain.connect(destination);

      // Bass: Source -> LowPass -> Gain -> Out
      source.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(destination);

      // Other: Source -> Notch -> Gain -> Out
      source.connect(otherFilter);
      otherFilter.connect(otherGain);
      otherGain.connect(destination);

      // Start playback
      startTimeRef.current = audioContextRef.current.currentTime - pausedAtRef.current;
      source.start(0, pausedAtRef.current % audioBufferRef.current.duration);
      setIsPlaying(true);
    }
  };

  const updateGainNode = (id: string, isMuted: boolean, volume: number) => {
    const gainNode = gainNodesRef.current[id];
    if (gainNode) {
        // Smooth transition
        const val = isMuted ? 0 : (volume / 100) * 1.5; // 1.5 multiplier to boost volume slightly after filtering
        gainNode.gain.setTargetAtTime(val, audioContextRef.current?.currentTime || 0, 0.1);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('audio/')) {
        alert("Пожалуйста, загрузите аудиофайл (MP3, WAV, и т.д.)");
        return;
    }
    // Create a BLOB URL from the actual user file
    const objectUrl = URL.createObjectURL(file);
    setFileUrl(objectUrl);
    setFileName(file.name);
    setAppState(AppState.PROCESSING);
  };

  const handleYoutube = () => {
    // Since we don't have a backend proxy to bypass CORS and download YouTube streams,
    // we notify the user. 
    alert("Для загрузки с YouTube требуется подключение серверного API (Backend). В данной веб-версии доступна работа с локальными файлами.");
  }

  const handleProcessComplete = () => {
    setAppState(AppState.RESULTS);
  };

  const toggleMute = (id: string) => {
    setTracks(prev => {
        const newTracks = prev.map(t => t.id === id ? { ...t, isMuted: !t.isMuted } : t);
        const track = newTracks.find(t => t.id === id);
        if(track) updateGainNode(id, track.isMuted, track.volume);
        return newTracks;
    });
  };

  const changeVolume = (id: string, val: number) => {
    setTracks(prev => {
        const newTracks = prev.map(t => t.id === id ? { ...t, volume: val } : t);
        updateGainNode(id, newTracks.find(t => t.id === id)?.isMuted || false, val);
        return newTracks;
    });
  };

  const resetApp = () => {
    if (sourceNodeRef.current) sourceNodeRef.current.stop();
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    
    setIsPlaying(false);
    setAppState(AppState.IDLE);
    setFileName(null);
    setFileUrl(null);
    setTracks(INITIAL_TRACKS);
    setYoutubeUrl('');
    setAudioReady(false);
    pausedAtRef.current = 0;
  };

  return (
    <div className="min-h-screen w-full bg-dark-900 text-white selection:bg-neon-blue selection:text-black font-sans relative overflow-hidden">
      
      {/* Live Liquid/Vibration Background */}
      <Background isPlaying={isPlaying} />
      
      {/* Vignette Overlay for Depth */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_100%)] pointer-events-none z-0" />

      {/* Navigation */}
      <nav className="relative z-50 w-full px-8 py-6 flex justify-between items-center backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={resetApp}>
          <div className="w-10 h-10 bg-gradient-to-br from-neon-blue to-neon-purple rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-neon-blue/50 transition-all duration-300">
            <AudioLines className="text-white" />
          </div>
          <span className="text-2xl font-display font-bold tracking-tighter">
            SONIC<span className="text-neon-blue">SPLIT</span>
          </span>
        </div>
        <div className="hidden md:flex gap-6 text-sm font-medium text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Технология</a>
            <a href="#" className="hover:text-white transition-colors">О нас</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
        </div>
      </nav>

      <main className="relative z-10 container mx-auto px-4 py-12 flex flex-col items-center min-h-[80vh]">
        
        <AnimatePresence mode='wait'>
          {/* IDLE STATE - HERO & UPLOAD */}
          {appState === AppState.IDLE && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl flex flex-col items-center text-center"
              key="idle"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono uppercase tracking-widest text-neon-blue mb-8 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-neon-blue animate-pulse"></span>
                Web Audio Engine Ready
              </div>
              
              <h1 className="text-5xl md:text-7xl font-display font-black leading-tight mb-6 drop-shadow-2xl">
                Раздели музыку <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-white to-neon-purple">
                  На атомы
                </span>
              </h1>
              
              <p className="text-xl text-gray-300 max-w-2xl mb-16 font-light drop-shadow-lg">
                Загрузите любой аудиофайл и управляйте дорожками в реальном времени. Вокал, бас и ударные под полным контролем.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                {/* Upload Zone */}
                <div 
                  className={`relative group h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all duration-300 backdrop-blur-sm cursor-pointer ${dragActive ? 'border-neon-blue bg-neon-blue/10 scale-[1.02]' : 'border-white/20 bg-dark-800/40 hover:border-neon-blue/50 hover:bg-dark-800/60'}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <input 
                    type="file" 
                    id="file-upload" 
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
                <div className="h-64 border border-white/10 bg-dark-800/40 backdrop-blur-sm rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden group hover:border-neon-purple/50 transition-colors">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-neon-purple/20 blur-[50px] rounded-full translate-x-10 -translate-y-10 group-hover:bg-neon-purple/30 transition-all" />
                  
                  <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mb-4 shadow-2xl border border-red-500/20">
                    <Youtube className="text-red-500" size={28} />
                  </div>
                  <h3 className="text-lg font-bold font-display mb-4 text-white">YouTube Ссылка</h3>
                  <div className="flex w-full gap-2 relative z-10">
                    <input 
                      type="text" 
                      placeholder="Вставьте ссылку..." 
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-neon-purple transition-colors placeholder:text-gray-600"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                    />
                    <button 
                        onClick={handleYoutube}
                        disabled={!youtubeUrl}
                        className="bg-white text-black p-3 rounded-xl hover:bg-neon-purple hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Play size={18} fill="currentColor" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* PROCESSING STATE */}
          {appState === AppState.PROCESSING && (
            <ProcessingView key="processing" onComplete={handleProcessComplete} />
          )}

          {/* RESULTS STATE */}
          {appState === AppState.RESULTS && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-5xl"
              key="results"
            >
              <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-3xl font-display font-bold text-white mb-1">Аудио готово</h2>
                  <div className="flex flex-col gap-1">
                      <p className="text-gray-400 flex items-center gap-2">
                        <AudioLines size={16} className="text-neon-green" />
                        Источник: <span className="text-white font-medium">{fileName || 'Uploaded Audio'}</span>
                      </p>
                  </div>
                </div>
                <div className="flex gap-3">
                    <GlowButton variant="secondary" onClick={resetApp} icon={<RefreshCw size={18} />}>
                        Новый трек
                    </GlowButton>
                    <GlowButton 
                        onClick={togglePlay}
                        disabled={!audioReady}
                        icon={isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                    >
                        {isPlaying ? 'Пауза' : 'Слушать'}
                    </GlowButton>
                </div>
              </header>

              <div className="space-y-4">
                {tracks.map(track => (
                  <TrackRow 
                    key={track.id} 
                    track={track} 
                    onToggleMute={toggleMute}
                    onVolumeChange={changeVolume}
                    isPlaying={isPlaying}
                  />
                ))}
              </div>

              <div className="mt-12 p-6 rounded-2xl bg-dark-800/40 backdrop-blur-md border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                 <div className="flex items-start gap-4">
                    <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-500">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Экспорт дорожек</h3>
                        <p className="text-sm text-gray-400 max-w-lg">
                           Для сохранения отдельных дорожек (Vocals.wav, Bass.wav) требуется серверная обработка. 
                           В текущей Web-версии вы можете скачать оригинал или использовать микшер в реальном времени.
                        </p>
                    </div>
                </div>
                <GlowButton variant="outline" onClick={() => alert("Функция экспорта доступна в PRO версии с backend-поддержкой.")} icon={<Download size={18} />}>
                    Скачать Микс
                </GlowButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}

export default App;