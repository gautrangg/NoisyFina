import { useEffect, useRef, useState } from "react";

/** Số chạy mượt tới giá trị mới (cho số người xem, KPI). */
export function useTweenNumber(target: number, duration = 450): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  const raf = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const begin = from.current;
    cancelAnimationFrame(raf.current);
    const step = (t: number) => {
      // rAF timestamp có thể sớm hơn `start` một chút → kẹp về [0,1] để không ra số âm
      const k = Math.max(0, Math.min(1, (t - start) / duration));
      const eased = 1 - Math.pow(1 - k, 3);
      const v = begin + (target - begin) * eased;
      from.current = v;
      setValue(v);
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

/** Đồng hồ thời lượng phát sóng. */
export function useUptime(offsetSec: number): string {
  const [now, setNow] = useState(() => Date.now());
  const startRef = useRef(Date.now() - offsetSec * 1000);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.floor((now - startRef.current) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

export const fmt = new Intl.NumberFormat("vi-VN");
