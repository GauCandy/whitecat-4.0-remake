# Hệ thống Đa ngôn ngữ (i18n)

## Cấu trúc

```
src/locales/
├── vi.json          # Tiếng Việt (mặc định)
├── en.json          # English
└── README.md        # Hướng dẫn
```

## Cách sử dụng

### 1. Import locale service

```typescript
import { localeService, t } from '../services/locale.service';
```

### 2. Sử dụng helper function `t()`

```typescript
// Lấy translation đơn giản
const errorMsg = t('common.error'); // "Đã xảy ra lỗi"

// Với parameters
const banMsg = t('verification.banned.temporary', {
  expiry: '<t:1234567890:F>'
});

// Với locale cụ thể
const welcomeEN = t('common.success', {}, 'en'); // "Success"
```

### 3. Sử dụng trong Discord commands

```typescript
import { t } from '../services/locale.service';

const embed = new EmbedBuilder()
  .setTitle(t('verification.basic.title'))
  .setDescription(t('verification.basic.description'))
  .setFooter({ text: t('verification.basic.footer') });
```

### 4. Sử dụng locale service trực tiếp

```typescript
// Get full locale data
const viData = localeService.getLocaleData('vi');

// Get available locales
const locales = localeService.getAvailableLocales(); // ['vi', 'en']

// Reload locales (for development)
localeService.reload();
```

## Thêm ngôn ngữ mới

1. Tạo file JSON mới (ví dụ: `ja.json`)
2. Copy cấu trúc từ `vi.json`
3. Dịch tất cả strings
4. Thêm locale vào type `SupportedLocale` trong `src/types/locale.ts`
5. Restart bot

## Parameters

Sử dụng `{key}` trong translation strings:

```json
{
  "welcome": "Xin chào {username}!"
}
```

```typescript
t('welcome', { username: 'Gấu Kẹo' }); // "Xin chào Gấu Kẹo!"
```

## Fallback

- Nếu không tìm thấy key trong locale hiện tại, sẽ fallback về `vi` (default)
- Nếu vẫn không tìm thấy, sẽ trả về path string
