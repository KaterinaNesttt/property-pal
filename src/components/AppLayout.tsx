import { ReactNode } from "react";
import MobileNav from "./MobileNav";
import DesktopSidebar from "./DesktopSidebar";
import AnimatedBackground from "./AnimatedBackground";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen flex w-full overflow-x-hidden">
      <AnimatedBackground />
      <DesktopSidebar />
      <main className="flex-1 flex flex-col min-h-screen">
        <div className="flex-1 px-3 py-6 md:px-8 md:py-8 pb-24 md:pb-8">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default AppLayout;
