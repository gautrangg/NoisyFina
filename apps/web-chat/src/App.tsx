import { useCallback, useEffect, useRef, useState } from "react";
import { ChatPanel } from "./components/ChatPanel";
import { DevOverlay } from "./components/DevOverlay";
import { Header } from "./components/Header";
import { Stage } from "./components/Stage";
import { newId, RoomSimulator, type ChatMessage, type RoomStats } from "./simulator";

/** Giữ tối đa bao nhiêu tin trong bộ nhớ trình duyệt (Twitch giữ ~150). */
const MAX_MESSAGES = 400;

const INITIAL_STATS: RoomStats = {
  node: "node-1",
  viewers: 48213,
  inPerSec: 0,
  shownPerSec: 0,
  shownRatio: 1,
  dropped: 0,
  p50: 0,
  p95: 0,
  p99: 0,
  rateHistory: Array(60).fill(0),
};

function makeNickname() {
  return `khach_${Math.floor(1000 + Math.random() * 9000)}`;
}

function readTheme(): "dark" | "light" {
  try {
    const t = localStorage.getItem("nf-theme");
    if (t === "light" || t === "dark") return t;
  } catch {
    /* bỏ qua khi bị chặn storage */
  }
  return "dark";
}

export function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState<RoomStats>(INITIAL_STATS);
  const [rate, setRate] = useState(40);
  const [slowMode, setSlowMode] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(readTheme);
  const [me] = useState(makeNickname);
  const simRef = useRef<RoomSimulator | null>(null);

  useEffect(() => {
    const sim = new RoomSimulator(
      () => me,
      (batch, s) => {
        if (batch.length) {
          setMessages((prev) => {
            const next = prev.concat(batch);
            return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
          });
        }
        setStats(s);
      },
    );
    sim.rate = rate;
    sim.start();
    simRef.current = sim;
    return () => sim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  useEffect(() => {
    if (simRef.current) simRef.current.rate = rate;
  }, [rate]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("nf-theme", theme);
    } catch {
      /* bỏ qua */
    }
  }, [theme]);

  // Phím tắt D để bật/tắt dev overlay
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "d" || e.key === "D") setDevOpen((v) => !v);
      if (e.key === "Escape") setDevOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send = useCallback(
    (text: string) => {
      const id = newId();
      const msg: ChatMessage = {
        id,
        user: { name: me, color: 0 },
        text,
        ts: Date.now(),
        mine: true,
        status: "sending",
      };
      setMessages((prev) => [...prev, msg].slice(-MAX_MESSAGES));
      const latency = simRef.current?.sampleLatency() ?? 40;
      setTimeout(() => {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: "sent" } : m)));
      }, latency);
    },
    [me],
  );

  return (
    <div className="flex h-dvh flex-col">
      <Header
        viewers={stats.viewers}
        node={stats.node}
        p50={stats.p50}
        devOpen={devOpen}
        onToggleDev={() => setDevOpen((v) => !v)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      />
      <main className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <Stage stats={stats} />
        <ChatPanel messages={messages} onSend={send} shownRatio={stats.shownRatio} shownPerSec={stats.shownPerSec} slowMode={slowMode} me={me} />
      </main>
      {devOpen && (
        <DevOverlay
          stats={stats}
          rate={rate}
          onRate={setRate}
          slowMode={slowMode}
          onSlowMode={setSlowMode}
          onClose={() => setDevOpen(false)}
        />
      )}
    </div>
  );
}
