import videoSrc from "@/assets/0331.mp4";

const AnimatedBackground = () => {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <video
        autoPlay
        className="absolute inset-0 h-full w-full object-cover"
        loop
        muted
        playsInline
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
      
      <div className="absolute inset-x-0 top-0 h-48" />
    </div>
  );
};

export default AnimatedBackground;
