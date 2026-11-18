import { memo, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ChatMessage } from "../simulator";
import { ArrowDownIcon, SendIcon } from "./icons";

const MAX_LEN = 200;

const BADGE_LABEL = { mod: "MOD", vip: "VIP", sub: "SUB" } as const;
const BADGE_STYLE = {
  mod: "border-ok/40 text-ok",
  vip: "border-warn/40 text-warn",
  sub: "border-accent-line text-accent",
} as const;

const MessageRow = memo(function MessageRow({ m, animate }: { m: ChatMessage; animate: boolean }) {
  // Chỉ trượt vào khi chat chậm — chat nhanh mà hàng nào cũng animate thì khung chat luôn mờ
  const fresh = animate && Date.now() - m.ts < 400;
  const time = new Date(m.ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return (
    <div
      className={`group mx-1.5 rounded-md px-2 py-[3px] text-[13.5px] leading-[1.5] break-words transition-colors duration-[var(--nf-dur-fast)] hover:bg-surface-2 ${
        fresh ? "nf-in" : ""
      } ${m.mention ? "bg-accent-soft shadow-[inset_2px_0_0_var(--nf-accent)]" : ""} ${
        m.status === "sending" ? "opacity-55" : ""
      }`}
    >
      <span className="mr-1.5 hidden font-mono text-[11px] text-faint group-hover:inline tnum">{time}</span>
      {m.user.badge && (
        <span
          className={`mr-1 inline-flex translate-y-[-1px] items-center rounded-[4px] border px-1 font-mono text-[9.5px] leading-[14px] ${BADGE_STYLE[m.user.badge]}`}
        >
          {BADGE_LABEL[m.user.badge]}
        </span>
      )}
      <span className="font-medium" style={{ color: m.mine ? "var(--nf-accent-strong)" : `var(--nf-name-${m.user.color})` }}>
        {m.user.name}
      </span>
      <span className="text-faint">: </span>
      <span className="text-fg/90">{m.text}</span>
    </div>
  );
});

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  shownRatio: number;
  shownPerSec: number;
  slowMode: boolean;
  me: string;
}

export function ChatPanel({ messages, onSend, shownRatio, shownPerSec, slowMode, me }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Khi tạm dừng: đóng băng danh sách đang xem (giống Twitch), tin mới chỉ được đếm
  const [frozen, setFrozen] = useState<ChatMessage[] | null>(null);
  const [unseen, setUnseen] = useState(0);
  const lastSeenTs = useRef(0);
  const [draft, setDraft] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const following = frozen === null;
  const shown = frozen ?? messages;

  const virtualizer = useVirtualizer({
    count: shown.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 26,
    overscan: 16,
    getItemKey: (i) => shown[i].id,
  });

  // Tự cuộn xuống cuối khi đang "theo dõi"
  useLayoutEffect(() => {
    if (following && shown.length) {
      virtualizer.scrollToIndex(shown.length - 1, { align: "end" });
    }
  }, [shown, following, virtualizer]);

  // Đếm tin mới đến trong lúc tạm dừng
  useEffect(() => {
    if (following) return;
    let n = 0;
    let maxTs = lastSeenTs.current;
    for (const m of messages) {
      if (m.ts > lastSeenTs.current) {
        n++;
        if (m.ts > maxTs) maxTs = m.ts;
      }
    }
    lastSeenTs.current = maxTs;
    if (n) setUnseen((u) => u + n);
  }, [messages, following]);

  // Đếm ngược slow mode
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const pause = () => {
    if (!following) return;
    setFrozen(messages);
    setUnseen(0);
    lastSeenTs.current = messages.length ? messages[messages.length - 1].ts : Date.now();
  };

  const resume = () => setFrozen(null);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || following) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (dist < 8) resume();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || cooldown > 0) return;
    onSend(text.slice(0, MAX_LEN));
    setDraft("");
    resume();
    if (slowMode) setCooldown(3);
  };

  const sampling = shownRatio < 0.9;
  const remaining = MAX_LEN - draft.length;

  return (
    <aside className="flex min-h-0 flex-1 flex-col border-t border-line bg-surface lg:border-l lg:border-t-0">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
        <span className="text-[13px] font-medium">Chat trực tiếp</span>
        {slowMode && (
          <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10.5px] text-muted">slow mode · 3s</span>
        )}
      </div>

      {sampling && (
        <div
          role="status"
          className="flex shrink-0 items-center gap-2 border-b border-warn/20 bg-warn/[0.07] px-4 py-2 text-[12px] text-warn"
        >
          <span className="size-1.5 shrink-0 rounded-full bg-warn" />
          <span>
            Phòng đang rất đông · hiển thị khoảng <span className="font-mono tnum">{Math.round(shownRatio * 100)}%</span> tin nhắn
          </span>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          onWheel={(e) => e.deltaY < 0 && pause()}
          onTouchMove={pause}
          onKeyDown={(e) => ["ArrowUp", "PageUp", "Home"].includes(e.key) && pause()}
          tabIndex={0}
          aria-label="Tin nhắn chat"
          aria-live="off"
          className="nf-scroll h-full overflow-y-auto py-2 outline-none"
        >
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((item) => (
              <div
                key={item.key}
                data-index={item.index}
                ref={virtualizer.measureElement}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${item.start}px)` }}
              >
                <MessageRow m={shown[item.index]} animate={shownPerSec <= 20} />
              </div>
            ))}
          </div>
        </div>

        {!following && (
          <button
            type="button"
            onClick={resume}
            className="nf-in absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center whitespace-nowrap gap-1.5 rounded-full border border-line-strong bg-surface-3 px-3 py-1.5 text-[12px] font-medium text-fg shadow-[var(--nf-shadow-pop)] transition-colors hover:border-accent-line"
          >
            <ArrowDownIcon width={13} height={13} />
            Chat tạm dừng
            {unseen > 0 && (
              <span className="font-mono text-accent tnum">· {unseen > 999 ? "999+" : unseen} tin mới</span>
            )}
          </button>
        )}
      </div>

      <form onSubmit={submit} className="shrink-0 border-t border-line p-3">
        <div className="flex items-center gap-2 rounded-md border border-line bg-bg px-2.5 transition-colors duration-[var(--nf-dur-fast)] focus-within:border-accent-line">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
            placeholder={cooldown > 0 ? `Chờ ${cooldown}s nữa…` : "Gửi tin nhắn…"}
            disabled={cooldown > 0}
            aria-label="Nội dung tin nhắn"
            className="h-9 min-w-0 flex-1 bg-transparent text-[13.5px] text-fg placeholder:text-faint focus:outline-none disabled:cursor-not-allowed"
          />
          {draft.length > 150 && (
            <span className={`font-mono text-[11px] tnum ${remaining < 20 ? "text-warn" : "text-faint"}`}>{remaining}</span>
          )}
          <button
            type="submit"
            disabled={!draft.trim() || cooldown > 0}
            aria-label="Gửi"
            className="inline-flex size-7 items-center justify-center rounded-[6px] bg-accent text-bg transition-opacity duration-[var(--nf-dur-fast)] hover:bg-accent-strong disabled:opacity-30"
          >
            <SendIcon width={14} height={14} />
          </button>
        </div>
        <p className="mt-2 px-0.5 text-[11px] text-faint">
          Bạn là <span style={{ color: "var(--nf-accent-strong)" }}>{me}</span> · nhấn Enter để gửi
        </p>
      </form>
    </aside>
  );
}
