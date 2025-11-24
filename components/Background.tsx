import React, { useEffect, useRef } from 'react';

interface BackgroundProps {
  isPlaying: boolean;
}

export const Background: React.FC<BackgroundProps> = ({ isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let time = 0;
    
    // Configuration
    const lines = 40; // Number of horizontal lines
    const gap = height / lines;
    
    // Resize handler
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const render = () => {
      // Clear with trail effect for "liquid" feel
      ctx.fillStyle = 'rgba(5, 5, 5, 0.2)'; 
      ctx.fillRect(0, 0, width, height);

      // Speed control based on playing state
      const speed = isPlaying ? 0.05 : 0.01;
      const amplitude = isPlaying ? 50 : 20;
      time += speed;

      ctx.lineWidth = 2;

      for (let i = 0; i < lines; i++) {
        const y = (i * gap) + (gap / 2);
        
        // Gradient for each line
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, 'rgba(0, 243, 255, 0)');
        gradient.addColorStop(0.2, 'rgba(0, 243, 255, 0.1)');
        gradient.addColorStop(0.5, i % 2 === 0 ? 'rgba(0, 243, 255, 0.4)' : 'rgba(188, 19, 254, 0.4)');
        gradient.addColorStop(0.8, 'rgba(188, 19, 254, 0.1)');
        gradient.addColorStop(1, 'rgba(188, 19, 254, 0)');

        ctx.strokeStyle = gradient;
        ctx.beginPath();

        // Draw wave line
        for (let x = 0; x < width; x += 10) {
          // Interference pattern logic (sum of sines) to simulate water/sound
          const distanceFromCenter = Math.abs(x - width / 2) / width;
          const scale = 1 - Math.pow(distanceFromCenter, 2); // Dampen edges

          const noise1 = Math.sin(x * 0.003 + time + i * 0.1);
          const noise2 = Math.cos(x * 0.007 - time * 0.5 + i * 0.2);
          const noise3 = Math.sin(x * 0.01 + time * 1.5 + i * 0.05);

          const yOffset = (noise1 + noise2 + noise3) * amplitude * scale;
          
          // Add 3D-ish perspective tilt
          const perspectiveY = y + yOffset + (y - height/2) * 0.3;

          if (x === 0) {
            ctx.moveTo(x, perspectiveY);
          } else {
            ctx.lineTo(x, perspectiveY);
          }
        }
        ctx.stroke();
      }

      requestAnimationFrame(render);
    };

    const animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [isPlaying]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};