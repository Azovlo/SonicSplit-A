import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Server, Radio, CheckCircle2, Loader2 } from 'lucide-react';
import { ProcessingStep } from '../types';

interface ProcessingViewProps {
  onComplete: () => void;
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({ onComplete }) => {
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: 1, label: "Анализ спектрограммы...", completed: false },
    { id: 2, label: "Разделение вокала и инструментов...", completed: false },
    { id: 3, label: "Очистка аудиодорожек...", completed: false },
    { id: 4, label: "Рендеринг финальных файлов...", completed: false },
  ]);

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate progress
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 0.5;
      });
    }, 30);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Trigger steps based on progress
    if (progress > 10) markComplete(1);
    if (progress > 40) markComplete(2);
    if (progress > 70) markComplete(3);
    if (progress >= 100) {
      markComplete(4);
      setTimeout(onComplete, 1000);
    }
  }, [progress, onComplete]);

  const markComplete = (id: number) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, completed: true } : s));
  };

  return (
    <div className="w-full max-w-2xl mx-auto min-h-[500px] flex flex-col items-center justify-center p-8 bg-dark-800/50 backdrop-blur-xl border border-white/5 rounded-3xl relative overflow-hidden">
      
      {/* Background Grid Animation */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] animate-[pulse_4s_ease-in-out_infinite]" />

      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 flex flex-col items-center w-full"
      >
        <div className="relative w-32 h-32 mb-12 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full animate-spin-slow text-dark-700" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="10 10" />
            </svg>
             <svg className="absolute inset-0 w-full h-full -rotate-90 text-neon-blue drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]" viewBox="0 0 100 100">
                <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="4" 
                    strokeDasharray="283" 
                    strokeDashoffset={283 - (283 * progress) / 100}
                    strokeLinecap="round"
                />
            </svg>
            <Cpu className="w-12 h-12 text-white animate-pulse" />
        </div>

        <h2 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2">
            AI PROCESSING
        </h2>
        <p className="text-neon-blue font-mono text-sm mb-8">{progress.toFixed(0)}% COMPLETED</p>

        <div className="w-full space-y-4">
            {steps.map((step) => (
                <motion.div 
                    key={step.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: step.id * 0.2 }}
                    className={`flex items-center justify-between p-4 rounded-xl border ${step.completed ? 'bg-neon-blue/10 border-neon-blue/30' : 'bg-white/5 border-white/5'}`}
                >
                    <div className="flex items-center gap-3">
                        {step.id === 1 && <Server size={18} className={step.completed ? "text-neon-blue" : "text-gray-500"} />}
                        {step.id === 2 && <Radio size={18} className={step.completed ? "text-neon-blue" : "text-gray-500"} />}
                        {step.id === 3 && <Cpu size={18} className={step.completed ? "text-neon-blue" : "text-gray-500"} />}
                        {step.id === 4 && <CheckCircle2 size={18} className={step.completed ? "text-neon-blue" : "text-gray-500"} />}
                        <span className={`font-medium ${step.completed ? "text-white" : "text-gray-400"}`}>{step.label}</span>
                    </div>
                    {step.completed ? (
                        <CheckCircle2 className="text-neon-blue" size={20} />
                    ) : (
                        step.id === Math.ceil((progress / 100) * 4) ? <Loader2 className="animate-spin text-white/50" size={20} /> : null
                    )}
                </motion.div>
            ))}
        </div>
      </motion.div>
    </div>
  );
};