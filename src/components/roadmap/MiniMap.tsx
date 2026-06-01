import type { MapNode } from "@/lib/worldBuilder";
import { WORLD_HEIGHT, WORLD_WIDTH, buildSmoothPath, currentNodeIndex } from "@/lib/worldBuilder";

export function MiniMap({
  nodes, panTarget, onJump,
}: {
  nodes: MapNode[];
  panTarget?: { x: number; y: number };
  onJump: (worldX: number, worldY: number) => void;
}) {
  const W = 160; const H = 200;
  const sx = W / WORLD_WIDTH; const sy = H / WORLD_HEIGHT;
  const path = buildSmoothPath(nodes);
  const curIdx = currentNodeIndex(nodes);
  const cur = nodes[curIdx];

  return (
    <div
      className="fixed bottom-24 left-3 z-30 rounded-xl border overflow-hidden backdrop-blur-md"
      style={{
        width: W, height: H,
        background: "rgba(4,3,10,0.85)",
        borderColor: "rgba(124,58,237,0.25)",
      }}
    >
      <div className="px-2 py-1 text-[10px] text-muted-foreground border-b border-white/5">نقشه کوچک</div>
      <svg
        viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-[calc(100%-20px)] cursor-crosshair"
        onClick={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width;
          const py = (e.clientY - rect.top) / rect.height;
          onJump(px * WORLD_WIDTH, py * WORLD_HEIGHT);
        }}
      >
        <path d={path} fill="none" stroke="rgba(124,58,237,0.5)" strokeWidth={6} />
        {nodes.map((n) => (
          <circle
            key={n.id}
            cx={n.position.x} cy={n.position.y}
            r={n.kind === "finish" ? 22 : n.kind === "boss" ? 18 : 14}
            fill={
              n.status === "completed" ? "#7c3aed" :
              n.status === "current" ? "#06b6d4" : "rgba(255,255,255,0.18)"
            }
          />
        ))}
        {cur && (
          <circle cx={cur.position.x} cy={cur.position.y} r={28} fill="none" stroke="#06b6d4" strokeWidth={4}>
            <animate attributeName="r" values="22;36;22" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0;1" dur="1.6s" repeatCount="indefinite" />
          </circle>
        )}
        {panTarget && (
          <rect
            x={panTarget.x - 200} y={panTarget.y - 280}
            width={400} height={560}
            fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={4} strokeDasharray="14 10"
          />
        )}
      </svg>
    </div>
  );
}