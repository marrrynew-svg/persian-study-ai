import { AppLayout } from "./AppLayout";
import { Sparkles, LucideIcon } from "lucide-react";

interface Props {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export function ComingSoon({ title, description, icon: Icon = Sparkles }: Props) {
  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-12">
        <div className="glass rounded-3xl p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl gradient-primary flex items-center justify-center">
            <Icon className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
          <div className="inline-flex items-center gap-2 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>به‌زودی</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}