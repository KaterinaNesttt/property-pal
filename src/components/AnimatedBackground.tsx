const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Animated orbs */}
      <div
        className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full animate-pulse-slow opacity-30"
        style={{
          background: 'radial-gradient(circle, hsl(175 70% 50% / 0.15), transparent 70%)',
          animation: 'float 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, hsl(220 60% 50% / 0.2), transparent 70%)',
          animation: 'float 10s ease-in-out infinite reverse',
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, hsl(280 50% 50% / 0.1), transparent 70%)',
          animation: 'float 12s ease-in-out infinite 2s',
        }}
      />

      {/* Noise overlay */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
