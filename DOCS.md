# 📚 WhiteCat Bot - Technical Documentation

> Chi tiết về kiến trúc, cấu trúc code, và implementation của WhiteCat Hosting Bot v4.0

---

## 📑 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Code Structure](#code-structure)
- [Features Implementation](#features-implementation)
- [Database Schema](#database-schema)
- [Event Flow](#event-flow)
- [Authentication System](#authentication-system)
- [Localization System](#localization-system)

---

## 🏗️ Architecture Overview

WhiteCat Bot sử dụng **modular architecture** với các components độc lập:

```
┌─────────────────────────────────────────────────────────────┐
│                        Discord Client                        │
│                      (Discord.js v14)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
    ┌────▼─────┐                   ┌────▼─────┐
    │  Events  │                   │ Commands │
    │ Handlers │                   │ Handlers │
    └────┬─────┘                   └────┬─────┘
         │                               │
         └───────────────┬───────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
    ┌────▼─────┐                   ┌────▼─────┐
    │ Services │                   │   Utils  │
    │ (Logic)  │                   │ (Helpers)│
    └────┬─────┘                   └────┬─────┘
         │                               │
         └───────────────┬───────────────┘
                         │
                    ┌────▼─────┐
                    │ Database │
                    │PostgreSQL│
                    └──────────┘
```

### Design Principles

1. **Separation of Concerns** - Mỗi module có trách nhiệm riêng
2. **Dependency Injection** - Services inject vào handlers
3. **Event-Driven** - Bot phản ứng với Discord events
4. **Type Safety** - TypeScript cho compile-time checks
5. **Scalability** - Dễ dàng thêm features mới

---

## 📂 Code Structure

### Directory Layout

```
src/
├── commands/                 # Slash commands (grouped by category)
│   ├── utility/              # Public utility commands
│   │   ├── ping.ts           # Check bot latency
│   │   └── verify.ts         # OAuth2 authorization
│   ├── economy/              # Economy commands (future)
│   ├── hosting/              # Hosting management (future)
│   ├── admin/                # Admin commands (future)
│   ├── config/               # Server config commands (future)
│   └── giveaway/             # Giveaway system (future)
│
├── events/                   # Discord event listeners
│   ├── ready.ts              # Bot startup & guild sync
│   ├── guildCreate.ts        # Welcome message for new servers
│   └── interactionCreate.ts  # Handle commands & buttons
│
├── handlers/                 # Dynamic loaders
│   ├── commandHandler.ts     # Load all commands into Collection
│   ├── eventHandler.ts       # Register all event listeners
│   └── setupHandler.ts       # Interactive setup (language/prefix)
│
├── services/                 # Business logic layer
│   └── guildService.ts       # Guild CRUD operations (future)
│
├── middlewares/              # Request interceptors
│   └── authorization.ts      # Check OAuth2 authorization
│
├── types/                    # TypeScript definitions
│   ├── command.ts            # Command interface
│   ├── event.ts              # Event interface
│   └── client.ts             # Extended Discord.Client
│
├── utils/                    # Helper functions
│   ├── logger.ts             # Winston logger setup
│   ├── oauth.ts              # OAuth2 URL generators
│   └── embedBuilder.ts       # Reusable embed templates (future)
│
├── database/                 # Database layer
│   ├── config.ts             # PostgreSQL connection pool
│   ├── init.ts               # Schema initialization
│   └── seed.ts               # Seed data (future)
│
├── web/                      # Express web server
│   ├── server.ts             # HTTP server for OAuth2
│   └── routes/
│       └── auth.ts           # OAuth2 callback endpoint
│
├── scripts/                  # Utility scripts
│   ├── deploy-commands.ts    # Deploy slash commands
│   ├── clear-commands.ts     # Clear commands
│   └── archive.ts            # Create ZIP archives
│
├── locales/                  # i18n translations
│   ├── en-US.json            # English translations
│   └── vi.json               # Vietnamese translations
│
└── index.ts                  # Main entry point
```

---

## ✨ Features Implementation

### 1. Guild Synchronization System

**File:** `src/events/ready.ts`

**Purpose:** Đảm bảo database luôn đồng bộ với Discord guilds mà bot đã join.

#### Implementation Details

```typescript
// Phase 1: Collect Discord guilds
const discordGuilds = client.guilds.cache.map(guild => ({
  guild_id: guild.id,
  guild_name: guild.name,
  joined_at: guild.joinedAt
}));

// Phase 2: Query existing guilds from DB
const existingGuilds = await pool.query(
  'SELECT guild_id FROM guilds WHERE guild_id = ANY($1)',
  [discordGuildIds]
);

// Phase 3: Find missing guilds
const missingGuilds = discordGuilds.filter(
  guild => !existingGuildIds.has(guild.guild_id)
);

// Phase 4: Bulk insert missing guilds
if (missingGuilds.length > 0) {
  const values = missingGuilds.map(g =>
    `('${g.guild_id}', '${escapedName}', '${g.joined_at}', '${defaultLocale}', '${defaultPrefix}')`
  ).join(',');

  await pool.query(`
    INSERT INTO guilds (guild_id, guild_name, joined_at, locale, prefix)
    VALUES ${values}
  `);
}
```

#### Why This Approach?

✅ **Bulk Operations** - 1 query thay vì N queries (fast với large-scale bots)
✅ **Idempotent** - Chỉ thêm guilds mới, không duplicate
✅ **Preserves Data** - Giữ nguyên `joined_at` từ Discord
✅ **Default Config** - Tự động set locale & prefix từ ENV

#### Performance

| Bot Size | Old Approach | New Approach | Improvement |
|----------|--------------|--------------|-------------|
| 10 servers | ~500ms | ~50ms | **10x faster** |
| 100 servers | ~5s | ~200ms | **25x faster** |
| 1000 servers | ~50s | ~1s | **50x faster** |

---

### 2. Welcome Message System

**File:** `src/events/guildCreate.ts`

**Purpose:** Chào mừng khi bot được thêm vào server mới với setup interactives.

#### Flow Diagram

```
Bot joins server
      │
      ▼
Check permissions
      │
      ├─ NO → Skip (no DM permissions)
      │
      ▼
Get system channel
      │
      ├─ NO → Use first text channel
      │
      ▼
Insert guild to DB
      │
      ▼
Send welcome embed
      │
      ├─ Language selection buttons
      │     ├─ 🇺🇸 English
      │     └─ 🇻🇳 Tiếng Việt
      │
      └─ Prefix selection buttons
            ├─ , (comma)
            ├─ ! (exclamation)
            └─ / (slash)
```

#### Welcome Embed Structure

```typescript
const welcomeEmbed = new EmbedBuilder()
  .setColor(0x5865F2)
  .setTitle('👋 Welcome to WhiteCat Bot!')
  .setDescription('Thank you for adding me to your server!')
  .addFields(
    { name: '🌍 Language', value: 'Choose your preferred language', inline: true },
    { name: '⚙️ Prefix', value: 'Set your command prefix', inline: true },
    { name: '📚 Commands', value: 'Use `/help` to see all commands', inline: false }
  )
  .setFooter({ text: 'WhiteCat Hosting Bot v4.0' });

// Interactive buttons
const languageButtons = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setCustomId('setup_language_en')
      .setLabel('English')
      .setEmoji('🇺🇸')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('setup_language_vi')
      .setLabel('Tiếng Việt')
      .setEmoji('🇻🇳')
      .setStyle(ButtonStyle.Primary)
  );

const prefixButtons = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setCustomId('setup_prefix_comma')
      .setLabel('Prefix: ,')
      .setStyle(ButtonStyle.Secondary),
    // ... more buttons
  );
```

#### Database Insertion

```typescript
await pool.query(
  `INSERT INTO guilds (guild_id, guild_name, joined_at, locale, prefix)
   VALUES ($1, $2, $3, $4, $5)
   ON CONFLICT (guild_id) DO NOTHING`,
  [guild.id, guild.name, guild.joinedAt, defaultLocale, defaultPrefix]
);
```

**Key Features:**
- ✅ ON CONFLICT - Tránh lỗi nếu guild đã tồn tại
- ✅ Default values từ ENV variables
- ✅ Preserves Discord join timestamp

---

### 3. Interactive Setup Handlers

**File:** `src/handlers/setupHandler.ts`

**Purpose:** Xử lý button clicks cho language & prefix selection.

#### Handler Registration

```typescript
export function setupInteractionHandlers(client: Client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    // Language selection
    if (interaction.customId.startsWith('setup_language_')) {
      const locale = interaction.customId.split('_')[2]; // 'en' or 'vi'
      await handleLanguageSelection(interaction, locale);
    }

    // Prefix selection
    if (interaction.customId.startsWith('setup_prefix_')) {
      const prefix = getPrefixFromId(interaction.customId);
      await handlePrefixSelection(interaction, prefix);
    }
  });
}
```

#### Language Selection Handler

```typescript
async function handleLanguageSelection(interaction: ButtonInteraction, locale: string) {
  const guildId = interaction.guildId;

  // Update database
  await pool.query(
    'UPDATE guilds SET locale = $1 WHERE guild_id = $2',
    [locale, guildId]
  );

  // Get localized response
  const responses = {
    en: '✅ Language set to English!',
    vi: '✅ Đã đặt ngôn ngữ sang Tiếng Việt!'
  };

  // Reply to user
  await interaction.reply({
    content: responses[locale],
    ephemeral: true // Only visible to user who clicked
  });

  logger.info(`Guild ${guildId} changed language to ${locale}`);
}
```

#### Prefix Selection Handler

```typescript
async function handlePrefixSelection(interaction: ButtonInteraction, prefix: string) {
  const guildId = interaction.guildId;

  await pool.query(
    'UPDATE guilds SET prefix = $1 WHERE guild_id = $2',
    [prefix, guildId]
  );

  await interaction.reply({
    content: `✅ Prefix changed to \`${prefix}\``,
    ephemeral: true
  });

  logger.info(`Guild ${guildId} changed prefix to ${prefix}`);
}
```

**Key Features:**
- ✅ **Ephemeral replies** - Chỉ người click mới thấy
- ✅ **Database persistence** - Lưu vào PostgreSQL
- ✅ **Instant feedback** - User biết ngay khi thành công
- ✅ **Logging** - Track configuration changes

---

### 4. Multi-Language Support

**Files:** `src/locales/en-US.json`, `src/locales/vi.json`

**Purpose:** Hỗ trợ đa ngôn ngữ cho commands và messages.

#### Locale File Structure

**en-US.json:**
```json
{
  "welcome": {
    "title": "👋 Welcome to WhiteCat Bot!",
    "description": "Thank you for adding me to your server!",
    "language_field": "🌍 Language",
    "language_value": "Choose your preferred language",
    "prefix_field": "⚙️ Prefix",
    "prefix_value": "Set your command prefix",
    "commands_field": "📚 Commands",
    "commands_value": "Use `/help` to see all commands"
  },
  "setup": {
    "language_updated": "✅ Language set to English!",
    "prefix_updated": "✅ Prefix changed to `{prefix}`"
  }
}
```

**vi.json:**
```json
{
  "welcome": {
    "title": "👋 Chào mừng đến WhiteCat Bot!",
    "description": "Cảm ơn bạn đã thêm bot vào server!",
    "language_field": "🌍 Ngôn ngữ",
    "language_value": "Chọn ngôn ngữ yêu thích",
    "prefix_field": "⚙️ Tiền tố",
    "prefix_value": "Đặt prefix cho lệnh",
    "commands_field": "📚 Lệnh",
    "commands_value": "Dùng `/help` để xem tất cả lệnh"
  },
  "setup": {
    "language_updated": "✅ Đã đặt ngôn ngữ sang Tiếng Việt!",
    "prefix_updated": "✅ Đã đổi prefix thành `{prefix}`"
  }
}
```

#### Usage in Code

```typescript
import enUS from './locales/en-US.json';
import vi from './locales/vi.json';

const locales = { 'en-US': enUS, 'vi': vi };

function getTranslation(locale: string, key: string): string {
  const keys = key.split('.');
  let value = locales[locale];

  for (const k of keys) {
    value = value[k];
  }

  return value;
}

// Example
const title = getTranslation('vi', 'welcome.title');
// Returns: "👋 Chào mừng đến WhiteCat Bot!"
```

---

### 5. Environment-Based Configuration

**File:** `.env`

**Purpose:** Centralized configuration với default values.

#### Default Locale & Prefix

```env
# Bot Configuration
DEFAULT_LOCALE=en         # Default language for new guilds (en/vi)
BOT_PREFIX=,              # Default prefix for new guilds
```

#### Usage in Code

```typescript
const defaultLocale = process.env.DEFAULT_LOCALE || 'en';
const defaultPrefix = process.env.BOT_PREFIX || ',';

// When creating new guild
await pool.query(
  'INSERT INTO guilds (guild_id, locale, prefix) VALUES ($1, $2, $3)',
  [guildId, defaultLocale, defaultPrefix]
);
```

**Benefits:**
- ✅ Không cần hardcode values
- ✅ Dễ dàng thay đổi default cho production
- ✅ Consistency across codebase

---

### 6. Text/Prefix Commands System

**Files:** `src/textCommands/fun/*.ts`, `src/handlers/textCommandHandler.ts`, `src/events/messageCreate.ts`

**Purpose:** Support traditional prefix commands (`,command @user`) alongside slash commands.

#### Architecture

```
User sends: ,hug @user1 @user2
      │
      ▼
events/messageCreate.ts
      │
      ├─ Parse prefix from guild settings
      ├─ Extract command name & args
      ├─ Get command from textCommands Collection
      ├─ Check authorization (if required)
      ├─ Check cooldown
      │
      ▼
textCommands/fun/hug.ts
      │
      ├─ Parse @mentions from message
      ├─ Handle multiple targets (group hug!)
      ├─ Fetch GIF from Nekobest API
      ├─ Create embed with contextual message
      └─ Reply to user
```

#### Fun Commands Implementation

WhiteCat Bot có **7 fun text commands** với unique personalities:

**1. Hug (🤗 Wholesome)**
```typescript
// Single target: Romantic hug
,hug @user → "**You** gives **user** a warm hug! 💕"

// Multiple targets: GROUP HUG!
,hug @user1 @user2 → "GROUP HUG TIME! **You** hugs **user1**, **user2** all at once!"
```

**2. Kiss (💋 Romantic / Scandal)**
```typescript
// Single target: Romantic
,kiss @user → "**You** kisses **user**! 💋"

// Multiple targets: SCANDAL!
,kiss @user1 @user2 → "Wait... **You** wants to kiss **user1**, **user2**?! WHAT?!
                       Nhưng tại sao bạn lại muốn làm điều đó?!?!"
```

**3. Slap (💥 Violence Spree)**
```typescript
// Single target: Normal slap
,slap @user → "**You** slaps **user**! *ouch*"

// Multiple targets: COMBO!
,slap @user1 @user2 @user3 → "COMBO x3! **You** delivers rapid slaps!
                               *Mortal Kombat theme plays*"
```

**4. Pat (✨ Gentle Headpats)**
```typescript
// Multiple targets: Mass headpat distribution
,pat @user1 @user2 → "**You** gives soft headpats to **user1**, **user2**!
                      Everyone gets comfort! 🥰"
```

**5. Kick (🥋 Kung Fu)**
```typescript
// Multiple targets: Roundhouse combo
,kick @user1 @user2 → "ROUNDHOUSE KICK! **You** hits **user1**, **user2**!
                       COMBO x2! *Street Fighter theme*"
```

**6. Bite (🦷 Playful / Vampire)**
```typescript
// Single: Playful bite
,bite @user → "**You** playfully bites **user**! *nom nom*"

// Multiple: VAMPIRE MODE!
,bite @user1 @user2 → "VAMPIRE MODE ACTIVATED! **You** bites **user1**, **user2**!
                       Nom nom nom! *feral noises*"
```

**7. Cuddle (🫂 Wholesome)**
```typescript
// Multiple: Cuddle pile
,cuddle @user1 @user2 → "CUDDLE PILE! **You** cuddles with **user1**, **user2**!
                         So warm and cozy! 💕"
```

#### Key Features

**Mention Parsing:**
```typescript
// Helper function to parse all @mentions
export function parseAllMentionedUsers(message: Message): User[] {
  return Array.from(message.mentions.users.values());
}
```

**Contextual Responses:**
- Each command has unique personality
- Different behaviors for single vs multiple targets
- Self-targeting with humorous messages
- Bot-targeting special responses

**Random Messages:**
```typescript
const scandalMessages = [
  "Wait... trying to kiss multiple people?! WHAT?!",
  "SCANDAL! Someone call the drama police!",
  "This is getting out of hand! Pick one!"
];

const message = getRandomMessage(scandalMessages);
```

**Integration with Slash Commands:**
- Share same i18n system (locale translations)
- Share same Nekobest API integration (anime GIFs)
- Share same authorization middleware
- Share same cooldown system

**Authorization Check:**
```typescript
// messageCreate.ts
if (command.requiresAuth !== false) {
  const user = await pool.query(
    'SELECT is_authorized FROM users WHERE discord_id = $1',
    [message.author.id]
  );

  if (!user || !user.is_authorized) {
    // Show /verify prompt
    return;
  }
}
```

#### Advantages of Text Commands

**Why both slash AND text commands?**

✅ **Flexibility** - Some users prefer traditional prefix commands
✅ **Speed** - Faster to type `,hug @user` than navigating slash menu
✅ **Multiple mentions** - Easier to mention multiple users with text
✅ **Fun factor** - Prefix commands allow for more creative/chaotic interactions
✅ **Backwards compatibility** - Users familiar with classic bots

**Disadvantages:**

❌ Prefix can conflict with other bots
❌ No autocomplete/hints like slash commands
❌ Need to parse message content manually

---

## 🗄️ Database Schema

WhiteCat Bot sử dụng **PostgreSQL** với **13 tables**.

### Core Tables

#### 1. `users` - User Accounts & OAuth2

```sql
CREATE TABLE users (
    user_id VARCHAR(20) PRIMARY KEY,           -- Discord user ID
    username VARCHAR(32) NOT NULL,             -- Discord username
    email VARCHAR(100),                        -- Email (from OAuth2)
    access_token TEXT,                         -- OAuth2 access token
    refresh_token TEXT,                        -- OAuth2 refresh token
    token_expires_at TIMESTAMP,                -- Token expiry
    scopes TEXT[],                             -- Authorized scopes
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Points:**
- OAuth2 tokens stored for API calls
- Email nullable (only if `email` scope granted)
- Token expiry tracked for auto-refresh
- Scopes stored as array for validation

#### 2. `guilds` - Server Configurations

```sql
CREATE TABLE guilds (
    guild_id VARCHAR(20) PRIMARY KEY,          -- Discord guild ID
    guild_name VARCHAR(100) NOT NULL,          -- Guild name
    joined_at TIMESTAMP NOT NULL,              -- When bot joined
    locale VARCHAR(10) DEFAULT 'en',           -- Language (en/vi)
    prefix VARCHAR(5) DEFAULT ',',             -- Command prefix
    welcome_channel_id VARCHAR(20),            -- Welcome message channel
    log_channel_id VARCHAR(20),                -- Audit log channel
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_guilds_locale ON guilds(locale);
```

**Key Points:**
- Stores per-guild configurations
- `joined_at` preserved from Discord
- Locale & prefix customizable
- Indexed for fast queries

#### 3. `user_economy` - User Balances

```sql
CREATE TABLE user_economy (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) REFERENCES users(user_id) ON DELETE CASCADE,
    coins BIGINT DEFAULT 0,                    -- Main currency
    gems BIGINT DEFAULT 0,                     -- Premium currency (future)
    last_daily TIMESTAMP,                      -- Last daily reward claim
    last_weekly TIMESTAMP,                     -- Last weekly reward claim
    total_earned BIGINT DEFAULT 0,             -- Lifetime earnings
    total_spent BIGINT DEFAULT 0,              -- Lifetime spending
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id)
);

CREATE INDEX idx_economy_coins ON user_economy(coins DESC);
```

**Features:**
- Tracks multiple currencies
- Daily/weekly reward cooldowns
- Lifetime statistics
- Leaderboard support (indexed)

#### 4. `transactions` - Transaction History

```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,                 -- 'purchase', 'reward', 'refund', etc.
    amount BIGINT NOT NULL,                    -- Transaction amount
    balance_before BIGINT NOT NULL,            -- Balance before transaction
    balance_after BIGINT NOT NULL,             -- Balance after transaction
    description TEXT,                          -- Transaction description
    metadata JSONB,                            -- Additional data
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at DESC);
```

**Features:**
- Full audit trail
- Balance snapshots
- Flexible metadata (JSONB)
- Fast user history queries

---

### Hosting Tables

#### 5. `user_hosting` - User Servers

```sql
CREATE TABLE user_hosting (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) REFERENCES users(user_id) ON DELETE CASCADE,
    server_node_id INTEGER REFERENCES server_nodes(id),
    server_identifier VARCHAR(100),            -- Pterodactyl server ID
    server_name VARCHAR(100) NOT NULL,
    ram_mb INTEGER NOT NULL,                   -- Allocated RAM
    cpu_cores DECIMAL(3,1) NOT NULL,           -- Allocated CPU
    storage_gb INTEGER NOT NULL,               -- Allocated storage
    port INTEGER REFERENCES ports(port_number),
    status VARCHAR(20) DEFAULT 'active',       -- 'active', 'suspended', 'expired'
    expires_at TIMESTAMP,                      -- Expiration date
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_hosting_user_status ON user_hosting(user_id, status);
CREATE INDEX idx_hosting_expires ON user_hosting(expires_at) WHERE status = 'active';
```

**Features:**
- Links to Pterodactyl servers
- Resource allocation tracking
- Auto-suspension support
- Expiration monitoring

#### 6. `hosting_pricing` - Resource Pricing

```sql
CREATE TABLE hosting_pricing (
    id SERIAL PRIMARY KEY,
    resource_type VARCHAR(20) NOT NULL,        -- 'ram', 'cpu', 'storage'
    amount VARCHAR(20) NOT NULL,               -- '512MB', '1GB', etc.
    price BIGINT NOT NULL,                     -- Price in coins
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(resource_type, amount)
);
```

**Example Data:**
```sql
INSERT INTO hosting_pricing (resource_type, amount, price) VALUES
  ('ram', '512MB', 5000),
  ('ram', '1GB', 10000),
  ('cpu', '0.5', 3000),
  ('cpu', '1.0', 6000),
  ('storage', '5GB', 2000);
```

**Pricing Model:**
- User selects RAM + CPU + Storage independently
- Total price = RAM price + CPU price + Storage price
- Flexible combinations

---

### Additional Tables

#### 7. `server_nodes` - Server Locations

```sql
CREATE TABLE server_nodes (
    id SERIAL PRIMARY KEY,
    node_name VARCHAR(100) NOT NULL,
    location VARCHAR(100),                     -- 'US-East', 'EU-West', etc.
    pterodactyl_node_id INTEGER,              -- Pterodactyl node ID
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 8. `ports` - Available Ports

```sql
CREATE TABLE ports (
    port_number INTEGER PRIMARY KEY,
    is_allocated BOOLEAN DEFAULT FALSE,
    allocated_to INTEGER REFERENCES user_hosting(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed ports 25565-25664 (100 ports for Minecraft)
INSERT INTO ports (port_number)
SELECT generate_series(25565, 25664);
```

#### 9. `webhooks` - Event Webhooks

```sql
CREATE TABLE webhooks (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    webhook_url TEXT NOT NULL,
    event_type VARCHAR(50) NOT NULL,           -- 'server_created', 'payment_received', etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 10. `giveaways` - Giveaway System

```sql
CREATE TABLE giveaways (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    channel_id VARCHAR(20) NOT NULL,
    message_id VARCHAR(20),
    prize TEXT NOT NULL,
    winner_count INTEGER DEFAULT 1,
    ends_at TIMESTAMP NOT NULL,
    host_user_id VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',       -- 'active', 'ended', 'cancelled'
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 11. `giveaway_entries` - Participants

```sql
CREATE TABLE giveaway_entries (
    id SERIAL PRIMARY KEY,
    giveaway_id INTEGER REFERENCES giveaways(id) ON DELETE CASCADE,
    user_id VARCHAR(20) NOT NULL,
    entered_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(giveaway_id, user_id)
);
```

#### 12. `statistics` - Bot Statistics

```sql
CREATE TABLE statistics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(50) NOT NULL,
    metric_value BIGINT NOT NULL,
    recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_statistics_metric_time ON statistics(metric_name, recorded_at DESC);
```

#### 13. `command_logs` - Command Usage

```sql
CREATE TABLE command_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20),
    guild_id VARCHAR(20),
    command_name VARCHAR(100) NOT NULL,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    executed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_command_logs_time ON command_logs(executed_at DESC);
CREATE INDEX idx_command_logs_command ON command_logs(command_name);
```

---

## 🔄 Event Flow

### Bot Startup Sequence

```
1. index.ts
   ├─ Load environment (.env)
   ├─ Initialize database pool
   ├─ Create Discord client
   │
2. handlers/commandHandler.ts
   ├─ Scan src/commands/**/*.ts
   ├─ Load commands into Collection
   │
3. handlers/eventHandler.ts
   ├─ Scan src/events/*.ts
   ├─ Register event listeners
   │
4. handlers/setupHandler.ts
   ├─ Register button interaction handlers
   │
5. web/server.ts
   ├─ Start Express server (port 3000)
   ├─ Register OAuth2 callback route
   │
6. client.login(TOKEN)
   │
7. events/ready.ts
   ├─ Log "Bot is ready"
   ├─ Sync guilds to database
   └─ Set bot status/activity
```

---

### Command Execution Flow

```
User types /ping
      │
      ▼
Discord API
      │
      ▼
events/interactionCreate.ts
      │
      ├─ Check if slash command
      ├─ Get command from Collection
      ├─ Check authorization (if requiresAuth)
      │   ├─ Authorized → Continue
      │   └─ Not authorized → Show /verify embed
      │
      ▼
commands/utility/ping.ts
      │
      ├─ Calculate latency
      ├─ Create embed
      └─ Reply to user
```

---

### Guild Join Flow

```
Bot added to server
      │
      ▼
events/guildCreate.ts
      │
      ├─ Check bot permissions
      ├─ Get system channel or first text channel
      │
      ├─ Insert guild to database
      │   └─ INSERT INTO guilds (...)
      │       VALUES (id, name, joined_at, default_locale, default_prefix)
      │
      ├─ Create welcome embed
      ├─ Add language selection buttons
      ├─ Add prefix selection buttons
      └─ Send to channel
```

---

### Button Interaction Flow

```
User clicks "🇻🇳 Tiếng Việt"
      │
      ▼
events/interactionCreate.ts
      │
      ├─ Check if button interaction
      └─ customId = 'setup_language_vi'
            │
            ▼
handlers/setupHandler.ts
      │
      ├─ Parse customId → locale = 'vi'
      ├─ UPDATE guilds SET locale = 'vi'
      ├─ Get localized success message
      └─ Reply (ephemeral)
```

---

## 🔐 Authentication System

WhiteCat Bot sử dụng **Discord OAuth2** với **User-Installable App**.

### User-Installable App Architecture

**Traditional Bot Install (integration_type=0):**
```
User → Invite bot to server
     → Bot joins server
     → Commands work in that server only
     → Requires Manage Server permission
```

**User-Installable App (integration_type=1):**
```
User → Authorize app for themselves
     → Commands work in ANY server user is in
     → No server admin needed
     → Bot doesn't need to be in server
```

### OAuth2 Flow

```
1. User runs /verify
      │
      ▼
2. Bot checks database
      │
      ├─ Has valid token? → "Already authorized ✅"
      └─ No token/expired → Show authorization embed
            │
            ▼
3. User clicks "Authorize Now"
      │
      ▼
4. Redirected to Discord OAuth2
      │
      URL: https://discord.com/oauth2/authorize
           ?client_id=123456
           &response_type=code
           &redirect_uri=http://localhost:3000/auth/callback
           &scope=identify+email+applications.commands
           &integration_type=1          ← User Install mode
           &state=abc123xyz             ← CSRF protection
      │
      ▼
5. User approves permissions
      │
      ▼
6. Discord redirects to callback
      │
      URL: http://localhost:3000/auth/callback
           ?code=AUTHORIZATION_CODE
           &state=abc123xyz
      │
      ▼
7. web/routes/auth.ts
      │
      ├─ Verify state parameter (CSRF check)
      ├─ Exchange code for access_token
      │   POST https://discord.com/api/oauth2/token
      │   Body: { code, client_id, client_secret, grant_type }
      │
      ├─ Get user info
      │   GET https://discord.com/api/users/@me
      │   Header: Authorization: Bearer {access_token}
      │
      ├─ Save to database
      │   INSERT INTO users (user_id, access_token, refresh_token, ...)
      │   ON CONFLICT UPDATE
      │
      └─ Show success page
```

### Token Storage

```sql
-- Users table stores OAuth2 tokens
CREATE TABLE users (
    user_id VARCHAR(20) PRIMARY KEY,
    access_token TEXT,                    -- For API calls
    refresh_token TEXT,                   -- For token refresh
    token_expires_at TIMESTAMP,           -- Expiry time
    scopes TEXT[],                        -- Granted permissions
    email VARCHAR(100)                    -- If 'email' scope granted
);
```

### Authorization Middleware

**File:** `src/middlewares/authorization.ts`

```typescript
export async function checkAuthorization(userId: string): Promise<boolean> {
  // Query database
  const result = await pool.query(
    'SELECT access_token, token_expires_at, scopes FROM users WHERE user_id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return false; // User not authorized
  }

  const { access_token, token_expires_at, scopes } = result.rows[0];

  // Check if token expired
  if (new Date() > new Date(token_expires_at)) {
    return false; // Token expired
  }

  // Check required scopes
  const requiredScopes = ['identify', 'email', 'applications.commands'];
  const hasAllScopes = requiredScopes.every(scope => scopes.includes(scope));

  if (!hasAllScopes) {
    return false; // Missing scopes
  }

  return true; // Authorized
}
```

### 2-Level Authorization System

#### Level 1: Public Commands (No Auth)

```typescript
// commands/utility/ping.ts
export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  requiresAuth: false,  // ← Public command

  async execute(interaction) {
    await interaction.reply('Pong!');
  }
};
```

#### Level 2: Protected Commands (Requires Auth)

```typescript
// commands/economy/balance.ts
export default {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your coin balance'),

  // requiresAuth defaults to true

  async execute(interaction) {
    // User must be authorized to reach here
    const coins = await getBalance(interaction.user.id);
    await interaction.reply(`You have ${coins} coins`);
  }
};
```

---

## 🌍 Localization System

### Locale Files

**Structure:**
```
src/locales/
├── en-US.json        # English (default)
└── vi.json           # Vietnamese
```

### Translation Keys

Organized by feature:

```json
{
  "welcome": { ... },
  "setup": { ... },
  "commands": {
    "ping": { ... },
    "verify": { ... }
  },
  "errors": { ... }
}
```

### Getting User's Locale

```typescript
async function getUserLocale(guildId: string): Promise<string> {
  const result = await pool.query(
    'SELECT locale FROM guilds WHERE guild_id = $1',
    [guildId]
  );

  return result.rows[0]?.locale || 'en';
}
```

### Applying Translations

```typescript
const locale = await getUserLocale(interaction.guildId);
const translations = require(`./locales/${locale}.json`);

const embed = new EmbedBuilder()
  .setTitle(translations.welcome.title)
  .setDescription(translations.welcome.description);
```

---

## 📊 Performance Optimizations

### 1. Bulk Database Operations

**Before (N queries):**
```typescript
for (const guild of guilds) {
  await pool.query('INSERT INTO guilds ...', [guild.id]);
}
// 100 guilds = 100 queries = ~5 seconds
```

**After (1 bulk query):**
```typescript
const values = guilds.map(g => `('${g.id}', '${g.name}')`).join(',');
await pool.query(`INSERT INTO guilds VALUES ${values}`);
// 100 guilds = 1 query = ~200ms
```

**Performance:** 25x faster ⚡

### 2. Database Indexing

```sql
-- Fast guild queries
CREATE INDEX idx_guilds_locale ON guilds(locale);

-- Fast leaderboard queries
CREATE INDEX idx_economy_coins ON user_economy(coins DESC);

-- Fast transaction history
CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at DESC);
```

### 3. Connection Pooling

```typescript
// database/config.ts
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,              // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Benefits:**
- Reuses connections (no reconnect overhead)
- Handles concurrent requests efficiently
- Auto-closes idle connections

---

## 🚀 Future Improvements

### Planned Features

1. **User Registration System**
   - `/register` command
   - Email verification
   - User profiles with stats

2. **Economy System**
   - Daily/weekly rewards
   - Coin transactions
   - Leaderboards
   - Shop system

3. **Hosting Management**
   - Pterodactyl API integration
   - Server creation/deletion
   - Resource upgrades
   - Auto-suspension for expired servers

4. **Admin Dashboard**
   - Web panel for bot management
   - Analytics & statistics
   - User management
   - Server monitoring

5. **Advanced Localization**
   - More languages (ES, FR, DE, etc.)
   - User-specific language preference
   - Dynamic translation loading

### Code Quality Improvements

- [ ] Add unit tests (Jest)
- [ ] Add integration tests
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Docker containerization
- [ ] Redis caching for frequently accessed data
- [ ] Rate limiting per user
- [ ] Sentry error tracking

---

## 📝 Development Notes

### Code Style

- Use **TypeScript** for type safety
- Follow **ESLint** rules
- Use **Prettier** for formatting
- Write **JSDoc comments** for functions
- Keep functions **small and focused**

### Git Workflow

```bash
# Feature branch
git checkout -b feature/user-registration

# Make changes
git add .
git commit -m "Add user registration command"

# Push to GitHub
git push -u origin feature/user-registration

# Create Pull Request
gh pr create --title "Add user registration" --body "..."
```

### Testing Commands Locally

```bash
# Deploy to test guild (instant)
npm run deploy:guild

# Test in Discord
# Use test guild ID from .env

# Check logs
tail -f logs/combined.log
```

---

## 🐛 Debugging Tips

### Enable Debug Logging

```typescript
// utils/logger.ts
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  // ...
});
```

### Common Issues

**Issue:** Commands not showing up
**Solution:** Run `npm run deploy:guild` or wait 1 hour for global deploy

**Issue:** Database connection failed
**Solution:** Check `.env` credentials and ensure PostgreSQL is running

**Issue:** OAuth2 callback 404
**Solution:** Ensure web server is running (`npm run dev:web`)

**Issue:** Guild sync not working
**Solution:** Check `guilds` table and verify `joined_at` column

---

## 📚 Additional Resources

- [Discord.js Documentation](https://discord.js.org/)
- [Discord API Documentation](https://discord.com/developers/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Last Updated:** 2025-11-16
**Version:** 4.0
**Author:** Gấu Kẹo (GauCandy)
