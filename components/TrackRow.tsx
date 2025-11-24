import React from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Download, Music2, Mic2, Disc, Drum } from 'lucide-react';
import { AudioTrack } from '../types';
import { Visualizer } from './Visualizer';

interface TrackRowProps {
  track: AudioTrack;
  onToggleMute: (id: string) => void;
  onVolumeChange: (id: string, val: number) => void;
  isPlaying: boolean;
}

const getIcon = (name: string) => {
    switch(name.toLowerCase()) {
        case 'vocals': return <Mic2 size={20} />;
        case 'drums': return <Drum size={20} />;
        case 'bass': return <Music2 size={20} />;
        default: return <Disc size={20} />;
    }
}

export const TrackRow: React.FC<TrackRowProps> = ({ track, onToggleMute, onVolumeChange, isPlaying }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-dark-700/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 group hover:border-white/20 transition-all"
    >
      {/* Icon & Name */}
      <div className="flex items-center gap-4 min-w-[150px]">
        <div className="p-3 rounded-lg" style={{ backgroundColor: `${track.color}20`, color: track.color }}>
            {getIcon(track.name)}
        </div>
        <span className="font-display font-bold text-lg text-white tracking-wide">{track.name}</span>
      </div>

      {/* Visualizer Area */}
      <div className="flex-1 h-12 w-full bg-black/40 rounded-lg overflow-hidden relative border border-white/5">
         <Visualizer isActive={isPlaying && !track.isMuted} color={track.color} />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 min-w-[200px] justify-end">
        <button 
            onClick={() => onToggleMute(track.id)}
            className={`p-2 rounded-full transition-colors ${track.isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white hover:bg-white/10'}`}
        >
            {track.isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        
        <input 
            type="range" 
            min="0" 
            max="100" 
            value={track.volume} 
            onChange={(e) => onVolumeChange(track.id, parseInt(e.target.value))}
            className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
            disabled={track.isMuted}
        />

        <button 
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-neon-blue/20 hover:text-neon-blue border border-white/10 hover:border-neon-blue/50 transition-all text-xs font-bold uppercase tracking-wider opacity-50 cursor-not-allowed"
            title="Экспорт доступен в полной версии"
        >
            <Download size={16} />
            <span className="hidden md:inline">WAV</span>
        </button>
      </div>
    </motion.div>
  );
};