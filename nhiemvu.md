# WhiteCat Bot - Kế hoạch thực hiện

---

## ✅ BƯỚC 0: Nghiên cứu (XONG)
- Đã xác định features: Nekobest API, Economy, Hosting, Giveaway
- Đã xác định data cần lưu
- Tech stack: TypeScript + PostgreSQL + Redis

---

## 📐 BƯỚC 1: Thiết kế Database Schema
**Phụ thuộc:** Không (bắt đầu từ đây)

### Làm gì:
- Vẽ ERD (Entity Relationship Diagram)
- Thiết kế chi tiết từng bảng:
  - Users (discord_id, email, oauth_level, tokens, language, wallet)
  - User_Bans (user_id, reason, expires_at)
  - Guilds (guild_id, prefix, language, settings)
  - Hosting_Plans (name, price, specs)
  - User_Hostings (user_id, plan_id, port, expires_at, auto_renew)
  - Hosting_Ports (port, is_allocated, hosting_id)
  - Reverse_Proxy (domain, port, ssl_enabled)
  - Transactions (user_id, type, amount, currency_type)
  - Giveaways (guild_id, prize, winners_count, end_time, participants)
  - Webhooks (guild_id, url, events)
- Xác định indexes
- Xác định constraints (foreign keys, unique, not null)
- Viết migration scripts

### Output:
- [ ] File ERD diagram
- [ ] Migration files (.sql)
- [ ] Seeds data (test data)

---

## 🗄️ BƯỚC 2: Setup Database & Redis
**Phụ thuộc:** BƯỚC 1 (có schema rồi)

### Làm gì:
- Setup PostgreSQL (Docker hoặc local)
- Setup Redis (cache & sessions)
- Run migrations
- Test CRUD operations
- Setup connection pool
- Setup ORM (Prisma/TypeORM/Sequelize)

### Output:
- [ ] PostgreSQL running
- [ ] Redis running
- [ ] Database models/entities
- [ ] Connection successful

---

## 🔐 BƯỚC 3: OAuth Discord System
**Phụ thuộc:** BƯỚC 2 (cần lưu tokens vào DB)

### Làm gì:
- Tạo Discord Application
- Config OAuth scopes:
  - Basic: `identify`, `guilds`
  - Advanced: `identify`, `guilds`, `email`
- Tạo OAuth Service (API)
- Flow: Authorization Code → Token Exchange → Lưu DB
- Token refresh logic
- Phân cấp: none/basic/advanced

### Output:
- [ ] OAuth endpoints hoạt động
- [ ] Token lưu DB encrypted
- [ ] Refresh token tự động

---

## 🔑 BƯỚC 4: Permission System
**Phụ thuộc:** BƯỚC 3 (cần OAuth để phân quyền)

### Làm gì:
- Tạo Permission Service
- Middleware check permission
- Cache permission trong Redis (TTL 5 phút)
- Logic check:
  - Command cần level gì?
  - User có level đủ không?
  - User bị ban không?

### Output:
- [ ] Permission middleware
- [ ] Permission caching
- [ ] Ban check logic

---

## 🌐 BƯỚC 5: Internal API Service
**Phụ thuộc:** BƯỚC 2, 3, 4 (cần DB + OAuth + Permission)

### Làm gì:
- Setup Express/Fastify với TypeScript
- Route structure
- Endpoints:
  - Auth: `/auth/oauth/*`, `/auth/user/:id`
  - Economy: `/wallet/:userId`, `/transactions`
  - Hosting: `/hosting/plans`, `/hosting/purchase`, `/hosting/:id`
  - Proxy: `/proxy/resolve?domain=xxx`
  - Giveaway: `/giveaway/create`, `/giveaway/:id/join`
  - Webhooks: `/webhooks/register`, `/webhooks/:id/trigger`
- Middleware: auth, rate limit, error handler
- Validation (Zod/Joi)

### Output:
- [ ] API service chạy được
- [ ] Tất cả endpoints test OK
- [ ] API documentation (Swagger)

---

## 🌍 BƯỚC 6: i18n System
**Phụ thuộc:** BƯỚC 5 (API cần serve translations)

### Làm gì:
- Setup i18next
- Tạo translation files:
  - `locales/vi.json`
  - `locales/en.json`
  - `locales/jp.json` (nếu cần)
- Translation Service trong API
- Auto-detect language từ:
  - User setting trong DB
  - Discord locale
  - Guild setting
- Fallback: vi → en

### Output:
- [ ] Translation files đầy đủ
- [ ] API endpoint `/i18n/:locale`
- [ ] Language detection logic

---

## 🤖 BƯỚC 7: Bot Core Framework
**Phụ thuộc:** BƯỚC 5, 6 (cần API + i18n)

### Làm gì:
- Init Discord.js bot
- Command Base Class:
  ```typescript
  abstract class Command {
    name: string;
    description: Record<string, string>; // Multi-lang
    oauthRequired: 'none' | 'basic' | 'advanced';
    async execute(interaction, apiClient, i18n);
  }
  ```
- Command Loader (auto-load từ folders)
- Command Router
- Event Handler (ready, interactionCreate, guildCreate)
- API Client (gọi internal API)
- Middleware:
  - Permission check (qua API)
  - Language loader
  - Error handler
  - Rate limiter

### Output:
- [ ] Bot online
- [ ] Command system hoạt động
- [ ] Tích hợp API thành công

---

## 🎮 BƯỚC 8: Commands Implementation
**Phụ thuộc:** BƯỚC 7 (có framework rồi)

### Làm gì:
- **Basic commands** (oauth: none):
  - `/ping` - Latency
  - `/help` - Command list
  - `/server` - Server info
  - `/nekobest <action>` - Gọi Nekobest API
  
- **Standard commands** (oauth: basic):
  - `/profile` - User profile + wallet
  - `/balance` - Check tiền
  - `/daily` - Claim daily reward
  - `/leaderboard` - Top users
  - `/language` - Đổi ngôn ngữ
  
- **Advanced commands** (oauth: advanced, cần email):
  - `/hosting buy` - Mua hosting
  - `/hosting list` - List hostings
  - `/hosting renew` - Gia hạn
  - `/hosting manage` - Quản lý hosting
  - `/giveaway create` - Tạo giveaway
  - `/admin ban` - Ban user

### Output:
- [ ] Tất cả commands hoạt động
- [ ] Permission check đúng
- [ ] Multi-language

---

## 🎁 BƯỚC 9: Giveaway System
**Phụ thuộc:** BƯỚC 8 (có commands)

### Làm gì:
- Giveaway Service (API)
- Create/Join/End giveaway
- Random picker (công bằng)
- Cronjob check expired giveaways
- DM winners
- Log results

### Output:
- [ ] Giveaway hoạt động end-to-end
- [ ] Auto-end khi hết hạn
- [ ] Winners được thông báo

---

## 🖥️ BƯỚC 10: Hosting System
**Phụ thuộc:** BƯỚC 8 (có commands mua hosting)

### Làm gì:
- Hosting Service (API)
- Port allocation logic
- Purchase workflow:
  - Check email có không
  - Check đủ tiền không
  - Allocate port
  - Create hosting record
  - Deduct money
  - Log transaction
- Auto-renew cronjob
- Suspend expired hostings
- API endpoint cho proxy: `/proxy/resolve?domain=xxx`

### Output:
- [ ] Mua hosting thành công
- [ ] Port được cấp
- [ ] Auto-renew hoạt động
- [ ] Proxy API hoạt động

---

## 🔗 BƯỚC 11: Webhook System
**Phụ thuộc:** BƯỚC 5 (cần API)

### Làm gì:
- Webhook Service
- Register/Trigger/Delete webhooks
- Event queue (Bull/BullMQ)
- Retry failed webhooks
- Webhook logs

### Output:
- [ ] Webhook register thành công
- [ ] Trigger webhook OK
- [ ] Queue hoạt động

---

## 🌐 BƯỚC 12: Web Dashboard
**Phụ thuộc:** BƯỚC 3, 5 (cần OAuth + API)

### Làm gì:
- Setup Next.js/React
- Pages:
  - Landing page (giới thiệu bot)
  - Bot invite page
  - Login (OAuth Discord)
  - Dashboard (profile, wallet, hostings)
  - Admin panel
  - Giveaway management
  - Webhook management
- i18n cho web
- Responsive design

### Output:
- [ ] Web hoạt động
- [ ] OAuth login OK
- [ ] Dashboard đầy đủ features

---

## 🧪 BƯỚC 13: Testing & Bug Fixes
**Phụ thuộc:** Tất cả (test toàn bộ)

### Làm gì:
- Unit tests (services, utils)
- Integration tests (API endpoints)
- E2E tests (bot commands)
- Load testing (API + bot)
- Security testing
- Fix bugs tìm được

### Output:
- [ ] Test coverage > 70%
- [ ] Không có critical bugs
- [ ] Performance tốt

---

## 🚀 BƯỚC 14: Deployment
**Phụ thuộc:** BƯỚC 13 (đã test xong)

### Làm gì:
- Chọn hosting (VPS/Railway/Fly.io)
- Docker setup:
  - Bot container
  - API container
  - Web container
  - PostgreSQL container
  - Redis container
- CI/CD (GitHub Actions)
- Environment variables
- Domain & SSL
- Monitoring (logs, errors, metrics)
- Backup strategy

### Output:
- [ ] Bot online 24/7
- [ ] API accessible
- [ ] Web live
- [ ] Monitoring active
