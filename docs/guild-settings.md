# Hướng dẫn Guild Settings System

## Tổng quan

Hệ thống guild settings cho phép mỗi server tùy chỉnh:
- **Ngôn ngữ (Language)**: Vi hoặc English
- **Prefix**: Custom command prefix (mặc định: `!`)

## Database Schema

### Bảng `guilds`

```sql
CREATE TABLE guilds (
  guild_id TEXT PRIMARY KEY,          -- Discord guild ID
  locale TEXT NOT NULL DEFAULT 'vi',  -- 'vi' hoặc 'en'
  prefix TEXT NOT NULL DEFAULT '!',   -- Custom prefix
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Auto-create Guilds

Bot tự động tạo guild record khi:

1. **Bot khởi động**: Tạo records cho tất cả guilds hiện tại
2. **Bot join guild mới**: Auto-create khi join
3. **Bot leave guild**: Auto-delete record

```typescript
// Trong bot.ts
client.once(Events.ClientReady, async () => {
  // Auto-create cho tất cả guilds
  for (const guild of client.guilds.cache.values()) {
    await guildRepository.getOrCreateGuild(guild.id);
  }
});

client.on(Events.GuildCreate, async (guild) => {
  // Auto-create khi join
  await guildRepository.getOrCreateGuild(guild.id);
});

client.on(Events.GuildDelete, async (guild) => {
  // Auto-delete khi leave
  await guildRepository.deleteGuild(guild.id);
});
```

## Commands

### 1. `/language`

**Permission**: Manage Server
**Verification**: Basic OAuth

```typescript
/language language:Vietnamese
/language language:English
```

**Features**:
- Chỉ admin (Manage Server permission) sử dụng được
- Không dùng được trong DMs
- Choices: 🇻🇳 Tiếng Việt, 🇺🇸 English

### 2. `/prefix`

**Permission**: Manage Server
**Verification**: Basic OAuth

```typescript
/prefix prefix:!
/prefix prefix:?
/prefix prefix:w!
```

**Validation**:
- Không được rỗng
- Max 5 ký tự
- Không chứa khoảng trắng
- Chỉ admin sử dụng được

## Guild Repository API

```typescript
import { guildRepository } from './database/repositories/guild.repository';

// Get guild settings
const guild = await guildRepository.getGuildById(guildId);

// Get or create (auto-create if not exists)
const guild = await guildRepository.getOrCreateGuild(guildId);

// Set locale
await guildRepository.setLocale(guildId, 'en');

// Set prefix
await guildRepository.setPrefix(guildId, '?');

// Update multiple fields
await guildRepository.updateGuild(guildId, {
  locale: 'en',
  prefix: '?'
});

// Delete guild
await guildRepository.deleteGuild(guildId);

// Stats
const count = await guildRepository.getGuildCount();
const allGuilds = await guildRepository.getAllGuilds();
```

## Locale Service Integration

```typescript
import { localeService } from './services/locale.service';

// Get guild's locale
const locale = await localeService.getGuildLocale(guildId);

// Translate with guild locale
const message = await localeService.tGuild(
  guildId,
  'common.success',
  { user: 'Gấu Kẹo' }
);
```

## Example Usage

### Trong command execute:

```typescript
async execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId;

  // Get guild locale
  const locale = await localeService.getGuildLocale(guildId);

  // Use guild locale for responses
  const message = localeService.t(locale, 'commands.ping.response.title');

  await interaction.reply(message);
}
```

### Lấy prefix từ database:

```typescript
// Get custom prefix for prefix commands
const guild = await guildRepository.getGuildById(guildId);
const prefix = guild?.prefix || '!';

if (message.content.startsWith(prefix)) {
  // Handle prefix command
}
```

## Migration từ database cũ

Nếu bạn có database cũ, chạy:

```bash
npm run db:init
```

Schema sẽ tự động tạo bảng `guilds` nếu chưa tồn tại.

## Testing

1. Deploy commands:
```bash
npm run deploy
```

2. Restart bot:
```bash
npm run dev
```

3. Test trong Discord:
```
/language language:English
/prefix prefix:?
```

4. Check database:
```sql
SELECT * FROM guilds;
```

## Notes

- Mặc định locale: `vi`
- Mặc định prefix: `!`
- Guild records được tự động tạo, không cần manual setup
- Khi bot leave guild, record sẽ bị xóa (CASCADE)
- Locale chỉ ảnh hưởng đến bot responses, không ảnh hưởng slash command names
