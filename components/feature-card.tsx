'use client';

interface FeatureCardProps {
  title: string;
  description: string;
  index: number;
}

export function FeatureCard({ title, description, index }: FeatureCardProps) {
  return (
    <div className="group relative p-6 bg-card/50 border border-border rounded-lg hover:border-neon-orange/60 transition-all duration-300">
      {/* Index number */}
      <div className="absolute -top-3 -left-3 w-8 h-8 bg-background border border-neon-orange/70 flex items-center justify-center">
        <span className="font-mono text-sm text-neon-orange">{String(index).padStart(2, '0')}</span>
      </div>

      {/* Content */}
      <div className="pt-2">
        <h3 className="font-sans text-lg uppercase tracking-wider text-foreground mb-3 group-hover:fire-gradient-text transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground font-mono leading-relaxed">
          {description}
        </p>
      </div>

      {/* Hover effect line — fire gradient */}
      <div className="absolute bottom-0 left-0 h-[2px] w-0 fire-gradient group-hover:w-full transition-all duration-500" />
    </div>
  );
}
