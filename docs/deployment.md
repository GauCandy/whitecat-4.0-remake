# Deployment Guide

Complete guide to deploy WhiteCat Bot to production.

## Table of Contents
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Build for Production](#build-for-production)
- [Deployment Options](#deployment-options)
- [Environment Setup](#environment-setup)
- [Process Management](#process-management)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying to production:

### Code Preparation
- [ ] All features tested locally
- [ ] No console.log() in production code (use Logger)
- [ ] Error handling implemented
- [ ] Database migrations completed
- [ ] Commands deployed and tested

### Security
- [ ] Strong database password
- [ ] Discord bot token secured
- [ ] CLIENT_SECRET secured
- [ ] `.env` file not committed to git
- [ ] HTTPS enabled for OAuth callbacks
- [ ] CORS configured for production domains

### Configuration
- [ ] Production `.env` file ready
- [ ] Database credentials verified
- [ ] REDIRECT_URI updated to production domain
- [ ] Remove GUILD_ID for global commands (optional)
- [ ] Pool sizes adjusted for load

### Infrastructure
- [ ] VPS/Server provisioned
- [ ] PostgreSQL installed
- [ ] Node.js 16.9.0+ installed
- [ ] Domain name configured (for OAuth)
- [ ] SSL certificate installed

---

## Build for Production

### 1. Install Dependencies

```bash
# Production dependencies only
npm install --production
```

### 2. Build TypeScript

```bash
npm run build
```

**Output:** Compiled JavaScript in `dist/` folder

### 3. Verify Build

```bash
# Check dist folder
ls -la dist/

# Should see:
# dist/index.js
# dist/bot.js
# dist/config.js
# dist/commands/
# dist/database/
# etc.
```

---

## Deployment Options

### Option 1: VPS (Recommended)

**Providers:** DigitalOcean, Linode, Vultr, AWS EC2

**Steps:**
1. Rent VPS (minimum: 1GB RAM, 25GB SSD)
2. Install Node.js and PostgreSQL
3. Upload files via Git or FTP
4. Configure environment
5. Run bot with PM2

**Cost:** ~$5-10/month

---

### Option 2: Hosting Services

**Providers:** Railway, Heroku, Render

**Steps:**
1. Connect GitHub repository
2. Set environment variables
3. Add PostgreSQL addon
4. Deploy automatically

**Cost:** Free tier available, $5-20/month for production

---

### Option 3: Docker (Advanced)

**Dockerfile:**
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

CMD ["node", "dist/index.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  bot:
    build: .
    environment:
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - DB_HOST=postgres
    depends_on:
      - postgres

  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

---

## Environment Setup

### Production .env File

```env
# Discord Configuration
DISCORD_TOKEN=your_production_bot_token
CLIENT_ID=your_production_client_id
CLIENT_SECRET=your_production_client_secret
# Remove GUILD_ID for global commands
PREFIX=!

# API Configuration
API_PORT=3000
REDIRECT_URI=https://yourdomain.com/api/auth/discord/callback

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whitecat_production
DB_USER=bot_user
DB_PASSWORD=very_secure_password_here
DB_POOL_MIN=10
DB_POOL_MAX=50
```

### Discord Developer Portal

1. **OAuth Redirects:**
   - Add `https://yourdomain.com/api/auth/discord/callback`
   - Remove localhost URLs

2. **Privileged Intents:**
   - Verify enabled in production bot

3. **Bot Permissions:**
   - Check all required permissions are granted

---

## Process Management

### PM2 (Recommended)

#### Install PM2

```bash
npm install -g pm2
```

#### Start Bot

```bash
pm2 start dist/index.js --name whitecat-bot
```

#### PM2 Commands

```bash
# View logs
pm2 logs whitecat-bot

# Restart bot
pm2 restart whitecat-bot

# Stop bot
pm2 stop whitecat-bot

# View status
pm2 status

# Monitor
pm2 monit

# Save PM2 config
pm2 save

# Auto-start on boot
pm2 startup
```

#### PM2 Ecosystem File

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'whitecat-bot',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
  }]
};
```

Start with:
```bash
pm2 start ecosystem.config.js
```

---

### Systemd Service (Alternative)

Create `/etc/systemd/system/whitecat-bot.service`:

```ini
[Unit]
Description=WhiteCat Discord Bot
After=network.target

[Service]
Type=simple
User=botuser
WorkingDirectory=/home/botuser/whitecat-bot
ExecStart=/usr/bin/node /home/botuser/whitecat-bot/dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Commands:
```bash
# Start service
sudo systemctl start whitecat-bot

# Enable auto-start
sudo systemctl enable whitecat-bot

# View status
sudo systemctl status whitecat-bot

# View logs
sudo journalctl -u whitecat-bot -f
```

---

## Reverse Proxy (Nginx)

For HTTPS and domain routing:

### Install Nginx

```bash
sudo apt update
sudo apt install nginx
```

### Configure Nginx

Create `/etc/nginx/sites-available/whitecat`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Proxy to bot API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/whitecat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Monitoring

### Health Checks

```bash
# Check API
curl https://yourdomain.com/api/ping

# Check health
curl https://yourdomain.com/api/health
```

### Logging

**Setup log directory:**
```bash
mkdir -p logs
```

**Log rotation (logrotate):**
Create `/etc/logrotate.d/whitecat`:
```
/home/botuser/whitecat-bot/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
}
```

### Monitoring Tools

**PM2 Monitoring:**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

**Uptime Monitoring:**
- UptimeRobot: https://uptimerobot.com/
- StatusCake: https://www.statuscake.com/

**Error Tracking:**
- Sentry: https://sentry.io/
- Rollbar: https://rollbar.com/

---

## Database Backups

### Automated Daily Backups

Create backup script `/home/botuser/backup-db.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/botuser/backups"
DB_NAME="whitecat_production"

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U bot_user -d $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql"
```

Make executable:
```bash
chmod +x /home/botuser/backup-db.sh
```

Add to crontab:
```bash
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * /home/botuser/backup-db.sh
```

---

## Scaling

### Vertical Scaling (More Resources)

Upgrade VPS when needed:
- **Small:** 1GB RAM, 25GB SSD (< 100 servers)
- **Medium:** 2GB RAM, 50GB SSD (100-500 servers)
- **Large:** 4GB RAM, 80GB SSD (500+ servers)

### Horizontal Scaling (Sharding)

For very large bots (1000+ servers):

```typescript
// Update src/bot.ts
const client = new Client({
  intents: [...],
  shards: 'auto', // Auto-calculate shards
});
```

Or manual:
```typescript
const manager = new ShardingManager('./dist/index.js', {
  totalShards: 2,
  token: config.token,
});

manager.spawn();
```

### Database Scaling

**Read Replicas:**
- Primary: Writes
- Replica: Reads

**Connection Pooling:**
```env
DB_POOL_MIN=20
DB_POOL_MAX=100
```

---

## Troubleshooting

### Bot Won't Start

```bash
# Check PM2 logs
pm2 logs whitecat-bot --lines 100

# Check systemd logs
sudo journalctl -u whitecat-bot -n 100

# Test manually
node dist/index.js
```

### Database Connection Errors

```bash
# Test connection
psql -h localhost -U bot_user -d whitecat_production

# Check PostgreSQL status
sudo systemctl status postgresql

# Check pool config
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### OAuth Not Working

- ✅ Check REDIRECT_URI in .env
- ✅ Verify redirect in Discord Developer Portal
- ✅ Ensure HTTPS is working
- ✅ Check nginx proxy configuration

### High Memory Usage

```bash
# Monitor with PM2
pm2 monit

# Check Node.js memory
node --max-old-space-size=512 dist/index.js

# Add to PM2 config
max_memory_restart: '500M'
```

### Commands Not Updating

```bash
# Re-deploy commands
npm run deploy

# For global commands, wait 1 hour
# Or remove GUILD_ID and redeploy
```

---

## Security Checklist

- [ ] Firewall configured (allow 80, 443, 22 only)
- [ ] SSH key authentication enabled
- [ ] Fail2ban installed
- [ ] Regular security updates
- [ ] Database not exposed to internet
- [ ] Strong passwords everywhere
- [ ] HTTPS enforced
- [ ] Rate limiting enabled (if needed)
- [ ] Logs monitored
- [ ] Backups automated

---

## Update Procedure

### 1. Backup

```bash
# Backup database
./backup-db.sh

# Backup .env
cp .env .env.backup
```

### 2. Pull Changes

```bash
git pull origin main
```

### 3. Install & Build

```bash
npm install
npm run build
```

### 4. Database Migrations

```bash
# If schema changed
npm run db:init
```

### 5. Restart Bot

```bash
pm2 restart whitecat-bot
```

### 6. Verify

```bash
pm2 logs whitecat-bot
curl https://yourdomain.com/api/ping
```

---

[← Back to Main README](../README.md)
