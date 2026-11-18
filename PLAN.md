# NoisyFina: Kế hoạch

> *Một phòng chat, 50.000 người, và tất cả những lần nó sập.*

Tên ghép từ **Noisy** (chat livestream rất ồn) và **Fina** (lấy từ Aquafina, đặt lúc đang uống 💧).

- **Mục đích:** CV / phỏng vấn + tự học system design
- **Bài toán:** chat livestream, một phòng rất đông người (kiểu Twitch hoặc YouTube Live)
- **Ngôn ngữ:** Node.js / TypeScript trước, sau viết lại server chat bằng Go để so sánh
- **Mục tiêu tải:** không đặt trước. Đẩy đến khi sập rồi ghi lại trung thực
- **Hạ tầng:** 1 VPS chạy app (Docker Compose) + VPS tính giờ để dội tải
- **Kỹ thuật trọng tâm:** cache (Redis), queue, scale DB, chịu lỗi + giám sát
- **UI/UX:** phải thật đẹp, cả giao diện chat lẫn trang khoe

---

## 0. Tóm tắt

**Cái khó cốt lõi là phát tin ra cho mọi người (fan-out).** Phòng 50.000 người, mỗi giây 200 tin, tức là phải gửi đi 200 × 50.000 = **10 triệu tin mỗi giây**. Project xoay quanh việc gửi được chừng đó tin: gom tin theo lô, chia phòng ra nhiều server, bỏ bớt tin khi quá tải.

**Câu chuyện trên trang khoe, theo từng chương:**
1. v1: 1 server. Sập ở đâu, vì sao?
2. Dồn tối đa tải vào 1 server: gom tin theo lô, xử lý client chậm
3. Scale ngang: Redis pub/sub
4. Lưu trữ: queue + Postgres ghi theo lô
5. Chịu lỗi: tắt hẳn một server, không mất tin
6. Node và Go

**Thời gian:** khoảng 30 ngày làm việc (mỗi ngày 4–6 tiếng) + 6 ngày dự phòng.

> AI giúp code nhanh, nhưng **không** làm nhanh được: chờ load test chạy, đọc biểu đồ tìm chỗ nghẽn, xử lý trục trặc của VPS thật. Kế hoạch đã chừa thời gian cho những việc này.

---

## 1. Thêm và bớt so với ý tưởng ban đầu

### Bỏ hoặc hoãn
| Bỏ | Lý do |
|---|---|
| Kubernetes | Làm chương mở rộng sau |
| Kafka | Redis Streams đủ dùng ở quy mô này, ít thành phần hơn. Ghi thành quyết định thiết kế (ADR) |
| Sharding DB | Chưa cần. Partition theo ngày là đủ. Giải thích được *vì sao chưa cần* là điểm cộng |
| Đăng nhập đầy đủ | Vào bằng nickname ẩn danh, đăng nhập không phải trọng tâm |

### Thêm
| Thêm | Lý do |
|---|---|
| Giám sát từ ngày đầu | Chưa đo được thì chưa có gì để kể |
| ADR (ghi quyết định thiết kế) | Mỗi lựa chọn một file: vì sao chọn, đã bỏ phương án nào. Nguyên liệu cho trang khoe |
| Xử lý client chậm + slow mode | Cái khó nhất của chat livestream |
| Kết nối lại có jitter | Một server chết làm hàng nghìn người kết nối lại cùng lúc, dễ đánh sập phần còn lại (thundering herd) |
| Dev overlay trên giao diện chat | Bấm vào thấy mình đang ở server nào, độ trễ từng tin. Nối phần đẹp với phần kỹ thuật |
| Kết quả test lưu thành JSON | Trang khoe đọc số liệu thật, không phải gõ tay |
| Contract test cho giao thức | Bản Go nói chuyện được với giao diện y như bản Node |
| Mỗi server chỉ nghe các phòng nó đang có người | Tránh lỗi "mọi tin gửi đến mọi server" mà Socket.IO Redis adapter đang gặp (xem RESEARCH.md) |
| Gộp các truy vấn lịch sử giống nhau | Học từ Discord: 10.000 người cùng vào phòng thì gộp lại còn 1 truy vấn DB |
| Theo dõi số cổng tạm (ephemeral port) ở nginx | Học từ LinkedIn: kết nối giữ lâu dễ làm cạn cổng tạm của load balancer |

---

## 2. Stack và cấu trúc repo

```
NoisyFina/                    (monorepo pnpm + Turborepo)
├── apps/
│   ├── gateway-node/         ws (sau có thể thử uWebSockets.js)
│   ├── gateway-go/           coder/websocket hoặc gorilla/websocket
│   ├── writer/               worker: Redis Streams → Postgres
│   ├── web-chat/             Vite + React + Tailwind + Motion
│   └── showcase/             Astro + React islands (web tĩnh)
├── packages/
│   ├── protocol/             schema tin nhắn (zod) + contract test
│   └── ui/                   design tokens + component dùng chung
├── loadtest/
│   ├── k6/                   script nhỏ, kiểm tra nhanh
│   ├── go-client/            giả lập nhiều kết nối, nhẹ
│   └── results/              JSON kết quả → trang khoe đọc
├── infra/                    docker-compose, nginx, prometheus, grafana, script thuê/hủy VPS
└── docs/
    ├── slo.md                định nghĩa "sập"
    ├── adr/                  quyết định thiết kế
    └── chapters/             ghi chú từng chương
```

### Kiến trúc đích (v4)
```
Người xem ──▶ nginx ──▶ [Chat server 1] ◀──┐
                    ├─▶ [Chat server 2] ◀──┼── Redis (pub/sub + Streams + presence)
                    └─▶ [Chat server 3] ◀──┘           │
                                                    writer (consumer group)
                                                       │  COPY theo lô
                                                  Postgres (primary) ──▶ replica (đọc lịch sử)

Prometheus ◀── /metrics từ tất cả ──▶ Grafana
```

---

## 3. Lịch chi tiết

### Giai đoạn 0: Chuẩn bị (Ngày 1–2)
| Ngày | Việc | Xong khi |
|---|---|---|
| **1** | Dựng monorepo, CI (lint, typecheck, test). Viết schema giao thức: `join`, `msg`, `batch`, `presence`, `resume`, `notice`. **Định nghĩa "sập"** trong `docs/slo.md`: p99 > 1 giây, hoặc mất > 0,5% tin, hoặc > 1% kết nối lỗi. Chọn nhà cung cấp VPS (cần tính giờ + mạng nội bộ), **đọc kỹ chính sách sử dụng (AUP)**, tạo tài khoản | CI xanh, có `slo.md` |
| **2** | **Định hướng thiết kế:** gom ảnh tham khảo (Twitch, Kick, Linear, Vercel, Raycast). Chốt design tokens (màu, font, khoảng cách, bo góc, shadow, thời lượng và đường cong chuyển động). Vẽ khung giao diện chat và trang khoe | Có file tokens + 2 khung giao diện |

**Định hướng thiết kế:**
- Nền tối, cảm giác phòng điều khiển phát sóng. Có chế độ sáng nhưng tối là mặc định
- Một màu nhấn duy nhất, các màu trạng thái (ok, cảnh báo, sập) dùng nhất quán
- Font: Geist hoặc Inter cho chữ, JetBrains Mono / Geist Mono cho số liệu (số cùng độ rộng)
- Chuyển động có mục đích: tin mới trượt vào, số đếm chạy, đường nối có gói tin chạy. Tôn trọng `prefers-reduced-motion`

### Giai đoạn 1: v1, một server + giám sát (Ngày 3–6)
| Ngày | Việc | Xong khi |
|---|---|---|
| **3** | Server chat Node (`ws`): vào phòng, phát tin, ping/pong phát hiện kết nối chết. `/metrics`: số kết nối, tin vào/ra mỗi giây, độ trễ event loop, RAM | 2 tab chat được với nhau |
| **4** | **Giao diện chat v1:** khung video (lặp video miễn phí bản quyền hoặc hình động bằng canvas), khung chat dùng virtualized list, số người xem chạy live, đèn trạng thái kết nối, nhập nickname | Đẹp ngay từ v1, 1.000 tin/giây không lag |
| **5** | Docker Compose: server chat + Prometheus + Grafana + node_exporter. Dashboard "Gateway overview". Deploy lên VPS | Xem được Grafana trên VPS |
| **6** | Script k6: 95% người nghe, 5% người gửi, độ trễ đo bằng giờ gắn trong tin (người gửi và người nhận trên cùng máy để đồng hồ khớp). Script thuê VPS → chạy test → lấy JSON → hủy VPS. **Chạy lần đầu, tìm điểm sập** (thường là ulimit), chỉnh sysctl, chạy lại | `results/v1-*.json` + `chapters/01.md` |

✅ **Tự kiểm tra:** giải thích được vì sao sập mà không cần AI.

### Giai đoạn 2: Dồn tối đa tải vào 1 server (Ngày 7–10)
| Ngày | Việc | Xong khi |
|---|---|---|
| **7** | **Gom tin theo lô:** mỗi 50–100ms gom tin của phòng thành 1 frame. Đo trước và sau | Biểu đồ trước/sau |
| **8** | **Xử lý client chậm:** theo dõi `bufferedAmount`, client đọc không kịp thì bỏ bớt hoặc chỉ gửi mẫu. Slow mode. Giao diện hiện thông báo trung thực: "Phòng đang rất đông, hiển thị một phần tin" | Client chậm không kéo cả server chậm theo |
| **9** | **Client giả lập bằng Go:** nhẹ hơn k6, chạy nhiều máy load-test song song. Lưu ý giới hạn khoảng 60.000 cổng mỗi máy tới cùng một đích | 1 máy load-test giữ được hơn 30 nghìn kết nối |
| **10** | Chạy chuỗi test, tìm giới hạn mới. Tùy chọn: thử MessagePack thay JSON | `chapters/02.md` |

### Giai đoạn 3: Scale ngang (Ngày 11–14)
| Ngày | Việc | Xong khi |
|---|---|---|
| **11** | Nhiều container server chat, nginx đứng trước (nâng kết nối lên WebSocket, `least_conn`). Theo dõi số cổng tạm và giới hạn kết nối của chính nginx | Người dùng được chia đều |
| **12** | **Redis pub/sub** theo kênh của từng phòng. Mỗi server chỉ nghe các phòng nó đang có người. Đếm người xem qua Redis. **Dev overlay** trên giao diện | 2 người ở 2 server khác nhau chat được với nhau |
| **13** | So sánh 1, 2 và 4 server. Redis có thành chỗ nghẽn không? Tùy chọn: thử sharded pub/sub của Redis 7 | Biểu đồ khả năng scale |
| **14** | `chapters/03.md` + ADR: Redis pub/sub so với NATS, và so với cách của Slack (consistent hashing) | |

### Giai đoạn 4: Lưu trữ và DB (Ngày 15–18)
| Ngày | Việc | Xong khi |
|---|---|---|
| **15** | Redis Streams làm nhật ký tin nhắn, ID theo ULID. Vào phòng thấy ngay 50 tin gần nhất | |
| **16** | Worker `writer`: đọc stream theo consumer group, ghi vào Postgres theo lô bằng `COPY`. Bảng partition theo ngày, index `(room_id, id)` | Tin nhắn vào được DB |
| **17** | API kéo lên xem lịch sử + read replica + **gộp các truy vấn giống nhau**. **So sánh: mỗi tin một INSERT và ghi theo lô** | Biểu đồ trước/sau |
| **18** | `chapters/04.md` + ADR: vì sao chưa cần sharding | |

### Giai đoạn 5: Chịu lỗi (Ngày 19–21)
| Ngày | Việc | Xong khi |
|---|---|---|
| **19** | Client tự kết nối lại: chờ lâu dần mỗi lần thử + jitter, nhận tiếp từ ID tin cuối. Server tắt có trật tự: báo client chuyển đi trước khi tắt | |
| **20** | **Chaos test:** tắt một server giữa lúc test. Đo đợt kết nối lại ồ ạt có và không có jitter. Kiểm tra số tin mất có bằng 0 không | Biểu đồ "đợt kết nối lại ồ ạt" |
| **21** | Cảnh báo trong Grafana. `chapters/05.md` | |

### Giai đoạn 6: Viết lại bằng Go (Ngày 22–24)
| Ngày | Việc | Xong khi |
|---|---|---|
| **22–23** | Server chat bằng Go: cùng giao thức, cùng tên metrics, contract test chạy qua | Giao diện chạy với cả 2 bản mà không sửa |
| **24** | So sánh trên cùng phần cứng: RAM mỗi kết nối, p99, CPU. **Kết quả thế nào ghi thế ấy** | `chapters/06.md` |

### Giai đoạn 7: Trang khoe + đánh bóng UI/UX (Ngày 25–30)
| Ngày | Việc | Xong khi |
|---|---|---|
| **25** | Khung trang khoe bằng Astro. Phần đầu trang có 3 con số lớn lấy thẳng từ `results/*.json` | |
| **26** | **Sơ đồ kiến trúc tương tác** (SVG): gói tin chạy trên đường nối, chuyển giữa v1 → v5 | Phần đẹp nhất |
| **27** | Biểu đồ (uPlot hoặc visx) + **trình phát lại load test**: biểu đồ và sơ đồ chạy đồng bộ | |
| **28** | Viết các chương từ ghi chú: quyết định và đánh đổi, những gì chưa làm được | |
| **29** | **Đánh bóng:** chuyển động, giao diện điện thoại, sáng/tối, accessibility, Lighthouse > 95, OG image | |
| **30** | Gia cố phòng demo công khai: giới hạn tần suất gửi, lọc từ cấm cơ bản. Deploy, README có GIF, đăng LinkedIn | 🚀 **Ra mắt** |

### Ngày 31–36: Dự phòng
Hạ tầng thật luôn có bất ngờ. Không dùng đến thì làm Kubernetes, uWebSockets.js, hoặc sharded pub/sub.

---

## 4. Trang khoe: cấu trúc

```
┌───────────────────────────────────────────┐
│ NoisyFina                                 │
│ "Một phòng chat, 50.000 người,            │
│  và tất cả những lần nó sập."             │
│  [số người tối đa] [p99] [tỉ lệ mất tin]  │
├───────────────────────────────────────────┤
│ [Sơ đồ kiến trúc]  ◀ v1  v2  v3  v4  v5 ▶ │
├───────────────────────────────────────────┤
│ Chương 1–6: mỗi chương có                 │
│   vấn đề → biểu đồ trước → cách sửa       │
│   → biểu đồ sau → đoạn code then chốt     │
├───────────────────────────────────────────┤
│ ▶ Phát lại load test (biểu đồ + sơ đồ)    │
├───────────────────────────────────────────┤
│ Quyết định và đánh đổi · Chưa làm được gì │
├───────────────────────────────────────────┤
│ 💬 Phòng chat thật, vào thử được          │
└───────────────────────────────────────────┘
```

- **Không có nút "bấm để load-test"**, vì ai cũng dội được tải vào server và tốn tiền. Phát lại các lần test đã ghi
- Web tĩnh trên Cloudflare Pages, miễn phí

---

## 5. Chi phí (ước tính, kiểm tra lại giá thật)

| Khoản | Giá |
|---|---|
| VPS app (4 CPU / 8GB) | khoảng 200–300k mỗi tháng |
| VPS load-test tính giờ | chỉ bật lúc test, vài nghìn đồng mỗi lần |
| Trang khoe (Cloudflare Pages) | 0đ |
| **Tổng** | **khoảng 250–400k mỗi tháng** |

### An toàn khi load test
- Máy load-test **cùng nhà cung cấp, cùng datacenter, dùng mạng nội bộ**
- Đọc chính sách sử dụng (AUP) trước khi test
- Không test qua Cloudflare, bắn thẳng vào server
- **Không bao giờ load-test trên VPS đang chạy interviewly hay project khác**

---

## 6. Nguyên tắc khi dùng AI
1. **AI viết code, bạn quyết định thiết kế.** Mỗi ADR tự viết bằng lời của mình
2. **Cuối mỗi giai đoạn, tự giải thích lại mà không nhìn tài liệu:** vì sao sập, sửa thế nào. Không giải thích được thì chưa qua giai đoạn
3. **Không chỉnh số liệu.** Số xấu mà thật vẫn hơn số đẹp mà giả

---

## 7. Tiến độ

- [ ] GĐ 0: Chuẩn bị (Ngày 1–2)
- [ ] GĐ 1: v1 + giám sát (Ngày 3–6)
- [ ] GĐ 2: Dồn tải 1 server (Ngày 7–10)
- [ ] GĐ 3: Scale ngang (Ngày 11–14)
- [ ] GĐ 4: Lưu trữ và DB (Ngày 15–18)
- [ ] GĐ 5: Chịu lỗi (Ngày 19–21)
- [ ] GĐ 6: Go (Ngày 22–24)
- [ ] GĐ 7: Trang khoe + UI/UX (Ngày 25–30)
- [ ] 🚀 Ra mắt

Xem thêm: [RESEARCH.md](RESEARCH.md): các project tương tự và cách doanh nghiệp làm.
