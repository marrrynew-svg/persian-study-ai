import { cn } from "@/lib/utils";
import { forwardRef, HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  glow?: "violet" | "cyan" | "pink" | "none";
  intense?: boolean;
}

const GLOW: Record<string, string> = {
  violet: "before:bg-[radial-gradient(circle_at_30%_0%,hsl(265_100%_65%/0.35),transparent_60%)]",
  cyan: "before:bg-[radial-gradient(circle_at_70%_0%,hsl(188_100%_55%/0.30),transparent_60%)]",
  pink: "before:bg-[radial-gradient(circle_at_50%_0%,hsl(320_100%_65%/0.30),transparent_60%)]",
  none: "before:hidden",
};

export const GlassCard = forwardRef<HTMLDivElement, Props>(
  ({ className, glow = "violet", intense, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl",
          "shadow-[0_10px_40px_-12px_rgba(124,58,237,0.35)]",
          "before:absolute before:inset-0 before:pointer-events-none before:opacity-70",
          GLOW[glow],
          intense && "bg-white/[0.07] border-white/20",
          className,
        )}
        {...rest}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="relative">{children}</div>
      </div>
    );
  },
);
GlassCard.displayName = "GlassCard";