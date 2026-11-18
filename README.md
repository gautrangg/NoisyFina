# NoisyFina

> Một phòng chat, 50.000 người, và tất cả những lần nó sập.

NoisyFina là một hệ thống **chat livestream** (một phòng cực đông người) được xây để **cố tình làm sập, đo đạc, rồi sửa**. Mỗi lần sập được ghi lại thành một chương có số liệu load test thật.

**Trạng thái:** 🚧 đang xây — mới có prototype giao diện chạy bằng dữ liệu giả lập.

## Chạy thử giao diện

```bash
npm install
npm run dev:chat
# mở http://localhost:5173 — nhấn D để mở Dev overlay
```

## Cấu trúc

```
apps/web-chat     giao diện chat (Vite + React + Tailwind)
packages/ui       design tokens dùng chung
PLAN.md           kế hoạch chi tiết từng ngày
RESEARCH.md       các project tương tự & cách Twitch/Discord/Slack/LinkedIn làm
```

## Lộ trình

1. v1 — 1 server, tìm điểm sập
2. Dồn tải 1 server — gom tin theo lô, xử lý client chậm
3. Scale ngang — Redis pub/sub
4. Lưu trữ — Redis Streams + Postgres ghi theo lô
5. Chịu lỗi — tắt server giữa chừng, không mất tin
6. Node vs Go

Chi tiết trong [PLAN.md](PLAN.md).

---

*Tên: **Noisy** (chat livestream rất ồn) + **Fina** (đặt lúc đang uống Aquafina 💧).*
