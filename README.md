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
- ✅ PostgreSQL database schema (13 tables)
- ✅ OAuth2 Authorization system
- ✅ Terms acceptance flow
- ✅ Command deployment system (guild/global)

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
# Discord Bot
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
CLIENT_SECRET=your_client_secret_here
GUILD_ID=your_test_guild_id_here

# Database
DB_HOST=localhost
DB_NAME=whitecat
DB_USER=postgres
DB_PASSWORD=your_password

# Web Server & OAuth2
API_PORT=3000
REDIRECT_URI=http://localhost:3000/auth/callback
CORS_ORIGIN=http://localhost:3000
```

### 4. Database Setup

```bash
# Initialize database (creates all tables)
npm run db:init
```

### 5. Deploy Commands

```bash
# Deploy slash commands to Discord
npm run deploy
```

### 6. Run Bot & Web Server

```bash
# Development mode - Run BOTH services (recommended)
npm run dev

# Or run services separately:
# Terminal 1: Discord bot only
npm run dev:bot

# Terminal 2: Web server only
npm run dev:web

# Production mode
npm run build
npm start
```

**By default, `npm run dev` starts BOTH:**
- Discord Bot (src/index.ts)
- Web Server (src/web/server.ts on port 3000)

The web server handles:
- `/auth/callback` - Discord OAuth2 callback endpoint
- `/health` - Health check endpoint

**CORS Configuration:**
- `CORS_ORIGIN` - Comma-separated list of allowed origins for API access
- Used for browser-based API calls, not Discord bot commands
- Example: `http://localhost:3000,https://yourdomain.com`

---

## 📂 Project Structure

```
whitecat-4.0-remake/
├── src/
│   ├── commands/          # Slash commands
│   │   ├── utility/       # Utility commands (ping, verify)
│   │   ├── economy/       # Economy commands
│   │   ├── hosting/       # Hosting management
│   │   ├── admin/         # Admin commands
│   │   ├── config/        # Server config
│   │   └── giveaway/      # Giveaway system
│   │
│   ├── events/            # Discord events
│   │   ├── ready.ts       # Bot ready event
│   │   └── interactionCreate.ts  # Command handler
│   │
│   ├── handlers/          # Command & event loaders
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   │   ├── logger.ts      # Winston logger
│   │   └── oauth.ts       # OAuth2 utilities
│   │
│   ├── middlewares/       # Middleware functions
│   │   └── authorization.ts  # OAuth2 authorization check
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
│   ├── web/               # Web server (OAuth2 & API)
│   │   ├── server.ts      # Express server
│   │   └── routes/
│   │       └── auth.ts    # OAuth2 callback endpoint
│   │
│   ├── services/          # Business logic services
│   └── index.ts           # Main entry point
│
├── database/
│   └── schema.sql         # PostgreSQL schema (13 tables)
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
npm run dev          # Run bot + web server (both services)
npm run dev:bot      # Run Discord bot only
npm run dev:web      # Run web server only (OAuth2 callbacks)
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
npm run deploy         # Deploy to ALL servers (global, takes 1 hour)
npm run deploy:guild   # Deploy to guild test only (instant update)
npm run deploy:global  # Deploy to ALL servers (same as deploy)

# Clear Commands
npm run clear:guild    # Clear guild test commands
npm run clear:global   # Clear global commands

# Archive/Package
npm run archive:prod   # Build and archive for production deployment (dist + dependencies)
npm run archive:source # Archive source code for backup/sharing (src + configs)
```

---

## 🤖 Bot Commands

### Utility (Public - No Auth Required)
- `/ping` - Check bot latency and response time
- `/verify` - Authorize bot to access your Discord account

### Coming Soon (Phase 1)
- `/register` - Register user account
- `/profile` - View user profile
- `/balance` - Check coin balance
- `/packages` - View hosting packages
- `/buy` - Purchase hosting

> **Note:** Most commands require OAuth2 authorization via `/verify` command first.

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
- **Authentication:** Discord OAuth2
- **Web Server:** Express.js
- **Archiving:** Archiver
- **Hosting API:** Pterodactyl Panel (planned)

---

## 🔐 Authorization System

The bot uses **Discord OAuth2** for user authorization with a **flexible 3-level system**.

### How it works:

1. User tries to use a protected command
2. Bot checks if user has authorized
3. If not authorized → Shows authorization request embed
4. User clicks "Authorize Now" button
5. Redirected to Discord OAuth2 page
6. After accepting → Tokens saved to database
7. User can now use commands

### 3-Level Authorization System:

#### **Level 1: No Authorization** (Public commands)
```typescript
const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  requiresAuth: false, // Skip authorization check

  async execute(interaction) {
    // Command code
  }
};
```

#### **Level 2: Default Authorization** (Most commands)
```typescript
const command: Command = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your coin balance'),

  requiresAuth: true, // Default - can be omitted

  async execute(interaction) {
    // Command code
  }
};
```

**Required scopes:**
- `identify` - Access basic Discord user info
- `applications.commands` - Manage application commands

#### **Level 3: Additional Scopes** (Advanced features)
```typescript
const command: Command = {
  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription('Manage premium features'),

  requiresAuth: true,
  requiredScopes: ['email', 'guilds'], // Additional scopes

  async execute(interaction) {
    // Command code
  }
};
```

**Available additional scopes:**
- `email` - Access user email address
- `guilds` - View user's Discord servers
- `connections` - View connected accounts
- `guilds.join` - Join servers on user's behalf

### Scope Validation:

- If user is missing required scopes → Bot shows re-authorization request
- Token expiry is automatically checked
- Users can have different scope levels for different commands

---

## 🗄️ Database Schema

The bot uses PostgreSQL with **13 tables**:

### Core Tables
- `users` - User accounts with OAuth2 tokens, scopes, and email (if authorized)
- `user_economy` - Coin balances and economy data
- `guilds` - Server configurations
- `transactions` - Transaction history

### Hosting System
- `server_nodes` - Server locations
- `hosting_pricing` - Custom resource pricing (RAM/CPU/Storage)
- `ports` - Available ports (25565-25664)
- `user_hosting` - User hosting instances

### Features
- `webhooks` - Event webhooks
- `giveaways` - Giveaway system
- `giveaway_entries` - Giveaway participants
- `statistics` - Bot statistics
- `command_logs` - Command usage logs

### Hosting Pricing Model

**Custom Configuration System:**
- Users select individual resources (RAM, CPU, Storage)
- Each resource has multiple tiers with different prices
- Total cost = RAM price + CPU price + Storage price

Example pricing:
- RAM: 512MB ($5k), 1GB ($10k), 2GB ($18k), etc.
- CPU: 0.5 cores ($3k), 1 core ($6k), 2 cores ($11k), etc.
- Storage: 5GB ($2k), 10GB ($4k), 20GB ($7k), etc.

---

## 🔒 Security

- ⚠️ Never commit `.env` file
- ⚠️ Use parameterized queries for database
- ⚠️ Validate user input
- ⚠️ Rate limit commands with cooldowns
- ⚠️ Secure webhook endpoints
- ⚠️ OAuth2 tokens stored encrypted in database
- ⚠️ Token expiry validation and auto-refresh
- ⚠️ CSRF protection with state parameter

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
