import { AlertTriangle, CheckCircle2, Flame, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RiskLevel } from "@/lib/planino/v2/types";
import { recommendedActions } from "@/lib/planino/v2/planBuilder";

const META: Record<RiskLevel, { color: string; bg: string; label: string; Icon: any }> = {
  green: { color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", label: "وضعیت سبز · کاملاً می‌رسی", Icon: CheckCircle2 },
  yellow: { color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/30", label: "وضعیت زرد · برنامه فشرده", Icon: Zap },
  orange: { color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/30", label: "وضعیت نارنجی · حذف هوشمند", Icon: Flame },
  red: { color: "text-red-500", bg: "bg-red-500/10 border-red-500/30", label: "وضعیت قرمز · اولویت‌بندی شدید", Icon: AlertTriangle },
};

export function DiagnosisCard({
  risk, daysLeft, dailyNeed, dailyCap, totalRequired, totalAvailable,
}: {
  risk: RiskLevel; daysLeft: number; dailyNeed: number; dailyCap: number;
  totalRequired: number; totalAvailable: number;
}) {
  const m = META[risk];
  const Icon = m.Icon;
  return (
    <Card className={`p-4 border ${m.bg} rounded-2xl`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${m.color}`} />
        <h3 className={`font-bold ${m.color}`}>{m.label}</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat label="روز تا آزمون" value={`${daysLeft}`} />
        <Stat label="نیاز روزانه" value={`${dailyNeed} دقیقه`} />
        <Stat label="ظرفیت روزانه" value={`${dailyCap} دقیقه`} />
        <Stat label="کل ساعت لازم" value={`${Math.round(totalRequired / 60)}h`} />
        <Stat label="کل ساعت موجود" value={`${Math.round(totalAvailable / 60)}h`} />
      </div>
      <div className="mt-3 space-y-1">
        {recommendedActions(risk).map((a, i) => (
          <Badge key={i} variant="outline" className="ml-1 mb-1 text-[10px]">{a}</Badge>
        ))}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/40 rounded-lg p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}