/**
 * Giả lập một phòng livestream đông người — CHƯA nối server thật.
 * Mô phỏng đúng hành vi server sẽ làm sau này:
 *  - gom tin theo lô mỗi 100ms (batching)
 *  - khi quá tải chỉ hiển thị một phần tin (sampling) và đếm số tin bị bỏ
 */

export type Badge = "mod" | "sub" | "vip";

export interface ChatUser {
  name: string;
  color: number; // 0..7 → --nf-name-N
  badge?: Badge;
}

export interface ChatMessage {
  id: string;
  user: ChatUser;
  text: string;
  ts: number;
  mine?: boolean;
  status?: "sending" | "sent";
  mention?: boolean;
}

export interface RoomStats {
  node: string;
  viewers: number;
  inPerSec: number;
  shownPerSec: number;
  shownRatio: number; // 0..1
  dropped: number;
  p50: number;
  p95: number;
  p99: number;
  rateHistory: number[]; // tin vào/giây, 60 giây gần nhất
}

const BASE_NAMES = [
  "linh", "tuan_dev", "an.nguyen", "minhkhoa", "bao_ngoc", "haidang", "trang",
  "quanghuy", "vy", "phuc", "namcoder", "thao.le", "kiet", "my_my", "duc_anh",
  "hoang", "sang", "yen", "long_rider", "chau", "kai", "mochi", "ren", "sora",
  "jin", "neo", "bin", "tom", "na", "ly", "khang", "hieu", "dat", "quynh",
];

const PHRASES = [
  "gg", "gg wp", "đỉnh quá", "hahaha", "clip lại đi", "ai từ Hà Nội điểm danh",
  "Sài Gòn đây", "3 giờ sáng vẫn xem", "sóng lag không mọi người", "mượt mà",
  "ez", "nước đi hay", "500 ae ơi", "fina ơi", "chat trôi nhanh quá",
  "p99 bao nhiêu rồi", "server còn sống không", "lần đầu xem stream này",
  "cho xin cái sơ đồ", "redis gánh còng lưng", "ai đang load test đấy",
  "vào muộn quá", "trận này hay", "ủa gì vậy", "chuẩn luôn", "+1",
  "góc này đẹp", "cười xỉu", "sao im vậy", "hello mọi người",
];

const EMOJI = ["🔥", "👏", "😂", "💧", "⚡", "🎉", "🫡", "👀", "💀", "🙏", "✨"];

const NODES = ["node-1", "node-2", "node-3"];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildUsers(n: number): ChatUser[] {
  const users: ChatUser[] = [];
  for (let i = 0; i < n; i++) {
    const base = pick(BASE_NAMES);
    const name = Math.random() < 0.55 ? `${base}${Math.floor(Math.random() * 999)}` : base;
    const r = Math.random();
    const badge: Badge | undefined = r < 0.015 ? "mod" : r < 0.05 ? "vip" : r < 0.2 ? "sub" : undefined;
    users.push({ name, color: hash(name) % 8, badge });
  }
  return users;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

let seq = 0;
export function newId(): string {
  seq = (seq + 1) % 1e9;
  return `${Date.now().toString(36)}-${seq.toString(36)}`;
}

/**
 * Tối đa số tin hiển thị mỗi lô 100ms ≈ 80 tin/giây — vượt mức này thì lấy mẫu.
 * Mắt người không đọc nổi hơn ~10 tin/giây; 80/giây đã đủ cảm giác "chat trôi rất nhanh".
 */
export const DISPLAY_CAP_PER_TICK = 8;

export class RoomSimulator {
  rate = 40; // tin/giây
  private acc = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private users = buildUsers(500);
  private latencies: number[] = [];
  private viewers = 48213;
  private dropped = 0;
  private history: number[] = Array(60).fill(0);
  private secIn = 0;
  private secShown = 0;
  private secStart = performance.now();
  private inPerSec = 0;
  private shownPerSec = 0;
  readonly node = pick(NODES);

  constructor(
    private me: () => string,
    private onTick: (batch: ChatMessage[], stats: RoomStats) => void,
  ) {}

  start() {
    this.stop();
    this.timer = setInterval(() => this.tick(), 100);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** Độ trễ giả lập — tăng dần khi tải cao, giống server thật sẽ thể hiện. */
  sampleLatency(): number {
    const load = Math.min(this.rate / 3000, 1);
    const spike = Math.random() < 0.02 ? Math.random() * 120 : 0;
    return 16 + Math.random() * 14 + load * load * 420 * Math.random() + spike;
  }

  private makeMessage(): ChatMessage {
    const user = pick(this.users);
    const r = Math.random();
    let text: string;
    let mention = false;
    if (r < 0.004) {
      text = `@${this.me()} ${pick(["chào bạn", "bạn nói đúng", "đồng ý", "haha chuẩn"])}`;
      mention = true;
    } else if (r < 0.18) {
      text = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => pick(EMOJI)).join("");
    } else if (r < 0.3) {
      text = `${pick(PHRASES)} ${pick(EMOJI)}`;
    } else {
      text = pick(PHRASES);
    }
    return { id: newId(), user, text, ts: Date.now(), mention };
  }

  private tick() {
    // Poisson gần đúng + thỉnh thoảng có "đợt bùng"
    const burst = Math.random() < 0.03 ? 2.5 : 1;
    this.acc += (this.rate / 10) * burst * (0.7 + Math.random() * 0.6);
    const n = Math.floor(this.acc);
    this.acc -= n;

    const shown = Math.min(n, DISPLAY_CAP_PER_TICK);
    this.dropped += n - shown;
    this.secIn += n;
    this.secShown += shown;

    const batch: ChatMessage[] = [];
    for (let i = 0; i < shown; i++) batch.push(this.makeMessage());

    for (let i = 0; i < 4; i++) this.latencies.push(this.sampleLatency());
    if (this.latencies.length > 400) this.latencies.splice(0, this.latencies.length - 400);

    const drift = (Math.random() - 0.47) * 14 + this.rate / 400;
    this.viewers = Math.max(1000, Math.round(this.viewers + drift));

    const now = performance.now();
    if (now - this.secStart >= 1000) {
      this.inPerSec = this.secIn;
      this.shownPerSec = this.secShown;
      this.history = [...this.history.slice(1), this.secIn];
      this.secIn = 0;
      this.secShown = 0;
      this.secStart = now;
    }

    const sorted = [...this.latencies].sort((a, b) => a - b);
    this.onTick(batch, {
      node: this.node,
      viewers: this.viewers,
      inPerSec: this.inPerSec,
      shownPerSec: this.shownPerSec,
      shownRatio: this.inPerSec ? Math.min(1, this.shownPerSec / this.inPerSec) : 1,
      dropped: this.dropped,
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      rateHistory: this.history,
    });
  }
}
