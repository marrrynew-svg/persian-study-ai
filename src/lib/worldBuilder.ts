// Build the visual world: node positions, smooth bezier path, decorative elements.

export type WorldElementType =
  | "castle" | "forest" | "mountain" | "crystal"
  | "volcano" | "bridge" | "ruins" | "reward_point";

export interface WorldElement {
  id: string;
  type: WorldElementType;
  position: { x: number; y: number };
  label: string;
}

export type NodeKind = "start" | "milestone" | "boss" | "finish";
export type NodeStatus = "completed" | "current" | "locked";

export interface MapNode {
  id: string;
  kind: NodeKind;
  status: NodeStatus;
  title: string;
  subtitle?: string;
  date?: string;          // ISO yyyy-mm-dd
  daysAway?: number;
  xpReward: number;
  reward?: string;
  position: { x: number; y: number };
  examId?: string;
}

/** World canvas size in SVG user units. */
export const WORLD_WIDTH = 1200;
export const WORLD_HEIGHT = 1800;

/** Layout milestones top-to-bottom along a gentle serpentine path. */
export function layoutNodes(milestones: { id: string; title: string; date: string; isBoss: boolean; isFinish: boolean; examId: string; }[]): MapNode[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const total = milestones.length + 1; // include START
  const nodes: MapNode[] = [];

  // START
  nodes.push({
    id: "start",
    kind: "start",
    status: "completed",
    title: "شروع سفر",
    subtitle: "اولین قدم",
    xpReward: 0,
    position: { x: WORLD_WIDTH * 0.5, y: 80 },
  });

  milestones.forEach((m, i) => {
    const t = (i + 1) / total;
    // Serpentine x using sin
    const x = WORLD_WIDTH * (0.5 + 0.32 * Math.sin(i * 1.1));
    const y = 80 + (WORLD_HEIGHT - 160) * t;
    const d = new Date(m.date);
    const days = Math.ceil((+d - +today) / 86400000);
    const status: NodeStatus = days < 0 ? "completed" : days <= 3 && i === firstUpcomingIdx(milestones) ? "current" : "locked";
    nodes.push({
      id: m.id,
      kind: m.isFinish ? "finish" : m.isBoss ? "boss" : "milestone",
      status,
      title: m.title,
      subtitle: m.isFinish ? "هدف نهایی" : m.isBoss ? "آزمون جامع" : "آزمون میانی",
      date: m.date,
      daysAway: days,
      xpReward: m.isFinish ? 2000 : m.isBoss ? 500 : 200,
      reward: m.isFinish ? "🏆 لقب فاتح" : m.isBoss ? "👑 مدال طلایی" : "✨ ۲۰۰ XP",
      position: { x, y },
      examId: m.examId,
    });
  });

  return nodes;
}

function firstUpcomingIdx(arr: { date: string }[]): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return arr.findIndex((m) => +new Date(m.date) >= +today);
}

/** Smooth catmull-rom-like cubic bezier through node centers. */
export function buildSmoothPath(nodes: MapNode[]): string {
  if (nodes.length === 0) return "";
  const pts = nodes.map((n) => n.position);
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cp1x = p0.x;
    const cp1y = p0.y + (p1.y - p0.y) * 0.5;
    const cp2x = p1.x;
    const cp2y = p0.y + (p1.y - p0.y) * 0.5;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

/** Approximate completed length (in path units) for stroke-dasharray reveal. */
export function estimateCompletedRatio(nodes: MapNode[]): number {
  const lastDone = lastCompletedIdx(nodes);
  if (lastDone < 0) return 0;
  return Math.min(1, (lastDone + 0.5) / Math.max(1, nodes.length - 1));
}

export function lastCompletedIdx(nodes: MapNode[]): number {
  let last = -1;
  nodes.forEach((n, i) => { if (n.status === "completed") last = i; });
  return last;
}

export function currentNodeIndex(nodes: MapNode[]): number {
  const cur = nodes.findIndex((n) => n.status === "current");
  if (cur >= 0) return cur;
  const last = lastCompletedIdx(nodes);
  return Math.min(nodes.length - 1, last + 1);
}

const ELEMENT_LABELS: Record<WorldElementType, string> = {
  castle: "🏰", forest: "🌲", mountain: "⛰️", crystal: "💎",
  volcano: "🌋", bridge: "🌉", ruins: "🗿", reward_point: "✨",
};

export function getElementLabel(t: WorldElementType): string { return ELEMENT_LABELS[t]; }

const ELEMENT_SIZES: Record<WorldElementType, number> = {
  castle: 42, mountain: 38, volcano: 40,
  forest: 30, crystal: 28, bridge: 34, ruins: 30, reward_point: 24,
};
export function getElementSize(t: WorldElementType): number { return ELEMENT_SIZES[t]; }

const TYPE_ORDER: WorldElementType[] = ["castle", "forest", "mountain", "crystal", "bridge", "ruins", "reward_point", "volcano"];

export function generateWorldElements(nodes: MapNode[]): WorldElement[] {
  const out: WorldElement[] = [];
  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1];
    const node = nodes[i];
    const midX = (prev.position.x + node.position.x) / 2;
    const midY = (prev.position.y + node.position.y) / 2;
    const tA = TYPE_ORDER[i % TYPE_ORDER.length];
    const tB = TYPE_ORDER[(i + 3) % TYPE_ORDER.length];
    out.push({ id: `el-${i}-a`, type: tA, label: getElementLabel(tA), position: { x: midX - 180, y: midY + 30 } });
    out.push({ id: `el-${i}-b`, type: tB, label: getElementLabel(tB), position: { x: midX + 180, y: midY - 30 } });
    if (i % 2 === 0) {
      const tC = TYPE_ORDER[(i + 5) % TYPE_ORDER.length];
      out.push({ id: `el-${i}-c`, type: tC, label: getElementLabel(tC), position: { x: midX + 90, y: midY + 80 } });
    }
  }
  return out;
}

export function hexPoints(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(r * Math.cos(ang)).toFixed(2)},${(r * Math.sin(ang)).toFixed(2)}`);
  }
  return pts.join(" ");
}

export function starPath(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(rr * Math.cos(ang)).toFixed(2)},${(rr * Math.sin(ang)).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}