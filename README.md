# WhiteCat Discord Bot 🐱

[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-7289DA.svg)](https://discord.js.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-316192.svg)](https://www.postgresql.org/)

A modern, scalable Discord bot built with TypeScript, featuring a 2-level user verification system, OAuth integration, and REST API.

**Created by:** [Gấu Kẹo (GauCandy)](https://github.com/GauCandy)

---

## ✨ Features

- 🔒 **2-Level Verification System** - Basic (terms) + Verified (OAuth email)
- 🔐 **Discord OAuth Integration** - Secure email collection
- 🌐 **REST API** - Express server for webhooks & authentication
- 📦 **PostgreSQL Database** - User management with connection pooling
- ⚡ **Slash Commands** - Modern Discord interactions with lazy loading
- 🏗️ **Modular Architecture** - Easy to extend and maintain
- 🚀 **TypeScript** - Full type safety
- 📊 **Ban System** - Temporary & permanent user bans

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16.9.0+
- PostgreSQL 12+
- Discord Bot Token

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your credentials

# 3. Initialize database
npm run db:init

# 4. Deploy commands
npm run deploy

# 5. Start bot
npm run dev
```

**That's it!** 🎉 Your bot is now running.

---

## 📚 Documentation

| Topic | Description |
|-------|-------------|
| [Installation](docs/installation.md) | Detailed installation guide |
| [Configuration](docs/configuration.md) | Environment variables & setup |
| [Verification System](docs/VERIFICATION_SYSTEM.md) | 2-level user verification |
| [API Reference](docs/api.md) | REST API endpoints |
| [Creating Commands](docs/commands.md) | How to add new commands |
| [Database](docs/database.md) | Schema & repositories |
| [Deployment](docs/deployment.md) | Production deployment guide |

---

## 🎯 Available Commands

| Command | Verification | Description |
|---------|--------------|-------------|
| `/help` | Basic | Display help menu |
| `/ping` | Basic | Check bot latency |

**Note:** Basic = Terms agreement, Verified = OAuth email required

---

## 🏗️ Project Structure

```
whitecat-discord-bot/
├── src/
│   ├── commands/         # Slash commands (organized by category)
│   ├── api/              # Express REST API
│   ├── database/         # PostgreSQL integration
│   ├── middleware/       # Verification middleware
│   ├── services/         # OAuth & business logic
│   ├── types/            # TypeScript interfaces
│   └── index.ts          # Main entry point
├── database/
│   └── schema.sql        # Database schema
├── docs/                 # Documentation
└── .env.example          # Environment template
```

---

## 🔧 Development

```bash
# Development with hot reload
npm run dev:watch

# Build for production
npm run build

# Run production
npm start

# Database commands
npm run db:init   # Initialize schema
npm run db:reset  # Reset database (⚠️ deletes all data)
```

---

## 📝 License

**Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**

✅ **You CAN:** Use for learning, fork, modify, share
⚠️ **You MUST:** Give credit, keep same license
❌ **You CANNOT:** Use commercially, close source

See [LICENSE](LICENSE) for full details.

For commercial licensing: **gaulollipop@gmail.com**

---

## 📞 Contact & Support

- **Author:** Gấu Kẹo (GauCandy)
- **Email:** gaulollipop@gmail.com
- **GitHub:** [@GauCandy](https://github.com/GauCandy)
- **Issues:** [Report bugs](https://github.com/GauCandy/whitecat-remake/issues)

---

**Made with ❤️ using TypeScript and Discord.js**
