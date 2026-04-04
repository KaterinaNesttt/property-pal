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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(56,189,248,0.14),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.78),rgba(2,6,23,0.96))]" />
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-slate-950/40 to-transparent" />
    </div>
  );
};

export default AnimatedBackground;
