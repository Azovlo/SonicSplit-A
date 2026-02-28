import React from 'react';
import { motion } from 'framer-motion';
import { Cpu } from 'lucide-react';

interface ProcessingViewProps {
  step: string;
  pct: number;
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({ step, pct }) => {
  return (
    <div className="w-full max-w-2xl mx-auto min-h-[420px] flex flex-col items-center justify-center p-8 bg-dark-800/50 backdrop-blur-xl border border-white/5 rounded-3xl relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 flex flex-col items-center w-full"
      >
        {/* Ring progress */}
        <div className="relative w-32 h-32 mb-10 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#1a1a1a" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke="#00f3ff"
              strokeWidth="6"
              strokeDasharray="283"
              strokeDashoffset={283 - (283 * pct) / 100}
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(0,243,255,0.6)] transition-all duration-300"
            />
          </svg>
          <Cpu className="w-12 h-12 text-white animate-pulse" />
        </div>

        <h2 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2">
          AI PROCESSING
        </h2>
        <p className="text-neon-blue font-mono text-sm mb-6">{pct.toFixed(0)}% COMPLETED</p>

        {/* Step label */}
        <div className="w-full bg-neon-blue/10 border border-neon-blue/30 rounded-xl p-4 flex items-center justify-between">
          <span className="text-white font-medium text-sm">{step || 'Инициализация...'}</span>
          <span className="text-neon-blue font-mono text-xs">{pct.toFixed(0)}%</span>
        </div>

        {/* Progress bar */}
        <div className="w-full mt-4 h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-blue to-neon-purple rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </motion.div>
    </div>
  );
};