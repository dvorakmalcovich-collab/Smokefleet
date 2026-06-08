import { useEffect, useRef } from 'react';

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  growth: number;
}

interface JointSmokeProps {
  color: string;
  intensity: number;
  active: boolean;
  angle: number; // to deflect smoke based on joint rotation
}

export default function JointSmoke({ color, intensity, active, angle }: JointSmokeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: SmokeParticle[] = [];

    // Scale canvas for retina displays
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
      // Handle simple hex strings
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 255, g: 255, b: 255 };
    };

    const rgb = hexToRgb(color);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (active && intensity > 0 && Math.random() < 0.15 * intensity) {
        // Spawn particle at the emitter point (bottom-middle or custom offset)
        // Let's assume the emitter is near the middle horizontally and bottom vertically
        const emitterX = canvas.width / 2;
        const emitterY = canvas.height * 0.8;

        // Angle deflection based on joint roll rotation (Z)
        const rad = (angle * Math.PI) / 180;
        const windX = Math.sin(rad) * 0.8;
        const windY = -Math.cos(rad) * 0.5;

        particles.push({
          x: emitterX + (Math.random() - 0.5) * 4,
          y: emitterY + (Math.random() - 0.5) * 4,
          vx: windX + (Math.random() - 0.5) * 0.6,
          vy: windY - 1.2 - Math.random() * 1.0,
          size: 4 + Math.random() * 4,
          alpha: 0.6 + Math.random() * 0.3,
          life: 0,
          maxLife: 60 + Math.random() * 40,
          growth: 0.2 + Math.random() * 0.3,
        });
      }

      // Update and draw particles
      particles = particles.filter((p) => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.size += p.growth;
        
        // Add a gentle side-to-side drift (wobble)
        p.vx += Math.sin(p.life * 0.1) * 0.05;

        // Fade out near end of life
        const ratio = p.life / p_maxLife(p);
        p.alpha = Math.max(0, 1 - ratio) * 0.7;

        if (p.life >= p_maxLife(p)) {
          return false;
        }

        // Render particle (smoky radial gradient or soft circles)
        ctx.save();
        ctx.beginPath();
        const grad = ctx.createRadialGradient(p.x, p.y, p.size * 0.1, p.x, p.y, p.size);
        grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.alpha * 0.6})`);
        grad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.alpha * 0.2})`);
        grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
        
        ctx.fillStyle = grad;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      animationId = requestAnimationFrame(render);
    };

    // Helper to bypass typescript warning
    const p_maxLife = (p: SmokeParticle) => p.maxLife;

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [color, intensity, active, angle]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
      style={{ mixBlendMode: 'screen' }}
      id="joint-smoke-canvas"
    />
  );
}
