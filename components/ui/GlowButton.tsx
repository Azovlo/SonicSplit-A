import React from 'react';
import { motion } from 'framer-motion';

interface GlowButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export const GlowButton: React.FC<GlowButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '',
  disabled = false,
  icon
}) => {
  const baseStyles = "relative px-8 py-4 rounded-xl font-display font-bold text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 group overflow-hidden";
  
  const variants = {
    primary: "bg-white text-black hover:bg-neon-blue hover:text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(0,243,255,0.6)]",
    secondary: "bg-transparent border border-white/20 text-white hover:border-neon-purple hover:text-neon-purple hover:shadow-[0_0_20px_rgba(188,19,254,0.3)]",
    outline: "border-2 border-white/10 text-white/60 hover:text-white hover:border-white/40"
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
    >
      <span className="relative z-10 flex items-center gap-2">
        {icon}
        {children}
      </span>
      {variant === 'primary' && !disabled && (
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12" />
      )}
    </motion.button>
  );
};