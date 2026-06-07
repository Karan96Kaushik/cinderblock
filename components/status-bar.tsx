'use client';

import { useState, useEffect } from 'react';

export function StatusBar() {
  const [time, setTime] = useState<string>('');
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCoords({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-sm border-t border-border px-4 py-2 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between font-mono text-xs text-muted-foreground">
        <div className="flex items-center gap-6">
          <span className="text-neon-orange">SYS_TIME:</span>
          <span className="tabular-nums">{time}</span>
        </div>
        
        <div className="hidden sm:flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-neon-orange">CURSOR_POS:</span>
            <span className="tabular-nums">X:{coords.x.toString().padStart(4, '0')}</span>
            <span className="tabular-nums">Y:{coords.y.toString().padStart(4, '0')}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-orange animate-fire" />
            <span className="text-neon-orange">CONNECTED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
