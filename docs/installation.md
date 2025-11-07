# Installation Guide

Complete step-by-step guide to install and setup WhiteCat Discord Bot.

## Table of Contents
- [Prerequisites](#prerequisites)
- [1. Clone Repository](#1-clone-repository)
- [2. Install Dependencies](#2-install-dependencies)
- [3. Create Discord Application](#3-create-discord-application)
- [4. Setup PostgreSQL](#4-setup-postgresql)
- [5. Configure Environment](#5-configure-environment)
- [6. Initialize Database](#6-initialize-database)
- [7. Deploy Commands](#7-deploy-commands)
- [8. Start Bot](#8-start-bot)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js 16.9.0 or higher**
  - Check: `node --version`
  - Download: https://nodejs.org/

- **npm or yarn**
  - Check: `npm --version`
  - Comes with Node.js

- **PostgreSQL 12 or higher**
  - Check: `psql --version`
  - Download:
    - Windows: https://www.postgresql.org/download/windows/
    - macOS: `brew install postgresql`
    - Linux: `sudo apt install postgresql postgresql-contrib`

- **Discord Bot Token**
  - Get from: https://discord.com/developers/applications

- **Git** (optional, for cloning)
  - Check: `git --version`
  - Download: https://git-scm.com/

---

## 1. Clone Repository

### Option A: Using Git
```bash
git clone https://github.com/GauCandy/whitecat-remake.git
cd whitecat-remake
```

### Option B: Download ZIP
1. Go to https://github.com/GauCandy/whitecat-remake
2. Click "Code" → "Download ZIP"
3. Extract and open folder in terminal

---

## 2. Install Dependencies

```bash
npm install
```

This will install all required packages:
- discord.js
- typescript
- express
- pg (PostgreSQL client)
- and more...

**Verify installation:**
```bash
npm list --depth=0
```

---

## 3. Create Discord Application

### Step 1: Create Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Enter name (e.g., "WhiteCat Bot")
4. Click "Create"

### Step 2: Create Bot
1. Go to "Bot" tab (left sidebar)
2. Click "Add Bot" → "Yes, do it!"
3. Click "Reset Token" → Copy the token
   - ⚠️ **Save this token securely!** You'll need it for `.env`

### Step 3: Enable Intents
Scroll down to "Privileged Gateway Intents" and enable:
- ✅ Server Members Intent
- ✅ Message Content Intent

Click "Save Changes"

### Step 4: Get Client ID & Secret
1. Go to "OAuth2" → "General"
2. Copy "Client ID"
3. Click "Reset Secret" → Copy "Client Secret"
   - ⚠️ **Save this secret securely!**

### Step 5: Invite Bot to Server
1. Go to "OAuth2" → "URL Generator"
2. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Select bot permissions (minimum):
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Read Message History
   - ✅ Use Slash Commands
4. Copy generated URL
5. Open URL in browser → Select your server → Authorize

---

## 4. Setup PostgreSQL

### Windows

1. **Install PostgreSQL**
   - Download from https://www.postgresql.org/download/windows/
   - Run installer
   - Remember the password you set for `postgres` user

2. **Verify Installation**
   ```bash
   psql --version
   ```

3. **Create Database**
   ```bash
   # Open psql (enter password when prompted)
   psql -U postgres

   # Create database
   CREATE DATABASE whitecat_bot;

   # Exit
   \q
   ```

### macOS

1. **Install PostgreSQL**
   ```bash
   brew install postgresql
   brew services start postgresql
   ```

2. **Create Database**
   ```bash
   # Create user (if not exists)
   createuser -s postgres

   # Create database
   createdb whitecat_bot
   ```

### Linux (Ubuntu/Debian)

1. **Install PostgreSQL**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```

2. **Create Database**
   ```bash
   # Switch to postgres user
   sudo -u postgres psql

   # Create database
   CREATE DATABASE whitecat_bot;

   # Create user (optional)
   CREATE USER bot_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE whitecat_bot TO bot_user;

   # Exit
   \q
   ```

### Verify Database
```bash
# List all databases
psql -U postgres -l

# You should see 'whitecat_bot' in the list
```

---

## 5. Configure Environment

### Step 1: Copy Template
```bash
cp .env.example .env
```

### Step 2: Edit `.env`

Open `.env` in your text editor and fill in:

```env
# Discord Configuration
DISCORD_TOKEN=your_bot_token_here          # From Step 3.2
CLIENT_ID=your_client_id_here              # From Step 3.4
CLIENT_SECRET=your_client_secret_here      # From Step 3.4
GUILD_ID=your_guild_id_here                # See below
PREFIX=!

# API Configuration
API_PORT=3000
REDIRECT_URI=http://localhost:3000/api/auth/discord/callback

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whitecat_bot
DB_USER=postgres
DB_PASSWORD=your_postgres_password         # From Step 4
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### How to Get Guild ID:
1. Enable Developer Mode in Discord
   - Settings → Advanced → Developer Mode → ON
2. Right-click your server icon
3. Click "Copy ID"
4. Paste into `GUILD_ID`

### For Production:
- Change `REDIRECT_URI` to your domain:
  ```env
  REDIRECT_URI=https://yourdomain.com/api/auth/discord/callback
  ```
- Update Discord OAuth redirect URLs in Developer Portal

---

## 6. Initialize Database

Run the database initialization script:

```bash
npm run db:init
```

**Expected Output:**
```
[DATABASE INIT] Starting database initialization...
[DATABASE INIT] Testing connection...
[DATABASE INIT] Reading schema from: .../database/schema.sql
[DATABASE INIT] Executing schema...
[DATABASE INIT] Schema executed successfully!
[DATABASE INIT] Tables in database:
  - users
[DATABASE INIT] Database initialization completed!
```

**What this does:**
- Creates `users` table
- Sets up indexes
- Creates triggers for auto-updating timestamps
- Adds database comments

---

## 7. Deploy Commands

Register slash commands with Discord:

```bash
npm run deploy
```

**Expected Output:**
```
[INFO] Loaded command: help
[INFO] Loaded command: ping
[INFO] Started refreshing 2 application (/) commands.
[SUCCESS] Successfully reloaded 2 application (/) commands.
```

**Note:**
- Guild commands update instantly
- Global commands take up to 1 hour
- Current setup uses guild commands for faster development

---

## 8. Start Bot

### Development Mode (with hot reload)
```bash
npm run dev:watch
```

### Development Mode (single run)
```bash
npm run dev
```

### Production Mode
```bash
# Build TypeScript
npm run build

# Run compiled JavaScript
npm start
```

**Expected Output:**
```
[BOT] Connecting to Discord...
[SUCCESS] Bot logged in as WhiteCat#1234
[INFO] Serving 1 guild(s)
[SUCCESS] Ready to handle commands!
```

---

## Troubleshooting

### "DISCORD_TOKEN is not defined"
- ✅ Make sure `.env` file exists in root directory
- ✅ Check token is correctly copied (no spaces)
- ✅ Restart bot after editing `.env`

### "Failed to connect to database"
- ✅ Check PostgreSQL is running:
  - Windows: Services → PostgreSQL
  - macOS: `brew services list`
  - Linux: `sudo service postgresql status`
- ✅ Verify database exists: `psql -U postgres -l`
- ✅ Check credentials in `.env`
- ✅ Try connecting manually: `psql -U postgres -d whitecat_bot`

### "relation 'users' does not exist"
- ✅ Run `npm run db:init` to create tables
- ✅ Check database name in `.env` matches
- ✅ Verify you're connected to correct database

### Commands don't appear
- ✅ Run `npm run deploy`
- ✅ Wait a few seconds and restart Discord
- ✅ Check bot has proper permissions in server
- ✅ Verify `GUILD_ID` in `.env` is correct

### Bot doesn't respond
- ✅ Check bot is online in Discord
- ✅ Verify bot permissions in server
- ✅ Check console for error messages
- ✅ Make sure intents are enabled (Step 3.3)

### "Cannot find module" errors
- ✅ Delete `node_modules` and `package-lock.json`
- ✅ Run `npm install` again
- ✅ Clear TypeScript cache: `rm -rf dist`
- ✅ Rebuild: `npm run build`

### OAuth redirect errors
- ✅ Check `REDIRECT_URI` in `.env`
- ✅ Add redirect URI in Discord Developer Portal:
  - OAuth2 → Redirects → Add `http://localhost:3000/api/auth/discord/callback`
- ✅ Make sure API server is running (it starts with bot)

---

## Next Steps

✅ **Installation Complete!** Your bot is now running.

Continue with:
- [Configuration Guide](configuration.md) - Detailed configuration options
- [Creating Commands](commands.md) - Add your own commands
- [Verification System](VERIFICATION_SYSTEM.md) - Understand user verification
- [Deployment](deployment.md) - Deploy to production

---

[← Back to Main README](../README.md) | [Configuration Guide →](configuration.md)
