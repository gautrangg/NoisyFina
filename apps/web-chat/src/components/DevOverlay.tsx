import { fmt } from "../hooks";
import type { RoomStats } from "../simulator";
import { XIcon } from "./icons";

const PRESETS = [
  { label: "Yên ắng", rate: 5 },
  { label: "Sôi động", rate: 80 },
  { label: "Bùng nổ", rate: 600 },
  { label: "Quá tải", rate: 3000 },
];

const MAX_RATE = 3000;
// Thang log cho slider: 1 → 3000 tin/giây
const toSlider = (r: number) => (Math.log(r) / Math.log(MAX_RATE)) * 100;
const fromSlider = (v: number) => Math.max(1, Math.round(Math.exp((v / 100) * Math.log(MAX_RATE))));

function Sparkline({ data }: { data: number[] }) {
  const w = 280;
  const h = 44;
  const max = Math.max(10, ...data);
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d / max) * (h - 4) - 2}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-11 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill="var(--nf-accent-soft)" stroke="none" />
      <polyline points={pts} fill="none" stroke="var(--nf-accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px]">
      <span className="text-faint">{k}</span>
      <span className={`font-mono tnum ${tone ?? "text-fg"}`}>{v}</span>
    </div>
  );
}

interface Props {
  stats: RoomStats;
  rate: number;
  onRate: (r: number) => void;
  slowMode: boolean;
  onSlowMode: (v: boolean) => void;
  onClose: () => void;
}

export function DevOverlay({ stats, rate, onRate, slowMode, onSlowMode, onClose }: Props) {
  const pct = toSlider(rate);
  const latTone = (ms: number) => (ms > 1000 ? "text-danger" : ms > 250 ? "text-warn" : "text-fg");

  return (
    <div
      role="dialog"
      aria-label="Dev overlay"
      className="nf-in fixed bottom-3 left-3 right-3 z-20 rounded-lg border border-line-strong bg-surface/95 text-[12px] shadow-[var(--nf-shadow-pop)] backdrop-blur-md sm:right-auto sm:w-[320px]"
    >
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Dev overlay</span>
          <span className="rounded border border-warn/30 px-1 font-mono text-[9.5px] text-warn">giả lập</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng dev overlay"
          className="inline-flex size-6 items-center justify-center rounded text-faint hover:bg-surface-2 hover:text-fg"
        >
          <XIcon width={13} height={13} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-5 px-3 py-2">
        <Row k="Server" v={stats.node} tone="text-accent" />
        <Row k="Người xem" v={fmt.format(stats.viewers)} />
        <Row k="Tin vào/s" v={fmt.format(stats.inPerSec)} />
        <Row k="Hiển thị/s" v={fmt.format(stats.shownPerSec)} tone={stats.shownRatio < 0.9 ? "text-warn" : undefined} />
        <Row k="p50" v={`${Math.round(stats.p50)}ms`} tone={latTone(stats.p50)} />
        <Row k="p95" v={`${Math.round(stats.p95)}ms`} tone={latTone(stats.p95)} />
        <Row k="p99" v={`${Math.round(stats.p99)}ms`} tone={latTone(stats.p99)} />
        <Row k="Lược bớt" v={fmt.format(stats.dropped)} />
      </div>

      <div className="border-t border-line px-3 pb-1 pt-2">
        <div className="mb-1 flex justify-between text-faint">
          <span>Tin vào · 60 giây</span>
          <span className="font-mono tnum">{fmt.format(Math.max(...stats.rateHistory))} đỉnh</span>
        </div>
        <Sparkline data={stats.rateHistory} />
      </div>

      <div className="border-t border-line px-3 py-3">
        <div className="mb-2 flex items-baseline justify-between">
          <label htmlFor="nf-rate" className="text-muted">
            Tải giả lập
          </label>
          <span className="font-mono text-fg tnum">{fmt.format(rate)} tin/s</span>
        </div>
        <input
          id="nf-rate"
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={pct}
          onChange={(e) => onRate(fromSlider(Number(e.target.value)))}
          className="nf-range w-full"
          style={{ ["--pct" as string]: `${pct}%` }}
        />
        <div className="mt-2.5 grid grid-cols-4 gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onRate(p.rate)}
              className={`rounded border px-1 py-1 text-[11px] transition-colors duration-[var(--nf-dur-fast)] ${
                rate === p.rate
                  ? "border-accent-line bg-accent-soft text-accent-strong"
                  : "border-line text-muted hover:border-line-strong hover:text-fg"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span id="nf-slow-label" className="text-muted">
            Slow mode (3s)
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={slowMode}
            aria-labelledby="nf-slow-label"
            onClick={() => onSlowMode(!slowMode)}
            className={`relative h-[18px] w-8 rounded-full transition-colors duration-[var(--nf-dur)] ${slowMode ? "bg-accent" : "bg-surface-3"}`}
          >
            <span
              className={`absolute left-0 top-[2px] size-[14px] rounded-full bg-fg transition-transform duration-[var(--nf-dur)] ease-[var(--nf-ease-out)] ${
                slowMode ? "translate-x-[16px]" : "translate-x-[2px]"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
