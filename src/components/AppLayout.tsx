import { ReactNode } from "react";
import AnimatedBackground from "./AnimatedBackground";
import MobileNav from "./MobileNav";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <AnimatedBackground />
      <main className="relative z-10 min-h-screen px-4 pb-36 pt-[calc(env(safe-area-inset-top)+1.5rem)] md:px-8 md:py-8 md:pb-40">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
      <MobileNav />
    </div>
  );
};

export default AppLayout;
