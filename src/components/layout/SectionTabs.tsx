import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getActiveSection } from "@/lib/navigation";

export function SectionTabs() {
  const { pathname } = useLocation();
  const section = getActiveSection(pathname);
  if (section.subs.length <= 1) return null;

  return (
    <div className="sticky top-0 z-40 glass-strong border-b border-border/50">
      <div className="max-w-lg mx-auto overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 px-3 py-2 min-w-max">
          {section.subs.map(({ path, label, icon: Icon }) => {
            const isActive = pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                  isActive
                    ? "gradient-primary text-primary-foreground shadow-md"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}