import { fmt, useTweenNumber, useUptime } from "../hooks";
import type { RoomStats } from "../simulator";
import { ClockIcon } from "./icons";

function Kpi({ label, value, unit, tone = "fg" }: { label: string; value: string; unit?: string; tone?: "fg" | "warn" | "danger" | "ok" }) {
  const color = { fg: "text-fg", warn: "text-warn", danger: "text-danger", ok: "text-ok" }[tone];
  return (
    <div className="min-w-0 rounded-md border border-line bg-surface px-3 py-2.5">
      <div className="text-[11px] text-faint">{label}</div>
      <div className={`mt-1 font-mono text-[18px] leading-none tracking-[-0.02em] tnum ${color}`}>
        {value}
        {unit && <span className="ml-0.5 text-[12px] text-faint">{unit}</span>}
      </div>
    </div>
  );
}

export function Stage({ stats }: { stats: RoomStats }) {
  const uptime = useUptime(2 * 3600 + 14 * 60 + 37);
  const inRate = useTweenNumber(stats.inPerSec, 600);
  const p99 = useTweenNumber(stats.p99, 600);
  const pct = Math.round(stats.shownRatio * 100);
  const p99Tone = stats.p99 > 1000 ? "danger" : stats.p99 > 250 ? "warn" : "fg";

  return (
    <section className="flex shrink-0 flex-col gap-3 p-3 sm:p-4 lg:min-h-0 lg:shrink lg:overflow-y-auto">
      {/* Khung video giả lập */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-line bg-[oklch(0.13_0.005_250)]">
        <div className="nf-blob-a absolute -left-1/4 -top-1/4 size-[70%] rounded-full bg-[radial-gradient(circle,oklch(0.79_0.065_215/0.22),transparent_65%)] blur-2xl" />
        <div className="nf-blob-b absolute -bottom-1/4 -right-1/4 size-[65%] rounded-full bg-[radial-gradient(circle,oklch(0.7_0.05_250/0.18),transparent_65%)] blur-2xl" />
        <div className="nf-grid absolute inset-0" />

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="nf-eq flex h-10 items-end gap-[5px]" aria-hidden>
            {Array.from({ length: 13 }, (_, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full bg-accent/70"
                style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${(i * 97) % 900}ms` }}
              />
            ))}
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">tín hiệu giả lập · chưa nối server</p>
        </div>

        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span className="inline-flex h-6 items-center gap-1.5 rounded bg-live px-2 text-[11px] font-semibold text-white">
            LIVE
          </span>
          <span className="inline-flex h-6 items-center gap-1 rounded bg-black/50 px-2 font-mono text-[11px] text-white/85 backdrop-blur tnum">
            <ClockIcon width={12} height={12} />
            {uptime}
          </span>
        </div>
        <span className="absolute right-3 top-3 inline-flex h-6 items-center rounded bg-black/50 px-2 font-mono text-[11px] text-white/70 backdrop-blur">
          1080p60
        </span>
      </div>

      {/* Thông tin phát sóng */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="hidden size-10 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-[13px] font-semibold text-accent sm:flex">
          NF
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold tracking-[-0.015em] sm:text-[16px]">Đêm thử tải · baseline v1</h1>
          <p className="mt-0.5 text-[12.5px] text-muted sm:text-[13px]">
            noisyfina <span className="text-faint">·</span> System design
          </p>
          <div className="mt-2 hidden flex-wrap gap-1.5 sm:flex">
            {["Load test", "WebSocket", "Tiếng Việt"].map((t) => (
              <span key={t} className="rounded border border-line bg-surface px-1.5 py-0.5 text-[11px] text-muted">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* KPI phòng điều khiển */}
      <div className="hidden grid-cols-4 gap-2 lg:grid">
        <Kpi label="Tin vào" value={fmt.format(Math.round(inRate))} unit="/s" />
        <Kpi label="Hiển thị" value={`${pct}`} unit="%" tone={pct < 90 ? "warn" : "fg"} />
        <Kpi label="p99 độ trễ" value={fmt.format(Math.round(p99))} unit="ms" tone={p99Tone} />
        <Kpi label="Đã lược bớt" value={fmt.format(stats.dropped)} unit="tin" />
      </div>
    </section>
  );
}
