import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  color?: string;
}

export const Visualizer: React.FC<VisualizerProps> = ({ analyser, isActive, color = '#00f3ff' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bars = 48;
    let fakeTime = 0;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barW = canvas.width / bars;
      const dataArray = new Uint8Array(bars);

      if (analyser && isActive) {
        analyser.getByteFrequencyData(dataArray);
      } else if (isActive) {
        fakeTime += 0.05;
        for (let i = 0; i < bars; i++) {
          dataArray[i] = Math.max(8,
            (Math.sin(i * 0.25 + fakeTime) * Math.cos(i * 0.1 - fakeTime * 0.7) * 0.5 + 0.5) * 180);
        }
      } else {
        dataArray.fill(4);
      }

      for (let i = 0; i < bars; i++) {
        const h = (dataArray[i] / 255) * canvas.height;
        const grad = ctx.createLinearGradient(0, canvas.height - h, 0, canvas.height);
        grad.addColorStop(0, color + 'dd');
        grad.addColorStop(1, color + '33');
        ctx.fillStyle = grad;
        ctx.fillRect(i * barW + 1, canvas.height - h, barW - 2, h);
      }
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, isActive, color]);

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={48}
      className="w-full h-full"
    />
  );
};