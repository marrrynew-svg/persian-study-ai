import { useEffect, useMemo, useRef, useState } from "react";
import {
  WORLD_HEIGHT, WORLD_WIDTH, buildSmoothPath, currentNodeIndex,
  generateWorldElements, getElementSize, hexPoints, starPath,
  type MapNode,
} from "@/lib/worldBuilder";
import { getLevelEmoji } from "@/lib/xpEngine";

interface Props {
  nodes: MapNode[];
  avatar: { level: number; glowColor: string };
  weatherShake?: boolean;
  onNodeClick?: (node: MapNode) => void;
}

export function AdventureMap({ nodes, avatar, weatherShake, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 360, h: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const lastPinch = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(() => {
      const r = containerRef.current!.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Auto-center on current node initially
  const curIdx = useMemo(() => currentNodeIndex(nodes), [nodes]);
  const curNode = nodes[curIdx];
  useEffect(() => {
    if (!curNode || size.w === 0) return;
    const scale = size.w / WORLD_WIDTH;
    setZoom(Math.max(0.5, Math.min(1.3, scale * 1.5)));
    setPan({
      x: size.w / 2 - curNode.position.x * Math.max(0.5, Math.min(1.3, scale * 1.5)),
      y: size.h / 2 - curNode.position.y * Math.max(0.5, Math.min(1.3, scale * 1.5)),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curNode?.id, size.w]);

  const elements = useMemo(() => generateWorldElements(nodes), [nodes]);
  const pathD = useMemo(() => buildSmoothPath(nodes), [nodes]);
  const completedRatio = useMemo(() => {
    let last = -1; nodes.forEach((n, i) => { if (n.status === "completed") last = i; });
    return Math.max(0, Math.min(1, (last + 0.5) / Math.max(1, nodes.length - 1)));
  }, [nodes]);

  // fog radius around current node — world units (grows w/ level)
  const fogRadius = 240 + avatar.level * 18;

  const onWheel: React.WheelEventHandler<SVGSVGElement> = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.4, Math.min(3, z * delta)));
  };

  const onMouseDown: React.MouseEventHandler<SVGSVGElement> = (e) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };
  const onMouseMove: React.MouseEventHandler<SVGSVGElement> = (e) => {
    if (!dragging) return;
    setPan({ x: dragStart.current.panX + (e.clientX - dragStart.current.x), y: dragStart.current.panY + (e.clientY - dragStart.current.y) });
  };
  const onMouseUp = () => setDragging(false);

  const onTouchStart: React.TouchEventHandler<SVGSVGElement> = (e) => {
    if (e.touches.length === 1) {
      setDragging(true);
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: pan.x, panY: pan.y };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinch.current = Math.hypot(dx, dy);
    }
  };
  const onTouchMove: React.TouchEventHandler<SVGSVGElement> = (e) => {
    if (e.touches.length === 2 && lastPinch.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const d = Math.hypot(dx, dy);
      const ratio = d / lastPinch.current;
      setZoom((z) => Math.max(0.4, Math.min(3, z * ratio)));
      lastPinch.current = d;
    } else if (dragging && e.touches.length === 1) {
      setPan({ x: dragStart.current.panX + (e.touches[0].clientX - dragStart.current.x), y: dragStart.current.panY + (e.touches[0].clientY - dragStart.current.y) });
    }
  };
  const onTouchEnd = () => { setDragging(false); lastPinch.current = null; };

  const resetView = () => {
    if (!curNode || size.w === 0) return;
    const scale = (size.w / WORLD_WIDTH) * 1.5;
    const z = Math.max(0.5, Math.min(1.3, scale));
    setZoom(z);
    setPan({ x: size.w / 2 - curNode.position.x * z, y: size.h / 2 - curNode.position.y * z });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden border border-white/5"
      style={{
        height: "min(75vh, 640px)",
        background:
          "radial-gradient(ellipse at 25% 75%, rgba(124,58,237,0.18) 0%, transparent 45%), " +
          "radial-gradient(ellipse at 75% 25%, rgba(6,182,212,0.12) 0%, transparent 40%), " +
          "#04030a",
        animation: weatherShake ? "mapShake 0.6s ease-in-out infinite" : undefined,
      }}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 select-none"
        width="100%" height="100%"
        style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab", direction: "ltr" }}
        onWheel={onWheel}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      >
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" />
          </pattern>
          <linearGradient id="pathGradientDone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="startGrad"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#06b6d4" /></linearGradient>
          <linearGradient id="doneGrad"><stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#06b6d4" /></linearGradient>
          <linearGradient id="finishGrad"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#ef4444" /></linearGradient>
          <linearGradient id="orbitGrad" x1="0" x2="1"><stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#06b6d4" /></linearGradient>

          <filter id="pathGlow"><feGaussianBlur stdDeviation="4" /></filter>
          <filter id="startGlow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="doneGlow"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="finishGlow"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="bossBlur"><feGaussianBlur stdDeviation="8" /></filter>

          <radialGradient id="avatarGlow">
            <stop offset="0%" stopColor={avatar.glowColor} stopOpacity="0.6" />
            <stop offset="100%" stopColor={avatar.glowColor} stopOpacity="0" />
          </radialGradient>

          {/* Fog mask: white = visible, black = fogged */}
          <mask id="fogMask">
            <rect width={WORLD_WIDTH} height={WORLD_HEIGHT} fill="white" />
            <rect width={WORLD_WIDTH} height={WORLD_HEIGHT} fill="black" opacity="0.78" />
            {curNode && (
              <radialGradient id="fogHole">
                <stop offset="0%" stopColor="white" stopOpacity="1" />
                <stop offset="70%" stopColor="white" stopOpacity="0.6" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>
            )}
            {curNode && (
              <circle cx={curNode.position.x} cy={curNode.position.y} r={fogRadius} fill="url(#fogHole)" style={{ transition: "r 1.5s ease-out" }} />
            )}
          </mask>
        </defs>

        {/* Outer panning group */}
        <g style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0", transition: dragging ? "none" : "transform 0.12s ease-out" }}>
          {/* Layer 1 — grid (animated) */}
          <rect width={WORLD_WIDTH} height={WORLD_HEIGHT} fill="url(#grid)">
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-50" dur="20s" repeatCount="indefinite" />
          </rect>

          {/* Layer 3 — world elements (masked by fog) */}
          <g mask="url(#fogMask)">
            {elements.map((el, i) => (
              <g key={el.id} style={{ animation: `float${i % 3} ${3 + (i % 5)}s ease-in-out infinite` }}>
                <text
                  x={el.position.x} y={el.position.y}
                  fontSize={getElementSize(el.type)}
                  textAnchor="middle" dominantBaseline="central"
                  opacity={0.85}
                  style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))" }}
                >
                  {el.label}
                </text>
              </g>
            ))}
          </g>

          {/* Layer 4 — path */}
          <path d={pathD} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={3} strokeDasharray="8 6">
            <animate attributeName="stroke-dashoffset" values="0;-28" dur="2s" repeatCount="indefinite" />
          </path>
          <path
            d={pathD} fill="none" stroke="url(#pathGradientDone)" strokeWidth={5}
            filter="url(#pathGlow)"
            pathLength={1}
            strokeDasharray={`${completedRatio} 1`}
            style={{ transition: "stroke-dasharray 1s ease" }}
          />

          {/* Layer 5 — particles riding completed path */}
          {[0, 1, 2].map((i) => (
            <circle key={`p-${i}`} r={3} fill="#7c3aed" opacity={0.7}>
              <animateMotion dur={`${4 + i}s`} repeatCount="indefinite" rotate="auto" begin={`${i * 0.8}s`} keyPoints={`0;${completedRatio}`} keyTimes="0;1" path={pathD} />
            </circle>
          ))}

          {/* Layer 6 — nodes */}
          {nodes.map((n) => (
            <NodeShape
              key={n.id}
              node={n}
              hovered={hovered === n.id}
              onHover={(h) => setHovered(h ? n.id : null)}
              onClick={() => onNodeClick?.(n)}
            />
          ))}

          {/* Layer 7 — avatar */}
          {curNode && (
            <g style={{ transform: `translate(${curNode.position.x}px, ${curNode.position.y}px)`, transition: "transform 1.5s cubic-bezier(0.4,0,0.2,1)" }}>
              <circle r={36} fill="url(#avatarGlow)">
                <animate attributeName="r" values="30;42;30" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle r={22} fill={avatar.glowColor} stroke="white" strokeWidth={2} />
              <text fontSize={20} textAnchor="middle" dominantBaseline="central">{getLevelEmoji(avatar.level)}</text>
              <rect x={-22} y={-44} width={44} height={18} rx={9} fill="rgba(0,0,0,0.85)" stroke={avatar.glowColor} strokeWidth={1.5} />
              <text x={0} y={-32} textAnchor="middle" fontSize={10} fill={avatar.glowColor} fontWeight="bold">Lv.{avatar.level}</text>
            </g>
          )}

          {/* Layer 8 — tooltip */}
          {hovered && (() => {
            const n = nodes.find((x) => x.id === hovered)!;
            return (
              <foreignObject x={n.position.x + 50} y={n.position.y - 60} width={260} height={170} style={{ overflow: "visible" }}>
                <div
                  className="rounded-2xl p-3 text-white"
                  style={{
                    background: "rgba(4,3,10,0.97)",
                    border: "1px solid rgba(124,58,237,0.35)",
                    backdropFilter: "blur(24px)",
                    boxShadow: "0 24px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1)",
                    animation: "tooltipPop 0.18s cubic-bezier(0.34,1.56,0.64,1)",
                  }}
                >
                  <div className="font-extrabold text-sm">{n.title}</div>
                  {n.subtitle && <div className="text-[11px] text-white/60 mb-1">{n.subtitle}</div>}
                  <div className="border-t border-white/10 my-1.5" />
                  {n.date && <div className="text-[11px]">📅 {n.date} · {n.daysAway! >= 0 ? `${n.daysAway} روز` : "گذشته"}</div>}
                  <div className="text-[11px]">⚡ XP: +{n.xpReward}</div>
                  {n.reward && <div className="text-[11px]">🎁 {n.reward}</div>}
                  {n.kind === "boss" && (
                    <div className="mt-1 inline-block rounded-md bg-red-500/20 text-red-300 text-[10px] px-2 py-0.5">⚠️ Boss Exam</div>
                  )}
                </div>
              </foreignObject>
            );
          })()}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1.5">
        <button onClick={() => setZoom((z) => Math.min(3, z * 1.2))} className="w-9 h-9 rounded-lg backdrop-blur-md text-white text-lg" style={{ background: "rgba(4,3,10,0.7)", border: "1px solid rgba(124,58,237,0.3)" }}>+</button>
        <button onClick={() => setZoom((z) => Math.max(0.4, z / 1.2))} className="w-9 h-9 rounded-lg backdrop-blur-md text-white text-lg" style={{ background: "rgba(4,3,10,0.7)", border: "1px solid rgba(124,58,237,0.3)" }}>−</button>
        <button onClick={resetView} className="w-9 h-9 rounded-lg backdrop-blur-md text-white text-sm" style={{ background: "rgba(4,3,10,0.7)", border: "1px solid rgba(124,58,237,0.3)" }}>⟳</button>
      </div>

      <style>{`
        @keyframes float0 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes float1 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes float2 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes tooltipPop { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}

function NodeShape({ node, hovered, onHover, onClick }: {
  node: MapNode;
  hovered: boolean;
  onHover: (h: boolean) => void;
  onClick: () => void;
}) {
  const { kind, status, position } = node;
  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      style={{ cursor: "pointer" }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onClick}
    >
      {kind === "start" && (
        <>
          <circle r={36} fill="url(#startGrad)" filter="url(#startGlow)" />
          <text fontSize={24} textAnchor="middle" dominantBaseline="central">🚀</text>
          <text y={56} fontSize={12} fill="rgba(255,255,255,0.7)" textAnchor="middle">شروع</text>
          <circle r={40} fill="none" stroke="#10b981" strokeWidth={2} opacity={0.4}>
            <animate attributeName="r" values="36;50;36" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
          </circle>
        </>
      )}

      {kind === "milestone" && status === "completed" && (
        <>
          <polygon points={hexPoints(34)} fill="url(#doneGrad)" filter="url(#doneGlow)" />
          <text fontSize={20} textAnchor="middle" dominantBaseline="central" fill="white">✓</text>
        </>
      )}
      {kind === "milestone" && status === "current" && (
        <>
          <polygon points={hexPoints(42)} fill="rgba(124,58,237,0.18)" stroke="#7c3aed" strokeWidth={2.5} />
          <text fontSize={20} textAnchor="middle" dominantBaseline="central">🎯</text>
          <circle r={54} fill="none" stroke="url(#orbitGrad)" strokeWidth={2} strokeDasharray="8 4" opacity={0.8}>
            <animateTransform attributeName="transform" type="rotate" values="0;360" dur="6s" repeatCount="indefinite" />
          </circle>
          <rect x={-26} y={-68} width={52} height={20} rx={10} fill="#7c3aed" />
          <text x={0} y={-54} textAnchor="middle" fontSize={11} fill="white" fontWeight="bold">اینجایی</text>
        </>
      )}
      {kind === "milestone" && status === "locked" && (
        <>
          <polygon points={hexPoints(30)} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />
          <text fontSize={16} textAnchor="middle" dominantBaseline="central" opacity={0.4}>🔒</text>
        </>
      )}

      {kind === "boss" && (
        <>
          {status === "locked" && <circle r={64} fill="rgba(245,158,11,0.06)" filter="url(#bossBlur)" />}
          <g transform="rotate(45)">
            <rect x={-36} y={-36} width={72} height={72} rx={8}
              fill={status === "locked" ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.18)"}
              stroke={status === "locked" ? "rgba(245,158,11,0.3)" : "#f59e0b"}
              strokeWidth={2.5}
              style={status !== "locked" ? { filter: "drop-shadow(0 0 16px rgba(245,158,11,0.55))" } : undefined}
            />
          </g>
          <text fontSize={28} textAnchor="middle" dominantBaseline="central">🐲</text>
          {status !== "locked" && (
            <>
              {[0, 90, 180, 270].map((ang) => (
                <circle key={ang} r={4} fill="#f59e0b" opacity={0.85}>
                  <animateTransform attributeName="transform" type="rotate" from={`${ang} 0 0`} to={`${ang + 360} 0 0`} dur="3s" repeatCount="indefinite" />
                  <animateMotion path="M 0,-44 a 44,44 0 1,1 0,88 a 44,44 0 1,1 0,-88" dur="3s" repeatCount="indefinite" begin={`${ang / 360}s`} />
                </circle>
              ))}
            </>
          )}
        </>
      )}

      {kind === "finish" && (
        <>
          <path d={starPath(50)} fill="url(#finishGrad)" filter="url(#finishGlow)" />
          <text fontSize={32} textAnchor="middle" dominantBaseline="central">👑</text>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((ang, i) => (
            <text key={ang} fontSize={12} opacity={0.85} textAnchor="middle" dominantBaseline="central">
              <animateMotion dur={`${8 + (i % 3)}s`} repeatCount="indefinite" begin={`${i * 0.3}s`}
                path={`M 0,-72 a 72,72 0 1,1 0,144 a 72,72 0 1,1 0,-144`} rotate="auto" />
              ✦
            </text>
          ))}
        </>
      )}

      {/* Hover ring */}
      {hovered && <circle r={56} fill="none" stroke="white" strokeWidth={1} opacity={0.25} />}
    </g>
  );
}