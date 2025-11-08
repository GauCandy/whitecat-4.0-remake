# Ví dụ sử dụng i18n trong WhiteCat Bot

## Ví dụ 1: Refactor middleware verification

### Trước (hardcoded):

```typescript
const embed = new EmbedBuilder()
  .setColor(0x5865F2)
  .setTitle('🔐 Yêu cầu ủy quyền Discord')
  .setDescription(
    'Bạn cần ủy quyền cho bot để sử dụng lệnh này.\n\n' +
    '**Khi ủy quyền, bạn sẽ:**\n' +
    '• Đồng ý với điều khoản sử dụng bot\n' +
    '• Cho phép bot truy cập thông tin cơ bản của bạn\n' +
    '• Kích hoạt các tính năng như DM, hosting, v.v.\n\n' +
    '**Click vào nút bên dưới để bắt đầu:**'
  )
  .setFooter({ text: 'Bot chỉ truy cập thông tin Discord cơ bản, không yêu cầu email' });
```

### Sau (i18n):

```typescript
import { t } from '../services/locale.service';

const embed = new EmbedBuilder()
  .setColor(0x5865F2)
  .setTitle(t('verification.basic.title'))
  .setDescription(t('verification.basic.description'))
  .setFooter({ text: t('verification.basic.footer') });
```

---

## Ví dụ 2: Sử dụng parameters

### Ban message với expiry time:

```typescript
import { t } from '../services/locale.service';

// Temporary ban
const banMessage = activeBan?.expires_at
  ? t('verification.banned.temporary', {
      expiry: `<t:${Math.floor(activeBan.expires_at.getTime() / 1000)}:F>`
    })
  : t('verification.banned.permanent');

const reason = activeBan?.reason
  ? '\n' + t('verification.banned.reason', { reason: activeBan.reason })
  : '';

await interaction.reply({
  content: `${t('verification.banned.title')}\n\n${banMessage}${reason}\n\n${t('verification.banned.contact')}`,
  flags: MessageFlags.Ephemeral,
});
```

---

## Ví dụ 3: Command descriptions

### ping.ts - Trước:

```typescript
const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Kiểm tra độ trễ của bot'),
  // ...
};
```

### ping.ts - Sau:

```typescript
import { t } from '../services/locale.service';

const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription(t('commands.ping.description')),

  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.deferReply({ fetchReply: true });
    const apiLatency = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = interaction.client.ws.ping;

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle(t('commands.ping.response.title'))
      .setDescription(
        t('commands.ping.response.api_latency', { latency: apiLatency }) + '\n' +
        t('commands.ping.response.ws_ping', { ping: wsPing }) + '\n' +
        t('commands.ping.response.uptime', { uptime: formatUptime(process.uptime()) })
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
```

---

## Ví dụ 4: OAuth success page

### auth.ts - Trước:

```typescript
const title = isVerified ? 'Xác thực Email thành công!' : 'Ủy quyền thành công!';
const description = isVerified
  ? 'Bạn đã đồng ý với điều khoản sử dụng và cấp quyền truy cập email.'
  : 'Bạn đã đồng ý với điều khoản sử dụng và ủy quyền cho bot.';
```

### auth.ts - Sau:

```typescript
import { t } from '../../services/locale.service';

const scope = isVerified ? 'verified' : 'basic';
const title = t(`oauth.success.${scope}.title`);
const description = t(`oauth.success.${scope}.description`);
const features = t(`oauth.success.${scope}.features`);
const note = scope === 'basic' ? `<p>${t('oauth.success.basic.note')}</p>` : '';
```

---

## Ví dụ 5: Multi-language support

### Lấy locale từ user preferences (nếu có):

```typescript
// Giả sử bạn lưu user language preference trong database
const userLocale = (await getUserPreference(userId, 'locale')) || 'vi';

const embed = new EmbedBuilder()
  .setTitle(t('common.success', {}, userLocale))
  .setDescription(t('commands.ping.response.title', {}, userLocale));
```

---

## Build & Test

```bash
# Build project
npm run build

# Nếu có lỗi TypeScript về locale types, chạy:
npm run clean && npm run build
```

## Benefits

✅ Dễ thêm ngôn ngữ mới
✅ Centralized translations
✅ Type-safe với TypeScript
✅ Git-friendly (dễ review changes)
✅ Không cần database/restart để update content
✅ Performance tốt (load vào RAM 1 lần)
