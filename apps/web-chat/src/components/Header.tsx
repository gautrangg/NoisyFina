import { useTweenNumber, fmt } from "../hooks";
import { EyeIcon, LogoMark, MoonIcon, SunIcon, TerminalIcon } from "./icons";

interface Props {
  viewers: number;
  node: string;
  p50: number;
  devOpen: boolean;
  onToggleDev: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export function Header({ viewers, node, p50, devOpen, onToggleDev, theme, onToggleTheme }: Props) {
  const v = useTweenNumber(viewers);
  const healthy = p50 < 120;

  return (
    <header className="flex h-12 items-center gap-3 border-b border-line bg-bg/80 px-3 backdrop-blur sm:px-4">
      <div className="flex items-center gap-2.5">
        <LogoMark />
        <span className="text-[14px] font-semibold tracking-[-0.01em]">NoisyFina</span>
      </div>

      <span className="hidden h-4 w-px bg-line sm:block" />
      <span className="hidden truncate text-[13px] text-muted sm:block">Phòng thử tải #1</span>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-surface px-2 text-[12px] font-medium">
          <span className="nf-live-dot size-1.5 rounded-full bg-live" />
          LIVE
        </span>

        <span
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-surface px-2 font-mono text-[12px] text-muted tnum"
          title="Số người đang xem"
        >
          <EyeIcon width={14} height={14} />
          <span className="text-fg">{fmt.format(Math.round(v))}</span>
        </span>

        <span
          className="hidden h-7 items-center gap-1.5 rounded-md border border-line bg-surface px-2 font-mono text-[12px] text-muted tnum md:inline-flex"
          title="Server bạn đang kết nối · độ trễ trung vị"
        >
          <span className={`size-1.5 rounded-full ${healthy ? "bg-ok" : "bg-warn"}`} />
          {node}
          <span className="text-faint">·</span>
          <span className="text-fg">{Math.round(p50)}ms</span>
        </span>

        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex size-7 items-center justify-center rounded-md border border-line bg-surface text-muted transition-colors duration-[var(--nf-dur-fast)] hover:border-line-strong hover:text-fg"
          aria-label={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
        >
          {theme === "dark" ? <SunIcon width={14} height={14} /> : <MoonIcon width={14} height={14} />}
        </button>

        <button
          type="button"
          onClick={onToggleDev}
          aria-pressed={devOpen}
          className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] font-medium transition-colors duration-[var(--nf-dur-fast)] ${
            devOpen
              ? "border-accent-line bg-accent-soft text-accent-strong"
              : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg"
          }`}
        >
          <TerminalIcon width={14} height={14} />
          <span className="hidden sm:inline">Dev</span>
          <kbd className="hidden rounded border border-line px-1 font-mono text-[10px] text-faint sm:inline">D</kbd>
        </button>
      </div>
    </header>
  );
}
