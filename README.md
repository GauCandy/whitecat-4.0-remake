# 🐱 WhiteCat Bot v4.0

Discord Bot Built with TypeScript, Discord.js v14, and PostgreSQL.

## 🎯 Features

### ✅ Core Features

**Bot Infrastructure:**
- 🤖 Discord.js v14 with TypeScript
- 📁 Dynamic command & event handlers
- 📝 Winston logging system
- ⚡ Error handling & validation
- 🔄 Hot-reload support in development

**Server Management:**
- 🏰 Automatic guild synchronization on startup
- 👋 Welcome messages with interactive setup
- 🌍 Multi-language support (English, Vietnamese)
- ⚙️ Custom prefix per server (configurable via env)
- 🎨 Interactive language & prefix selection buttons

**Database:**
- 🗄️ PostgreSQL database
- 📊 User economy system
- 💾 Guild settings & configurations
- 📈 Transaction & statistics tracking

**Features:**
- 💰 Economy system (coins, transactions)
- 🎁 Giveaway system
- 🎮 Fun & roleplay commands
- 📊 User profiles & statistics

---

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Discord Bot Application

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

### 3. Discord Application Configuration

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select existing one
3. Go to **Bot** tab and copy your bot token
4. Enable **Privileged Gateway Intents**:
   - Server Members Intent
   - Message Content Intent

### 4. Environment Configuration

Edit `.env` and fill in your credentials:

```env
# Discord Bot
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_test_guild_id_here

# Database
DB_HOST=localhost
DB_NAME=whitecat
DB_USER=postgres
DB_PASSWORD=your_password
```

### 5. Database Setup

```bash
# Initialize database (creates all tables)
npm run db:init
```

### 6. Deploy Commands

```bash
# Deploy slash commands to Discord
npm run deploy
```

### 7. Run Bot

```bash
# Development mode with hot reload
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
│   │   ├── utility/       # Utility commands (ping, profile)
│   │   ├── economy/       # Economy commands
│   │   ├── config/        # Server config
│   │   ├── giveaway/      # Giveaway system
│   │   └── fun/           # Fun commands
│   │
│   ├── textCommands/      # Prefix commands
│   │   ├── utility/       # Utility commands
│   │   └── fun/           # Fun & roleplay commands
│   │
│   ├── events/            # Discord events
│   │   ├── ready.ts       # Bot ready event
│   │   ├── guildCreate.ts # Guild join event
│   │   └── interactionCreate.ts  # Command handler
│   │
│   ├── handlers/          # Command & event loaders
│   ├── managers/          # Feature managers (giveaway, etc)
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   │   ├── logger.ts      # Winston logger
│   │   └── i18n.ts        # Internationalization
│   │
│   ├── database/          # Database setup
│   │   ├── config.ts      # Database connection
│   │   ├── init.ts        # Schema initialization
│   │   └── seed.ts        # Seed data
│   │
│   ├── scripts/           # Utility scripts
│   │   ├── deploy-commands.ts  # Deploy slash commands
│   │   ├── clear-commands.ts   # Clear commands
│   │   └── archive.ts          # Archive production/source code
│   │
│   ├── locales/           # Language files (EN/VI)
│   └── index.ts           # Main entry point
│
├── database/
│   └── schema.sql         # PostgreSQL schema
│
├── logs/                  # Application logs
├── backups/               # Database backups
├── archives/              # ZIP archives (prod/source)
└── .env                   # Environment variables (not tracked)
```

---

## 🛠️ Available Commands

### Development
```bash
npm run dev          # Run bot with hot reload
npm run build        # Build TypeScript to JavaScript
npm start            # Run production build
npm run typecheck    # TypeScript type checking
npm run lint         # Lint code
npm run format       # Format code with Prettier
```

### Database
```bash
npm run db:init      # Initialize database tables
npm run db:drop      # Drop all tables (⚠️ loses all data)
npm run db:reset     # Drop and recreate all tables (⚠️ loses all data)
npm run db:cleanup   # Remove unused tables not in schema.sql
```

**Database Operations Explained:**
- `db:init` - Creates all tables defined in schema.sql (safe, doesn't drop existing)
- `db:drop` - Drops ALL tables (use with caution!)
- `db:reset` - Drops all tables then recreates them (⚠️ **LOSES ALL DATA**)
- `db:cleanup` - Compares DB tables vs schema.sql, drops tables not in schema (useful after schema changes)

### Deployment
```bash
# Deploy Commands
npm run deploy         # Deploy to guild test (instant update)
npm run deploy:guild   # Deploy to guild test only (instant update)
npm run deploy:global  # Deploy to ALL servers (takes 1 hour)

# Clear Commands
npm run clear:guild    # Clear guild test commands
npm run clear:global   # Clear global commands

# Archive/Package
npm run archive:prod   # Build and archive for production deployment (dist + dependencies)
npm run archive:source # Archive source code for backup/sharing (src + configs)
```

---

## 🤖 Bot Commands

### Slash Commands (/)

**Utility:**
- `/ping` - Check bot latency and response time
- `/profile [@user]` - View your or another user's profile and statistics

**Economy:**
- `/balance [@user]` - Check your or another user's coin balance
- `/daily` - Claim daily coins
- `/transfer @user <amount>` - Transfer coins to another user

**Giveaway:**
- `/giveaway create` - Create a new giveaway
- `/giveaway end <giveaway_id>` - End a giveaway early
- `/giveaway reroll <giveaway_id>` - Reroll giveaway winner

**Config (Admin only):**
- `/config language` - Change server language (EN/VI)
- `/config prefix` - Change server prefix

### Text/Prefix Commands (,)

**Fun & Roleplay:**
- `,hug @user` - Give warm hugs (supports group hugs!)
- `,kiss @user` - Give a kiss
- `,pat @user` - Gentle headpats
- `,slap @user` - Slap someone
- `,kick @user` - Kick someone
- `,bite @user` - Bite someone
- `,cuddle @user` - Cuddle together
- `,poke @user` - Poke someone
- `,feed @user` - Feed someone
- `,tickle @user` - Tickle someone
- `,highfive @user` - Give a high five
- And many more!

**Features:**
- Support multiple @mentions with unique behaviors
- Contextual responses matching action emotions
- Self-targeting with humorous messages
- Bot-targeting support
- Anime GIFs from Nekobest API
- Multi-language support (EN/VI)

**Utility:**
- `,ping` - Check bot latency

---

## 📊 Tech Stack

- **Language:** TypeScript
- **Framework:** Discord.js v14
- **Database:** PostgreSQL
- **Logger:** Winston
- **Archiving:** Archiver

---

## 🗄️ Database Schema

The bot uses PostgreSQL with the following tables:

### Core Tables
- `users` - User accounts and settings
- `user_economy` - Coin balances and economy data
- `guilds` - Server configurations
- `transactions` - Transaction history

### Features
- `giveaways` - Giveaway system
- `giveaway_entries` - Giveaway participants
- `statistics` - Bot statistics
- `command_logs` - Command usage logs

---

## 🔒 Security

- ⚠️ Never commit `.env` file
- ⚠️ Use parameterized queries for database
- ⚠️ Validate user input
- ⚠️ Rate limit commands with cooldowns

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
