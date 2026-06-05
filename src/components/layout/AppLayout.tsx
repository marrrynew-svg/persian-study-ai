import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { SectionTabs } from "./SectionTabs";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Ambient orbs */}
      <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="orb animate-float-orb" style={{ width: 320, height: 320, top: -80, right: -80, background: "hsl(var(--primary) / 0.35)" }} />
        <div className="orb animate-float-orb" style={{ width: 260, height: 260, bottom: 20, left: -60, background: "hsl(var(--accent) / 0.25)", animationDelay: "3s" }} />
      </div>
      <SectionTabs />
      <main className="safe-bottom pb-20 relative z-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
