import { useEffect, useState } from "react";

interface Reward {
  id: string;
  title: string;
  xp: number;
}

export function RewardOverlay({ reward, onDone }: { reward: Reward | null; onDone: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!reward) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 400);
    }, 2400);
    return () => clearTimeout(t);
  }, [reward, onDone]);

  if (!reward) return null;

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s" }}
    >
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 60 }).map((_, i) => (
          <span
            key={i}
            className="absolute block"
            style={{
              left: `${Math.random() * 100}%`,
              top: "-10px",
              width: 8,
              height: 8,
              background: ["#7c3aed", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"][i % 5],
              borderRadius: i % 2 ? "50%" : "2px",
              animation: `confettiFall ${2 + Math.random() * 1.5}s ease-in ${Math.random() * 0.4}s forwards`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div
        className="rounded-3xl px-6 py-5 text-center backdrop-blur-xl border"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.95), rgba(6,182,212,0.95))",
          borderColor: "rgba(255,255,255,0.3)",
          boxShadow: "0 30px 80px rgba(124,58,237,0.6)",
          animation: "rewardPop 0.6s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <div className="text-4xl mb-2">🏆</div>
        <div className="text-white font-extrabold text-lg mb-1">نود کامل شد!</div>
        <div className="text-white/90 text-sm mb-2">{reward.title}</div>
        <div className="inline-block bg-white/20 rounded-full px-4 py-1 text-white font-bold">
          +{reward.xp} XP
        </div>
      </div>

      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes rewardPop {
          0%   { transform: scale(0.4); opacity: 0; }
          60%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}