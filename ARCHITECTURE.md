# 🏗️ WhiteCat Architecture

## Tổng Quan

**1 Source, Modular Design** - Bot Discord + Web API trong cùng 1 repository, chia modules rõ ràng.

```
whitecat-remake/
├── src/
│   ├── bot/                 # Discord Bot (discord.js)
│   ├── web/                 # Web API (Express)
│   ├── shared/              # Shared code
│   └── index.ts             # Main entry
│
├── database/
│   └── schema.sql           # PostgreSQL schema
│
└── package.json
```

---

## 📂 Chi Tiết Cấu Trúc

### 1. **src/bot/** - Discord Bot

```
src/bot/
├── commands/
│   ├── economy/           # /balance, /daily, /transfer
│   ├── hosting/           # /hosting, /renew
│   ├── fun/               # /meme, /8ball
│   ├── admin/             # /ban, /stats
│   └── index.ts
│
├── events/
│   ├── ready.ts           # Bot ready
│   ├── interactionCreate.ts
│   └── guildCreate.ts
│
├── bot.ts                 # Discord client setup
└── index.ts               # Export bot instance
```

**Chạy:** `npm run dev:bot` hoặc `ts-node src/bot/index.ts`

---

### 2. **src/web/** - Web API

```
src/web/
├── routes/
│   ├── auth.ts            # OAuth routes
│   ├── economy.ts         # GET /api/economy/:userId
│   ├── hosting.ts         # GET/POST /api/hosting
│   └── stats.ts           # GET /api/stats
│
├── controllers/
│   ├── authController.ts
│   ├── economyController.ts
│   └── hostingController.ts
│
├── middleware/
│   ├── auth.ts            # JWT verification
│   └── rateLimit.ts
│
├── server.ts              # Express setup
└── index.ts
```

**Chạy:** `npm run dev:web` hoặc `ts-node src/web/index.ts`

---

### 3. **src/shared/** - Shared Code (QUAN TRỌNG!)

Đây là nơi chứa code dùng chung cho cả bot & web.

```
src/shared/
├── database/
│   ├── config.ts          # DB connection
│   ├── init.ts            # Schema init
│   │
│   ├── models/            # Database models
│   │   ├── User.ts
│   │   ├── Economy.ts
│   │   ├── Hosting.ts
│   │   └── Guild.ts
│   │
│   └── queries/           # Reusable queries
│       ├── userQueries.ts
│       ├── economyQueries.ts
│       └── hostingQueries.ts
│
├── services/              # Business logic
│   ├── economyService.ts  # addCoins(), transfer()
│   ├── hostingService.ts  # createHosting(), renew()
│   ├── authService.ts     # OAuth flow
│   └── webhookService.ts
│
├── utils/
│   ├── logger.ts          # Logging utility
│   ├── validators.ts      # Input validation
│   └── formatters.ts      # Format messages
│
├── types/
│   ├── database.d.ts      # DB types
│   ├── discord.d.ts
│   └── api.d.ts
│
└── constants.ts           # Shared constants
```

---

### 4. **src/index.ts** - Main Entry Point

```typescript
import { startBot } from './bot';
import { startWeb } from './web';
import { initDatabase } from './shared/database/init';
import { logger } from './shared/utils/logger';

async function main() {
  try {
    // 1. Initialize database
    logger.info('Initializing database...');
    await initDatabase();

    // 2. Start Discord bot
    logger.info('Starting Discord bot...');
    await startBot();

    // 3. Start web server
    logger.info('Starting web server...');
    await startWeb();

    logger.info('✅ All services started successfully!');
  } catch (error) {
    logger.error('Failed to start services:', error);
    process.exit(1);
  }
}

main();
```

**Chạy cả 2:** `npm run dev` hoặc `npm start`

---

## 🔄 Data Flow Example

### Ví dụ: User dùng lệnh `/daily` trên Discord

```
1. User: /daily
   ↓
2. bot/commands/economy/daily.ts
   ↓
3. shared/services/economyService.ts → claimDaily()
   ↓
4. shared/database/queries/economyQueries.ts → updateCoins()
   ↓
5. PostgreSQL → Update user_economy table
   ↓
6. Return → Show embed "You claimed 1000 coins!"
```

### Ví dụ: User check balance trên Website

```
1. User: Visit website → GET /api/economy/123456
   ↓
2. web/routes/economy.ts
   ↓
3. web/controllers/economyController.ts
   ↓
4. shared/services/economyService.ts → getBalance()
   ↓
5. shared/database/queries/economyQueries.ts → SELECT
   ↓
6. Return JSON: { coins: 5000, points: 200 }
```

**Lưu ý:** Cả bot & web đều dùng chung `shared/services/economyService.ts`!

---

## 📊 Database Architecture

### Simplified Schema (chỉ giữ essentials)

```
Core Tables:
- users              (Discord user info + OAuth)
- user_economy       (coins, points, streaks)
- guilds             (server settings)

Optional Features (có thể bật/tắt):
- transactions       (nếu cần history chi tiết)
- hosting_*          (nếu có feature hosting)
- giveaways_*        (nếu có feature giveaway)
- webhooks_*         (nếu có webhook API)
```

**Principle:** Chỉ tạo bảng cho features bạn thực sự cần ngay!

---

## 🚀 Deployment Strategy

### Development
```bash
npm run dev         # Start cả bot & web
npm run dev:bot     # Chỉ bot
npm run dev:web     # Chỉ web
```

### Production

**Option 1: Single Process (đơn giản nhất)**
```bash
npm run build
npm start           # Chạy cả bot & web trong 1 process
```

**Option 2: Separate Processes (recommend cho production)**
```bash
# Terminal 1
npm run start:bot

# Terminal 2
npm run start:web
```

Hoặc dùng **PM2**:
```bash
pm2 start ecosystem.config.js
```

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'whitecat-bot',
      script: 'dist/bot/index.js',
      instances: 1,
    },
    {
      name: 'whitecat-web',
      script: 'dist/web/index.js',
      instances: 2,  // Load balance API
    }
  ]
}
```

---

## 🔒 Environment Variables

```env
# Discord
DISCORD_TOKEN=
CLIENT_ID=
CLIENT_SECRET=

# Database (chung cho bot & web)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whitecat
DB_USER=postgres
DB_PASSWORD=

# Web API
API_PORT=3000
JWT_SECRET=
CORS_ORIGIN=https://yourdomain.com

# Features (enable/disable)
FEATURE_HOSTING=true
FEATURE_GIVEAWAY=true
FEATURE_WEBHOOKS=false
```

---

## 🎯 Khi Nào Nên Tách Thành Microservices?

Chỉ tách khi:

1. **Traffic quá lớn**
   - Bot: >100k servers
   - API: >1M requests/day

2. **Team lớn**
   - Team A: Bot
   - Team B: API
   - Cần develop độc lập

3. **Scale requirements khác nhau**
   - Bot cần scale theo số servers
   - API cần scale theo HTTP traffic

4. **Technology stack khác nhau**
   - Bot: Python/Java
   - API: Node.js/Go

**→ Với bot nhỏ đến trung bình: 1 source là đủ và tối ưu nhất!**

---

## ✨ Benefits của Architecture Này

### ✅ Cho Developer
- Code 1 lần, dùng cả bot & web
- Dễ debug (1 repo, 1 codebase)
- Hot reload nhanh
- TypeScript type safety xuyên suốt

### ✅ Cho Deployment
- 1 Docker image
- 1 CI/CD pipeline
- Dễ rollback
- Config đơn giản

### ✅ Cho Maintenance
- Bug fix 1 lần
- Database migration đồng bộ
- Dependency management đơn giản
- Documentation tập trung

---

## 🛠️ Next Steps

1. **Setup cơ bản** (✅ Done)
   - Database schema
   - Config files

2. **Implement shared layer** (Next)
   - Models
   - Services
   - Queries

3. **Build bot commands** (After)
   - Economy commands
   - Admin commands

4. **Build web API** (After)
   - Auth routes
   - Economy endpoints

5. **Frontend** (Optional)
   - React/Vue dashboard
   - OAuth integration

---

Made with ❤️ by GauCandy
