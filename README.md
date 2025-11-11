# 🐱 WhiteCat Hosting Bot v4.0

Discord Bot for hosting management - Built with TypeScript, Discord.js v14, and PostgreSQL.

## 🎯 Project Status

**Current Phase:** PHASE 1: MVP - Foundation & Setup ✅

### ✅ Completed (Tuần 1-2)

- ✅ Project setup with TypeScript
- ✅ Discord.js v14 integration
- ✅ Folder structure (commands, events, utils, etc.)
- ✅ Winston logger setup
- ✅ Dynamic command handler
- ✅ Dynamic event handler
- ✅ Bot connection & basic ping command
- ✅ Error handling system

---

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Discord Bot Token

### 2. Installation

```bash
# Clone repository
git clone https://github.com/GauCandy/whitecat-4.0-remake.git
cd whitecat-4.0-remake

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 3. Configuration

Edit `.env` and fill in your credentials:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
DB_HOST=localhost
DB_NAME=whitecat
DB_USER=postgres
DB_PASSWORD=your_password
```

### 4. Database Setup

```bash
# Initialize database
npm run db:init

# Seed sample data
npm run db:seed:all
```

### 5. Deploy Commands

```bash
# Deploy slash commands to Discord
npm run deploy
```

### 6. Run Bot

```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm run build
npm start
```

---

## 📂 Project Structure

```
whitecat-4.0-remake/
├── src/
│   ├── commands/          # Slash commands
│   │   ├── utility/       # Utility commands (ping, help)
│   │   ├── economy/       # Economy commands
│   │   ├── hosting/       # Hosting management
│   │   ├── admin/         # Admin commands
│   │   ├── config/        # Server config
│   │   └── giveaway/      # Giveaway system
│   │
│   ├── events/            # Discord events (ready, interactionCreate)
│   ├── handlers/          # Command & event loaders
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions (logger, etc.)
│   ├── database/          # Database models & migrations
│   ├── services/          # Business logic services
│   └── index.ts           # Main entry point
│
├── database/
│   └── schema.sql         # PostgreSQL schema
│
├── logs/                  # Application logs
├── backups/               # Database backups
└── .env                   # Environment variables (not tracked)
```

---

## 🛠️ Available Commands

### Development
```bash
npm run dev          # Run in development mode
npm run build        # Build TypeScript to JavaScript
npm start            # Run production build
npm run typecheck    # TypeScript type checking
npm run lint         # Lint code
npm run format       # Format code with Prettier
```

### Database
```bash
npm run db:init      # Initialize database tables
npm run db:drop      # Drop all tables
npm run db:reset     # Reset database
npm run db:seed      # Seed sample data
```

### Deployment
```bash
npm run deploy       # Deploy slash commands to Discord
```

---

## 🤖 Bot Commands

### Utility
- `/ping` - Check bot latency

### Coming Soon (Phase 1)
- `/register` - Register user account
- `/profile` - View user profile
- `/balance` - Check coin balance
- `/packages` - View hosting packages
- `/buy` - Purchase hosting

---

## 🏗️ Development Roadmap

### ✅ PHASE 1: MVP (Tuần 1-8) - IN PROGRESS

#### Tuần 1-2: Foundation & Setup ✅
- [x] Setup project
- [x] Command/Event handlers
- [x] Logger & Error handling

#### Tuần 3-4: User System (NEXT)
- [ ] User registration & authentication
- [ ] Custom prefix per server
- [ ] Basic economy (1 currency)

#### Tuần 5-6: Hosting Core
- [ ] Pterodactyl API integration
- [ ] Package system
- [ ] Buy hosting command

#### Tuần 7-8: Management & Payment
- [ ] Server management commands
- [ ] Manual payment system
- [ ] Auto-suspend expired servers

---

## 📊 Tech Stack

- **Language:** TypeScript
- **Framework:** Discord.js v14
- **Database:** PostgreSQL
- **Logger:** Winston
- **Web Server:** Express.js (planned)
- **Hosting API:** Pterodactyl Panel (planned)

---

## 🔒 Security

- ⚠️ Never commit `.env` file
- ⚠️ Use parameterized queries for database
- ⚠️ Validate user input
- ⚠️ Rate limit commands with cooldowns
- ⚠️ Secure webhook endpoints

---

## 📝 Contributing

This is a personal project, but feedback is welcome!

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

## 👤 Author

**Gấu Kẹo (GauCandy)**
- GitHub: [@GauCandy](https://github.com/GauCandy)
- Email: gaulollipop@gmail.com

---

## 🙏 Acknowledgments

- [Discord.js](https://discord.js.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Winston](https://github.com/winstonjs/winston)

---

Made with ❤️ by GauCandy
