import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Sparkline } from "./Sparkline";
import { AnimatedNumber } from "./AnimatedNumber";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: number;
  format?: (n: number) => string;
  trend?: number; // percent
  spark?: number[];
  color?: string;
  delay?: number;
}

export function MetricCard({ icon: Icon, label, value, format, trend, spark, color = "hsl(var(--accent))", delay = 0 }: Props) {
  const TrendIcon = trend === undefined ? null : trend > 2 ? TrendingUp : trend < -2 ? TrendingDown : Minus;
  const trendColor = trend === undefined ? "" : trend > 2 ? "text-emerald" : trend < -2 ? "text-destructive" : "text-muted-foreground";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="glass rounded-2xl p-3 relative overflow-hidden">
        <div className="flex items-start justify-between mb-1.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          {TrendIcon && (
            <div className={`flex items-center gap-0.5 text-[10px] font-medium ${trendColor}`} dir="ltr">
              <TrendIcon className="w-3 h-3" />
              <span>{Math.abs(trend!)}%</span>
            </div>
          )}
        </div>
        <div className="text-base font-bold tabular-nums leading-tight">
          <AnimatedNumber value={value} format={format} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
        {spark && spark.length > 1 && (
          <div className="mt-1.5 -mx-1">
            <Sparkline data={spark} color={color} width={120} height={22} />
          </div>
        )}
      </Card>
    </motion.div>
  );
}
