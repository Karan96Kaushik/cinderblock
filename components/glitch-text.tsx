'use client';

interface GlitchTextProps {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'span' | 'p';
}

export function GlitchText({ children, className = '', as: Component = 'span' }: GlitchTextProps) {
  return (
    <Component 
      className={`relative inline-block animate-glitch ${className}`}
      data-text={typeof children === 'string' ? children : undefined}
    >
      {children}
    </Component>
  );
}
