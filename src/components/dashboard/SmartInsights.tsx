import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface Props {
  insights: string[];
}

export function SmartInsights({ insights }: Props) {
  if (!insights.length) return null;
  return (
    <Card className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg gradient-accent flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-accent-foreground" />
        </div>
        <h3 className="text-sm font-semibold">بینش هوشمند</h3>
      </div>
      <div className="space-y-2">
        {insights.map((text, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-start gap-2 bg-muted/40 rounded-xl px-3 py-2"
          >
            <div className="w-1 h-1 rounded-full bg-accent mt-2 shrink-0" />
            <p className="text-xs leading-relaxed flex-1">{text}</p>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
