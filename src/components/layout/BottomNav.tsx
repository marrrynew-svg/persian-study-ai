import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SECTIONS, getActiveSection } from "@/lib/navigation";

export function BottomNav() {
  const { pathname } = useLocation();
  const active = getActiveSection(pathname);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border/50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {SECTIONS.map(({ key, path, icon: Icon, label }) => {
          const isActive = active.key === key;
          return (
            <Link
              key={key}
              to={path}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-colors relative flex-1 min-w-0",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-1 w-8 h-1 rounded-full gradient-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[9px] font-medium truncate w-full text-center">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
