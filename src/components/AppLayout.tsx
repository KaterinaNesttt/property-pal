import { ReactNode } from "react";
import MobileNav from "./MobileNav";
import AnimatedBackground from "./AnimatedBackground";


interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen flex w-full overflow-x-hidden">
      <AnimatedBackground />
      <MobileNav />
      <main className="flex-1 flex flex-col min-h-screen min-w-0 lg:mt-0 mt-16">
        <div className="flex-1 px-3 py-6 md:px-8 md:py-8 pb-32 lg:pb-8 w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
