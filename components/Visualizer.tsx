import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isActive: boolean;
  color?: string;
}

export const Visualizer: React.FC<VisualizerProps> = ({ isActive, color = '#00f3ff' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const bars = 60;
    const barWidth = canvas.width / bars;
    
    // Simulate audio data
    const dataArray = new Uint8Array(bars);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (isActive) {
        // Generate pseudo-random "audio" data that looks smooth
        const time = Date.now() / 200;
        for (let i = 0; i < bars; i++) {
          const noise = Math.sin(i * 0.2 + time) * Math.cos(i * 0.1 - time) * 0.5 + 0.5;
          dataArray[i] = Math.max(10, noise * 200); 
        }
      } else {
         dataArray.fill(2); // Flat line
      }

      for (let i = 0; i < bars; i++) {
        const barHeight = dataArray[i] * 0.5; // Scale down
        
        // Gradient
        const gradient = ctx.createLinearGradient(0, canvas.height / 2 - barHeight, 0, canvas.height / 2 + barHeight);
        gradient.addColorStop(0, `${color}00`);
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, `${color}00`);

        ctx.fillStyle = gradient;
        
        // Draw mirrored wave
        const x = i * barWidth;
        const y = (canvas.height - barHeight) / 2;
        
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - 2, barHeight, 4);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={600} 
      height={100} 
      className="w-full h-full object-contain opacity-80"
    />
  );
};