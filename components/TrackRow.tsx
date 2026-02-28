import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Download, Mic2, Disc, Drum, Music2 } from 'lucide-react';
import { AudioTrack } from '../types';

interface TrackRowProps {
  track: AudioTrack;
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
  onVolumeChange: (id: string, val: number) => void;
  onExport: (id: string, name: string) => void;
}

const getIcon = (name: string) => {
    switch(name.toLowerCase()) {
        case 'vocals': return <Mic2 size={20} />;
        case 'drums': return <Drum size={20} />;
        case 'bass': return <Music2 size={20} />;
        default: return <Disc size={20} />;
    }
}

const MiniVisualizer = ({ analyser, color, isPlaying }: { analyser: AnalyserNode | null, color: string, isPlaying: boolean }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const draw = () => {
            rafRef.current = requestAnimationFrame(draw);
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            if (!analyser || !isPlaying) {
                ctx.beginPath();
                ctx.strokeStyle = color + '40';
                ctx.lineWidth = 2;
                ctx.moveTo(0, h/2);
                ctx.lineTo(w, h/2);
                ctx.stroke();
                return;
            }

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteTimeDomainData(dataArray);

            ctx.lineWidth = 2;
            ctx.strokeStyle = color;
            ctx.beginPath();

            const sliceWidth = w / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * (h / 2);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                x += sliceWidth;
            }
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        };
        draw();
        return () => cancelAnimationFrame(rafRef.current);
    }, [analyser, color, isPlaying]);

    return <canvas ref={canvasRef} width={300} height={48} className="w-full h-full" />;
};

export const TrackRow: React.FC<TrackRowProps> = ({ 
    track, analyser, isPlaying, onToggleMute, onToggleSolo, onVolumeChange, onExport 
}) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full backdrop-blur-md border rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 transition-all
        ${track.isSolo ? 'bg-neon-blue/10 border-neon-blue/50 shadow-[0_0_15px_rgba(0,243,255,0.1)]' : 'bg-dark-700/50 border-white/5 hover:border-white/20'}
      `}
    >
      <div className="flex items-center gap-4 min-w-[150px]">
        <div className={`p-3 rounded-lg transition-colors ${track.isMuted ? 'opacity-50 grayscale' : ''}`} style={{ backgroundColor: `${track.color}20`, color: track.color }}>
            {getIcon(track.name)}
        </div>
        <div className="flex flex-col">
            <span className="font-display font-bold text-lg text-white tracking-wide">{track.name}</span>
            <span className="text-xs text-gray-500 font-mono">STEM</span>
        </div>
      </div>

      <div className="flex-1 h-12 w-full bg-black/40 rounded-lg overflow-hidden relative border border-white/5">
         <MiniVisualizer analyser={analyser} color={track.color} isPlaying={isPlaying && !track.isMuted} />
      </div>

      <div className="flex items-center gap-3 min-w-[240px] justify-end">
        <button 
            onClick={() => onToggleSolo(track.id)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs transition-all border
                ${track.isSolo 
                    ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' 
                    : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'}
            `}
            title="Solo (S)"
        >
            S
        </button>

        <button 
            onClick={() => onToggleMute(track.id)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all border
                ${track.isMuted 
                    ? 'bg-red-500/20 text-red-400 border-red-500/20' 
                    : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'}
            `}
            title="Mute (M)"
        >
            {track.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        
        <div className="relative group flex items-center">
            <input 
                type="range" 
                min="0" 
                max="100" 
                value={track.volume} 
                onChange={(e) => onVolumeChange(track.id, parseInt(e.target.value))}
                className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-neon-blue transition-all"
                disabled={track.isMuted}
            />
        </div>

        <button 
            onClick={() => onExport(track.id, track.name)}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-neon-green/20 hover:text-neon-green border border-white/10 hover:border-neon-green/50 transition-all text-gray-400"
            title="Export WAV"
        >
            <Download size={16} />
        </button>
      </div>
    </motion.div>
  );
};