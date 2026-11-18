# NoisyFina: Nghiên cứu

Ngày: 2026-11-18. Nguồn ở cuối file. Một số con số chỉ lấy từ nguồn thứ cấp (blog tổng hợp, trang luyện phỏng vấn), có ghi chú ⚠️ là **chưa kiểm chứng**.

---

## 1. Các project tương tự trên GitHub

### A. Server realtime dùng ngay được (hạ tầng)
| Project | Điểm mạnh | Điểm yếu |
|---|---|---|
| **Centrifugo** (Go) | Đầy đủ tính năng nhất: nhiều transport (WebSocket, SSE, gRPC, WebTransport), scale ngang qua Redis hoặc NATS, có lịch sử tin và khôi phục sau mất kết nối | Có giao thức riêng nên client phải dùng SDK của nó. Là "hộp đen" có sẵn, không dạy được bạn vì sao nó chạy |
| **Soketi** (TypeScript, AGPL) | Tương thích Pusher, client Pusher cũ dùng được ngay. Scale qua Redis | Tài liệu bị chê. Giấy phép AGPL. Dự án con kế nhiệm (Sockudo, viết bằng Rust) cho thấy bản gốc đang chững lại |
| **Socket.IO + Redis adapter** | Phổ biến nhất trong Node, dễ bắt đầu | Thiết kế cũ **gửi mọi tin của mọi phòng đến mọi server**, nhiều server và nhiều phòng thì phí. Có bản sharded (Redis 7+) nhưng phải tự bật. Không tự khôi phục trạng thái khi lỗi |

**Bài học cho NoisyFina:** không cạnh tranh với những tool này. NoisyFina là **case study có số đo**, cho thấy những tool như vậy giải quyết vấn đề gì bên trong. Có thể thêm một chương "so với Centrifugo trên cùng phần cứng".

### B. Demo và bài nói về hiệu năng
| Project | Điểm mạnh | Điểm yếu |
|---|---|---|
| **eranyanay/1m-go-websockets** (khoảng 6k sao) | Kinh điển: hơn 1 triệu kết nối WebSocket dưới 1GB RAM bằng Go thuần, kèm slide GopherCon 2019 | Chỉ giữ kết nối, **không có chat thật**, không fan-out, không lưu trữ, không chịu lỗi. Đứng im từ 2022, giấy phép AGPL |

**Bài học:** nó chứng minh *giữ kết nối* thì rẻ. Cái đắt là *phát tin* cho từng ấy kết nối, và đó là chỗ NoisyFina khác biệt.

### C. Project "scalable chat" kiểu portfolio (rất nhiều)
Ví dụ: rehan-adi/scalable-chat-app, bhaskarblur/distributed-chat-system, anuj-thakur-513/scalechat, amitrajitdas/websocket-scaling-poc, Aadarsh-guru/Scalable-Chat-System, iAdtya/Scalable-ChatterUp…

| Điểm mạnh chung | Điểm yếu chung |
|---|---|
| Đủ thành phần (WebSocket + Redis + Kafka + Docker Compose), có sơ đồ kiến trúc | **Gần như không có số đo.** Ghi là "scalable" nhưng không có bảng kết quả load test |
| | Dùng Kafka vì nghe xịn, không giải thích vì sao cần |
| | Không có chương chịu lỗi (tắt server thì sao?) |
| | Giao diện sơ sài |

**Ngoại lệ:** **CecoChat** (.NET/SignalR) có phần "load test bằng 2 máy" trong README. Đây là project hiếm hoi có đo đạc, nhưng ở dạng tài liệu kỹ thuật, không kể chuyện.

### 👉 Chỗ trống NoisyFina chiếm được
1. **Số đo thật, chạy lại được** (script + JSON kết quả công khai)
2. **Kể chuyện theo từng lần sập**, không chỉ trình bày kiến trúc cuối cùng
3. **Bài toán livestream** (một phòng cực đông), trong khi đa số project làm chat 1-1 hoặc nhóm nhỏ
4. **UI/UX đẹp** + sơ đồ tương tác + trình phát lại load test
5. **Giải thích vì sao KHÔNG dùng** Kafka hay sharding

---

## 2. Doanh nghiệp làm thế nào

### Twitch: chat livestream (giống NoisyFina nhất)
- Năm 2015 phát hơn **10 tỷ tin mỗi ngày** (blog chính thức)
- **Twitch Plays Pokémon (02/2014):** hàng chục nghìn người cùng gõ lệnh vào một phòng, chat suýt sập hoàn toàn. Có bài nói ở QCon SF. Đây đúng là bài toán "một phòng cực đông" của NoisyFina
- Chuyển từ monolith (Ruby on Rails) sang microservice. Hệ thống chat ban đầu chạy tốt cho đến khi các sự kiện game bùng nổ
- ⚠️ Nguồn thứ cấp: dùng giao thức kiểu IRC chạy trên WebSocket, Redis để fan-out

**Áp dụng:** chương 2 có thể mở đầu bằng chuyện Twitch Plays Pokémon.

### Discord: chat nhóm, quy mô cực lớn
- **Gateway viết bằng Elixir (BEAM VM):** mỗi client là một process, mỗi guild (server) cũng là một process. BEAM sinh ra để chạy hàng triệu process nhỏ
- **Điểm yếu họ tự nhận:** một guild process chỉ chạy trên một core, nên guild càng đông thì fan-out càng nặng. Đây là vấn đề "phòng nóng" (hot room), giống hệt bài toán livestream
- **Lưu trữ:** chuyển từ Cassandra sang ScyllaDB, cụm lớn nhất giảm từ 177 node xuống 72, độ trễ đuôi thấp hơn
- **Phân vùng nóng (hot partition):** kênh đông người bị đọc dồn vào một chỗ. Giải bằng một lớp dịch vụ dữ liệu viết bằng Rust, **gộp các truy vấn giống nhau** thành một

**Áp dụng:** NoisyFina gộp truy vấn lịch sử (Ngày 17). Ghi thêm ADR "phòng nóng": vì sao một phòng 50.000 người khó hơn 1.000 phòng 50 người.

### Slack: chat doanh nghiệp
- Các dịch vụ viết bằng Java: **Channel Server** (giữ kênh), **Gateway Server** (giữ kết nối WebSocket, trạng thái nằm trong RAM), Admin Server, Presence Server
- **Định tuyến:** dùng consistent hashing để biết kênh nào nằm ở Channel Server nào, cấu hình lưu trong Consul
- **Fan-out 2 tầng:** client đăng ký với Gateway, Gateway thay mặt client đăng ký với Channel Server. Tin đi Channel Server → các Gateway liên quan → client. Có thể chuyển sang Gateway ở region khác
- **Sự kiện thoáng qua** (đang gõ…) không lưu DB, đi luồng riêng
- ⚠️ Nguồn thứ cấp: khoảng 5 triệu phiên WebSocket đồng thời lúc cao điểm

**Áp dụng:** đây là phiên bản "trưởng thành" của Redis pub/sub. Viết ADR so sánh: NoisyFina dùng Redis làm tổng đài, Slack dùng Channel Server riêng với consistent hashing. Khi nào thì cần chuyển?

### LinkedIn: tin nhắn + tương tác trên live video
- Play Framework + Akka actor, dùng **SSE** (một chiều, server đẩy xuống) thay vì WebSocket
- Load test để **một máy giữ hàng trăm nghìn kết nối**
- Bẫy đáng chú ý: **cạn cổng tạm (ephemeral port) ở load balancer** vì kết nối không bao giờ đóng. Phải chỉnh cả socket backlog và giới hạn file descriptor
- **Live video:** cùng một nền tảng phục vụ số người xem, reaction và bình luận realtime. Dispatcher tra key-value store xem frontend nào cần nhận, mỗi frontend có bảng đăng ký trong RAM. Bài nói "Streaming a Million Likes/Second"

**Áp dụng:**
- Ngày 11: theo dõi cổng tạm ở nginx
- Ý tưởng cho một ADR: tin chat chỉ đi một chiều (server đẩy xuống) thì có cần WebSocket không, hay SSE là đủ? Với livestream, 95% người chỉ đọc
- Mô hình dispatcher + bảng đăng ký giống cách "mỗi server chỉ nghe phòng nó có người"

### Chưa tìm được
- **YouTube Live, Facebook Live:** không có bài kỹ thuật chính thức trong kết quả tìm. Có thể tìm thêm sau
- **Twitch 2023 "State of Engineering":** có hứa nói về chat nhưng chưa đọc được phần đó

---

## 3. Những điểm đưa vào PLAN.md

| Học từ | Thêm vào |
|---|---|
| Socket.IO adapter gửi mọi tin đến mọi server | Mỗi server chỉ nghe kênh của phòng nó có người (Ngày 12) |
| Discord gộp truy vấn | Gộp truy vấn lịch sử (Ngày 17) |
| Discord "guild process một core" | ADR phòng nóng |
| LinkedIn cạn cổng tạm | Theo dõi nginx (Ngày 11) |
| LinkedIn dùng SSE | ADR WebSocket hay SSE |
| Slack consistent hashing | ADR so sánh (Ngày 14) |
| Twitch Plays Pokémon | Mở đầu chương 2 |
| Project portfolio không có số đo | Khác biệt cốt lõi: số đo thật + chạy lại được |

---

## Nguồn
- [Centrifugo: so sánh chính thức](https://centrifugal.dev/docs/getting-started/comparisons)
- [Centrifugo, Mercure, Soketi (2026)](https://www.pistack.xyz/posts/centrifugo-vs-mercure-vs-soketi-self-hosted-websocket-push-server-2026/)
- [Các lựa chọn thay Soketi](https://sliplane.io/blog/5-awesome-soketi-alternatives)
- [Socket.IO Redis adapter: issue #510 về fan-out](https://www.github.com/socketio/socket.io-redis-adapter/issues/510)
- [Ably: scale Socket.IO](https://ably.com/topic/scaling-socketio) (đối thủ cạnh tranh, đọc với tinh thần phản biện)
- [eranyanay/1m-go-websockets](https://github.com/eranyanay/1m-go-websockets/blob/master/README.md)
- [CecoChat](https://www.github.com/cvetomir-todorov/CecoChat)
- [rehan-adi/scalable-chat-app](https://awesome.ecosyste.ms/projects/github.com%2Frehan-adi%2Fscalable-chat-app), [anuj-thakur-513/scalechat](https://awesome.ecosyste.ms/projects/github.com%2Fanuj-thakur-513%2Fscalechat), [amitrajitdas/websocket-scaling-poc](https://awesome.ecosyste.ms/projects/github.com%2Famitrajitdas%2Fwebsocket-scaling-poc)
- [Twitch Engineering: giới thiệu (2015)](https://blog.twitch.tv/en/2015/12/18/twitch-engineering-an-introduction-and-overview-a23917b71a25)
- [Twitch: Breaking the Monolith (2022)](https://blog.twitch.tv/en/2022/03/30/breaking-the-monolith-at-twitch)
- [QCon: Twitch Plays Pokémon, kiến trúc chat](https://qconsf.com/sf2016/node/24445.html)
- [Discord: How Discord Stores Trillions of Messages](https://discord.com/blog/how-discord-stores-trillions-of-messages)
- [InfoQ: Discord chuyển từ Cassandra sang ScyllaDB](https://www.infoq.com/news/2023/06/discord-cassandra-scylladb/)
- [Stream: Discord hoạt động thế nào](https://getstream.io/blog/how-discord-works/)
- [Slack Engineering: Real-time Messaging](https://slack.engineering/real-time-messaging/)
- [InfoQ: Slack real-time messaging](https://www.infoq.com/news/2023/04/real-time-messaging-slack/)
- [LinkedIn: hàng trăm nghìn kết nối trên một máy](https://engineering.linkedin.com/blog/2016/10/instant-messaging-at-linkedin--scaling-to-hundreds-of-thousands-)
- [LinkedIn: nền tảng presence realtime](https://engineering.linkedin.com/blog/2018/01/now-you-see-me--now-you-dont--linkedins-real-time-presence-platf)
- [InfoQ podcast: kiến trúc messaging realtime của LinkedIn](https://www.infoq.com/podcasts/linkedin-realtime-messaging-architecture)
- [Tóm tắt "Streaming a Million Likes/Second"](https://danniel1205.github.io/tech-notes/system-design/topics/realtime-interactions-on-live-video)
