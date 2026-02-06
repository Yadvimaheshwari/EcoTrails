'use client';

import { useEffect, useState, useRef } from 'react';

interface BackgroundSystemProps {
  context?: 'hike' | 'journal' | 'discovery' | 'profile' | 'default';
  userPhotos?: string[];
  favoriteTerrain?: string;
  children: React.ReactNode;
}

export function BackgroundSystem({ 
  context = 'default', 
  userPhotos = [],
  favoriteTerrain,
  children 
}: BackgroundSystemProps) {
  const [timeOfDay, setTimeOfDay] = useState<'sunrise' | 'day' | 'sunset' | 'night'>('day');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const updateTimeOfDay = () => {
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 8) setTimeOfDay('sunrise');
      else if (hour >= 8 && hour < 18) setTimeOfDay('day');
      else if (hour >= 18 && hour < 20) setTimeOfDay('sunset');
      else setTimeOfDay('night');
    };

    updateTimeOfDay();
    const interval = setInterval(updateTimeOfDay, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (context !== 'hike' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
    }> = [];

    // Create subtle particles
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.3 + 0.1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(79, 138, 107, ${particle.opacity})`;
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [context]);

  const getGradientColors = () => {
    switch (timeOfDay) {
      case 'sunrise':
        return { from: '#FFF8F0', to: '#FFE5CC' };
      case 'day':
        return { from: '#F6F8F7', to: '#E8F4F8' };
      case 'sunset':
        return { from: '#FFF8F0', to: '#FFD4A3' };
      case 'night':
        return { from: '#1B1F1E', to: '#2A2E2D' };
      default:
        return { from: '#F6F8F7', to: '#E8F4F8' };
    }
  };

  const getContextBackground = () => {
    switch (context) {
      case 'journal':
        if (userPhotos.length > 0) {
          return {
            backgroundImage: `linear-gradient(to bottom, ${getGradientColors().from}dd, ${getGradientColors().to}dd), url(${userPhotos[0]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundBlendMode: 'overlay',
            filter: 'blur(20px)',
          };
        }
        return {
          background: `linear-gradient(135deg, ${getGradientColors().from} 0%, ${getGradientColors().to} 100%)`,
        };
      case 'hike':
        return {
          background: `linear-gradient(135deg, ${getGradientColors().from} 0%, ${getGradientColors().to} 100%)`,
          position: 'relative' as const,
        };
      case 'discovery':
        return {
          background: `linear-gradient(135deg, #F0F8F0 0%, #E8F4E8 100%)`,
        };
      case 'profile':
        const terrainColors: Record<string, { from: string; to: string }> = {
          mountain: { from: '#E8E8E3', to: '#D3D3D3' },
          forest: { from: '#F0F8F0', to: '#E0F0E0' },
          desert: { from: '#FFF8F0', to: '#FFE5CC' },
          coastal: { from: '#E8F4F8', to: '#D0E8F0' },
        };
        const colors = terrainColors[favoriteTerrain || 'mountain'] || terrainColors.mountain;
        return {
          background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
        };
      default:
        return {
          background: `linear-gradient(135deg, ${getGradientColors().from} 0%, ${getGradientColors().to} 100%)`,
        };
    }
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden transition-all duration-1000"
      style={getContextBackground()}
    >
      {/* Subtle topographic pattern overlay for hike context */}
      {context === 'hike' && (
        <>
          <div 
            className="absolute inset-0 opacity-[0.05] topo-texture pointer-events-none"
            style={{ mixBlendMode: 'multiply' }}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ opacity: 0.3 }}
          />
        </>
      )}

      {/* Blurred photo mosaic for journal */}
      {context === 'journal' && userPhotos.length > 0 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="grid grid-cols-4 gap-2 opacity-20 blur-3xl scale-150">
            {userPhotos.slice(0, 8).map((photo, idx) => (
              <div
                key={idx}
                className="aspect-square rounded-lg overflow-hidden"
                style={{
                  backgroundImage: `url(${photo})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
