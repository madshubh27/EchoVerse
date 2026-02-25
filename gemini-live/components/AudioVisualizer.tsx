
import React, { useRef, useEffect, useCallback } from 'react';

interface AudioVisualizerProps {
  active: boolean;
  analyserNode?: AnalyserNode | null;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ active, analyserNode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const barCount = 24;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const barWidth = width / barCount - 2;
    const centerY = height / 2;

    if (active && analyserNode) {
      const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
      analyserNode.getByteFrequencyData(dataArray);

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * dataArray.length);
        const value = dataArray[dataIndex] / 255;
        const barHeight = Math.max(3, value * (height * 0.8));

        const hue = 220 + (i / barCount) * 30;
        const alpha = 0.6 + value * 0.4;
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;

        const x = i * (barWidth + 2) + 1;
        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, 2);
        ctx.fill();
      }
    } else if (active) {
      // Fallback animation when no analyser
      const time = Date.now() / 1000;
      for (let i = 0; i < barCount; i++) {
        const value = Math.sin(time * 3 + i * 0.5) * 0.3 + 0.4;
        const barHeight = Math.max(3, value * (height * 0.6));
        ctx.fillStyle = `hsla(220, 70%, 60%, ${0.5 + value * 0.3})`;
        const x = i * (barWidth + 2) + 1;
        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, 2);
        ctx.fill();
      }
    } else {
      // Idle state — flat bars
      for (let i = 0; i < barCount; i++) {
        ctx.fillStyle = 'hsla(220, 10%, 70%, 0.3)';
        const x = i * (barWidth + 2) + 1;
        ctx.beginPath();
        ctx.roundRect(x, centerY - 1.5, barWidth, 3, 1);
        ctx.fill();
      }
    }

    animationRef.current = requestAnimationFrame(draw);
  }, [active, analyserNode]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={80}
      className="w-full h-full"
    />
  );
};

export default AudioVisualizer;
