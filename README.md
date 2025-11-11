# 🐱 WhiteCat Bot v4.0

Discord Bot với tích hợp Web API - Built with TypeScript, discord.js v14, và PostgreSQL.

## ✨ Features

- 💰 **Economy System** - Coins, points, premium currency với daily/weekly rewards
- 🖥️ **Hosting Service** - User tự chọn cấu hình RAM/CPU/Storage
- 🌐 **Reverse Proxy** - Domain mapping với SSL support
- 🎁 **Giveaway System** - Organized giveaways với requirements
- 🔗 **Webhooks** - Custom webhook integrations
- 📊 **Statistics** - Track usage và analytics

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Discord Bot Token

### 2. Installation

```bash
# Clone repo
git clone https://github.com/yourusername/whitecat-remake.git
cd whitecat-remake

# Install dependencies
npm install

# Copy env file
cp .env.example .env
```

### 3. Configuration

Edit `.env`:

```env
# Discord
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whitecat
DB_USER=postgres
DB_PASSWORD=your_password

# API
API_PORT=3000
```

### 4. Database Setup

```bash
# Create database
createdb whitecat

# Initialize tables
npm run db:init

# Seed initial data
npm run db:seed:all
```

### 5. Run

```bash
# Development (bot + web)
npm run dev

# Only bot
npm run dev:bot

# Only web
npm run dev:web

# Production
npm run build
npm start
```

---

## 📂 Project Structure

```
whitecat-remake/
├── src/
│   ├── bot/              # Discord bot
│   ├── web/              # Express API
│   └── shared/           # Shared code (models, services)
│
├── database/
│   └── schema.sql        # Database schema
│
└── docs/
    ├── ARCHITECTURE.md   # Architecture design
    └── DATABASE.md       # Database guide
```

---

## 🗄️ Database Commands

```bash
npm run db:init          # Create tables
npm run db:drop          # Drop all tables
npm run db:reset         # Drop + recreate

npm run db:seed:all      # Seed all data
npm run db:seed:ports    # Seed ports only
npm run db:seed:pricing  # Show hosting pricing
```

---

## 💻 Hosting System

User tự chọn cấu hình thay vì gói sẵn!

### RAM Options
- 512MB → 10,000 coins/month
- 1GB → 20,000 coins/month
- 2GB → 40,000 coins/month
- 4GB → 80,000 coins/month
- 8GB → 150,000 coins/month

### CPU Options
- 0.5 core → 5,000 coins/month
- 1.0 core → 10,000 coins/month
- 2.0 core → 20,000 coins/month
- 3.0 core → 35,000 coins/month
- 4.0 core → 50,000 coins/month

### Storage Options
- 5GB → 5,000 coins/month
- 10GB → 10,000 coins/month
- 20GB → 20,000 coins/month
- 40GB → 35,000 coins/month
- 80GB → 60,000 coins/month

**Total cost = RAM + CPU + Storage**

Example: 2GB RAM + 2.0 CPU + 20GB Storage = 80,000 coins/month

---

## 🔧 Development

```bash
# Run with watch mode
npm run dev

# Type check
npx tsc --noEmit

# Lint (TODO: setup eslint)
npm run lint
```

---

## 📚 Documentation

- [Architecture](ARCHITECTURE.md) - System design và structure
- [Database Guide](DATABASE.md) - Database schema và queries
- [API Docs](docs/API.md) - Web API endpoints (TODO)

---

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📝 License

MIT License - see [LICENSE](LICENSE) for details

---

## 👤 Author

**Gấu Kẹo (GauCandy)**
- GitHub: [@GauCandy](https://github.com/GauCandy)
- Discord: [Your Discord]

---

## 🙏 Acknowledgments

- [discord.js](https://discord.js.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Express](https://expressjs.com/)

---

Made with ❤️ by GauCandy
