# Configuration Guide

Complete guide to configure WhiteCat Bot environment variables and settings.

## Table of Contents
- [Environment Variables](#environment-variables)
- [Discord Configuration](#discord-configuration)
- [API Configuration](#api-configuration)
- [Database Configuration](#database-configuration)
- [Development vs Production](#development-vs-production)
- [Security Best Practices](#security-best-practices)

---

## Environment Variables

All configuration is done through the `.env` file in the root directory.

### Template (.env.example)

```env
# Discord Configuration
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
CLIENT_SECRET=your_client_secret_here
BOT_OWNER_ID=your_discord_user_id_here
GUILD_ID=your_guild_id_here
PREFIX=!

# API Configuration
API_PORT=3000
REDIRECT_URI=http://localhost:3000/api/auth/discord/callback

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_bot
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_POOL_MIN=2
DB_POOL_MAX=10
```

---

## Discord Configuration

### DISCORD_TOKEN
- **Type:** String (required)
- **Description:** Your Discord bot token
- **How to get:**
  1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
  2. Select your application
  3. Go to "Bot" tab
  4. Click "Reset Token" and copy

**Example:**
```env
DISCORD_TOKEN=YOUR_BOT_TOKEN_HERE_FROM_DISCORD_DEVELOPER_PORTAL
```

⚠️ **Never share this token!** It gives full control of your bot.

### CLIENT_ID
- **Type:** String (required)
- **Description:** Your Discord application ID
- **How to get:**
  1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
  2. Select your application
  3. Go to "OAuth2" → "General"
  4. Copy "Client ID"

**Example:**
```env
CLIENT_ID=1234567890123456789
```

### CLIENT_SECRET
- **Type:** String (required)
- **Description:** OAuth client secret for Discord authentication
- **How to get:**
  1. Same location as CLIENT_ID
  2. Click "Reset Secret" and copy

**Example:**
```env
CLIENT_SECRET=AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```

⚠️ **Never share this secret!** Required for OAuth flow.

### BOT_OWNER_ID
- **Type:** String (required)
- **Description:** Discord user ID of the bot owner (has highest permissions)
- **How to get:**
  1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
  2. Right-click your username/profile
  3. Click "Copy ID"

**Example:**
```env
BOT_OWNER_ID=123456789012345678
```

**Usage:** Commands with `ownerOnly: true` can only be executed by this user.

**Use cases:**
- Bot moderation commands (`/botban`, `/botunban`)
- System administration commands
- Sensitive configuration commands

### GUILD_ID
- **Type:** String (required)
- **Description:** Your Discord server ID (for testing slash commands)
- **How to get:**
  1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
  2. Right-click your server icon
  3. Click "Copy ID"

**Example:**
```env
GUILD_ID=987654321098765432
```

**Note:** Guild commands update instantly. For global commands, remove this and modify deploy script.

### PREFIX
- **Type:** String (optional, default: `!`)
- **Description:** Prefix for text commands
- **Examples:**
  ```env
  PREFIX=!      # !ping, !help
  PREFIX=w!     # w!ping, w!help
  PREFIX=.      # .ping, .help
  ```

---

## API Configuration

### API_PORT
- **Type:** Number (optional, default: `3000`)
- **Description:** Port for Express API server
- **Usage:** Authentication endpoints, webhooks

**Example:**
```env
API_PORT=3000
```

**Available ports:** Usually 3000-9000 for development

### REDIRECT_URI
- **Type:** String (required)
- **Description:** OAuth callback URL
- **Format:** `http(s)://domain:port/api/auth/discord/callback`

**Development:**
```env
REDIRECT_URI=http://localhost:3000/api/auth/discord/callback
```

**Production:**
```env
REDIRECT_URI=https://yourdomain.com/api/auth/discord/callback
```

⚠️ **Important:** Must match EXACTLY in Discord Developer Portal:
1. Go to OAuth2 → Redirects
2. Add this URL
3. Click "Save Changes"

---

## Database Configuration

### DB_HOST
- **Type:** String (required)
- **Description:** PostgreSQL server hostname

**Examples:**
```env
DB_HOST=localhost           # Local development
DB_HOST=192.168.1.100      # Local network
DB_HOST=db.example.com     # Remote server
```

### DB_PORT
- **Type:** Number (optional, default: `5432`)
- **Description:** PostgreSQL server port

**Example:**
```env
DB_PORT=5432
```

### DB_NAME
- **Type:** String (required)
- **Description:** Database name

**Example:**
```env
DB_NAME=whitecat_bot
```

**Note:** Database must exist before running bot. Create with:
```bash
psql -U postgres -c "CREATE DATABASE whitecat_bot;"
```

### DB_USER
- **Type:** String (required)
- **Description:** PostgreSQL username

**Examples:**
```env
DB_USER=postgres     # Default superuser
DB_USER=bot_user     # Custom user
```

### DB_PASSWORD
- **Type:** String (required)
- **Description:** PostgreSQL password

**Example:**
```env
DB_PASSWORD=your_secure_password_here
```

⚠️ **Security:** Use strong passwords in production!

### DB_POOL_MIN
- **Type:** Number (optional, default: `2`)
- **Description:** Minimum number of database connections in pool

**Example:**
```env
DB_POOL_MIN=2
```

**Recommendations:**
- Development: `2`
- Small bot (<100 servers): `2-5`
- Medium bot (100-500 servers): `5-10`
- Large bot (500+ servers): `10-20`

### DB_POOL_MAX
- **Type:** Number (optional, default: `10`)
- **Description:** Maximum number of database connections in pool

**Example:**
```env
DB_POOL_MAX=10
```

**Recommendations:**
- Development: `5-10`
- Small bot: `10-20`
- Medium bot: `20-50`
- Large bot: `50-100`

**Formula:** `max = (expected_concurrent_users / 10) + buffer`

---

## Development vs Production

### Development Configuration

```env
# Discord
DISCORD_TOKEN=your_dev_bot_token
CLIENT_ID=your_dev_app_id
CLIENT_SECRET=your_dev_secret
GUILD_ID=your_test_server_id    # Keep this for instant updates
PREFIX=!

# API
API_PORT=3000
REDIRECT_URI=http://localhost:3000/api/auth/discord/callback

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whitecat_dev
DB_USER=postgres
DB_PASSWORD=dev_password
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### Production Configuration

```env
# Discord
DISCORD_TOKEN=your_production_bot_token
CLIENT_ID=your_production_app_id
CLIENT_SECRET=your_production_secret
# GUILD_ID removed for global commands
PREFIX=!

# API
API_PORT=3000
REDIRECT_URI=https://yourdomain.com/api/auth/discord/callback

# Database
DB_HOST=production-db.example.com
DB_PORT=5432
DB_NAME=whitecat_production
DB_USER=bot_user
DB_PASSWORD=very_secure_production_password
DB_POOL_MIN=10
DB_POOL_MAX=50
```

**Production Checklist:**
- ✅ Use separate bot token (different application)
- ✅ Use HTTPS for REDIRECT_URI
- ✅ Strong database password
- ✅ Increase pool sizes
- ✅ Remove GUILD_ID for global commands
- ✅ Enable Discord OAuth in production domain
- ✅ Use environment-specific database

---

## Security Best Practices

### 1. Never Commit .env
```bash
# .gitignore already includes:
.env
```

Always use `.env.example` as template.

### 2. Rotate Secrets Regularly
- Bot token: Every 3-6 months
- Client secret: Every 6-12 months
- Database password: Every 12 months

### 3. Use Strong Passwords
```bash
# Good database password (example)
DB_PASSWORD=Xy9$mK2!pL5@nQ8#rT3

# Bad database password
DB_PASSWORD=password123
```

### 4. Limit Database Permissions
Create dedicated user instead of using `postgres`:

```sql
-- Create user with limited permissions
CREATE USER bot_user WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE whitecat_bot TO bot_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bot_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bot_user;
```

### 5. Use Environment-Specific Configs
- Development: `whitecat_dev` database
- Staging: `whitecat_staging` database
- Production: `whitecat_production` database

### 6. Enable 2FA on Discord
- Discord Developer account should have 2FA enabled
- Protects bot token and secrets

### 7. Monitor Access Logs
- Check who accessed OAuth endpoints
- Monitor database connections
- Log failed authentication attempts

---

## Validation

The bot validates configuration on startup. If any required variable is missing, you'll see:

```
[ERROR] Missing required environment variable: DISCORD_TOKEN
[ERROR] Please check your .env file
```

**Validation Rules:**
- ✅ DISCORD_TOKEN must be valid
- ✅ CLIENT_ID must be numeric
- ✅ DATABASE connection must succeed
- ✅ REDIRECT_URI must be valid URL

---

## Troubleshooting

### "DISCORD_TOKEN is not defined"
```bash
# Check file exists
ls -la .env

# Check variable is set
cat .env | grep DISCORD_TOKEN

# Make sure no trailing spaces
DISCORD_TOKEN=token_here    # ❌ Wrong (space after =)
DISCORD_TOKEN=token_here    # ✅ Correct
```

### "Failed to connect to database"
```env
# Check all DB variables are set
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whitecat_bot
DB_USER=postgres
DB_PASSWORD=your_password
```

Test connection manually:
```bash
psql -h localhost -p 5432 -U postgres -d whitecat_bot
```

### OAuth redirect errors
1. Check REDIRECT_URI matches Discord Developer Portal
2. Ensure protocol (http/https) matches
3. Check port number is correct
4. Verify domain is accessible

### Pool connection errors
Reduce pool sizes if you see connection errors:
```env
DB_POOL_MIN=2
DB_POOL_MAX=5
```

---

## Advanced Configuration

### Using .env.local
For local overrides without modifying `.env`:

```bash
# .env.local (not committed to git)
DISCORD_TOKEN=my_personal_test_token
DB_NAME=my_local_db
```

Add to code:
```typescript
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' }); // Override with local
```

### Multiple Environments
```bash
.env.development
.env.staging
.env.production
```

Load based on NODE_ENV:
```bash
NODE_ENV=production npm start
```

---

[← Back to Main README](../README.md) | [API Reference →](api.md)
