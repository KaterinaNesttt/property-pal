import videoSrc from '@/assets/0331.mp4';

const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Video background */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        style={{
          filter: 'brightness(0.9) contrast(1.2) saturate(1.1)',
        }}
      >
        <source src={videoSrc} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Dark overlay for better text readability */}
      

      {/* Optional: Keep some subtle animated elements */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(180 80% 60% / 0.3), transparent 70%)',
            animation: 'float 15s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  );
};

export default AnimatedBackground;
