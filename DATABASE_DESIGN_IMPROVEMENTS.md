# 🎨 WhiteCat Bot - Database Design Improvements

**Ngày refactor:** 2025-11-17
**Người thực hiện:** Claude Code
**Mục tiêu:** Giữ database schema tối giản và clean

---

## 🎯 TẠI SAO REDESIGN?

### Vấn đề cũ:
Bảng `users` bị "béo phì" với quá nhiều cột không liên quan:
```sql
CREATE TABLE users (
  discord_id, username,       -- ✅ Core data
  discriminator, avatar,       -- 🤔 Extended Discord info
  email,                       -- 🤔 From OAuth
  is_authorized,              -- 🤔 OAuth status
  oauth_access_token,         -- 🔐 Sensitive tokens
  oauth_refresh_token,        -- 🔐 Sensitive tokens
  oauth_token_expires_at,     -- 🤔 OAuth metadata
  oauth_scopes,               -- 🤔 OAuth metadata
  pterodactyl_user_id,        -- 🤔 Integration
  terms_accepted_at,          -- 🤔 Compliance
  ...                         -- 😵 TOO MUCH!
);
```

### Vấn đề:
- ❌ **Violates Single Responsibility** - 1 bảng làm quá nhiều việc
- ❌ **Poor normalization** - Mixed concerns
- ❌ **Security risk** - Tokens nằm chung với user data
- ❌ **Hard to maintain** - Thêm feature = thêm cột vào users
- ❌ **Poor query performance** - Phải load hết data kể cả khi không cần

---

## ✨ THIẾT KẾ MỚI - SEPARATION OF CONCERNS

### 1. Bảng `users` - MINIMALIST CORE ⭐
```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  discord_id VARCHAR(20) UNIQUE NOT NULL,
  username VARCHAR(100) NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  last_seen TIMESTAMP
);
```

**Chỉ chứa:**
- ✅ Discord ID (primary identifier)
- ✅ Username (display name)
- ✅ Timestamps (metadata)

**Lợi ích:**
- 🚀 **Nhỏ gọn** - Chỉ 6 cột thay vì 15+
- 🚀 **Fast queries** - Ít data để scan
- 🚀 **Clear purpose** - "Core user identity"

---

### 2. Bảng `user_profiles` - EXTENDED INFO 📋
```sql
CREATE TABLE user_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  discriminator VARCHAR(10),
  avatar VARCHAR(100),
  email VARCHAR(255),
  pterodactyl_user_id INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Chứa:**
- Discord extended data (discriminator, avatar)
- Email từ OAuth
- Integration IDs (Pterodactyl, etc.)

**Lợi ích:**
- 📦 **Optional data** - Chỉ tồn tại khi cần
- 📦 **Easy to extend** - Thêm integration mới không ảnh hưởng `users`
- 📦 **1-to-1 relationship** - Clean và simple

---

### 3. Bảng `user_oauth` - OAUTH TOKENS 🔐
```sql
CREATE TABLE user_oauth (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_authorized BOOLEAN,
  scopes TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  terms_accepted_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Chứa:**
- OAuth authorization status
- Access & refresh tokens
- Token expiry time
- Granted scopes

**Lợi ích:**
- 🔐 **Security isolation** - Tokens tách biệt khỏi user data
- 🔐 **Easy to encrypt** - Có thể encrypt toàn bộ bảng
- 🔐 **Easy to revoke** - Xóa record = revoke access
- 🔐 **Audit trail** - Track authorization changes

---

## 📊 SO SÁNH TRƯỚC VÀ SAU

### TRƯỚC: Monolithic Design ❌
```sql
-- Query user + OAuth data
SELECT * FROM users WHERE discord_id = '123';
-- Returns: 15+ cột, bao gồm tokens và data không cần thiết
```

### SAU: Modular Design ✅
```sql
-- Query chỉ user info (fast!)
SELECT * FROM users WHERE discord_id = '123';
-- Returns: 6 cột

-- Query user + OAuth khi cần
SELECT u.*, uo.is_authorized, uo.token_expires_at
FROM users u
LEFT JOIN user_oauth uo ON u.id = uo.user_id
WHERE u.discord_id = '123';
-- Returns: Chỉ data cần thiết

-- Query full user profile
SELECT u.*, up.email, up.avatar, uo.is_authorized
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_oauth uo ON u.id = uo.user_id
WHERE u.discord_id = '123';
-- Returns: Complete data với JOIN
```

---

## 🔄 CODE CHANGES SUMMARY

### 1. `authorization.ts` - Refactored với JOINs
```typescript
// CŨ: Query từ 1 bảng users
const result = await pool.query(
  'SELECT is_authorized, oauth_token_expires_at FROM users WHERE discord_id = $1'
);

// MỚI: JOIN user_oauth
const result = await pool.query(`
  SELECT u.id, uo.is_authorized, uo.token_expires_at
  FROM users u
  LEFT JOIN user_oauth uo ON u.id = uo.user_id
  WHERE u.discord_id = $1
`);
```

### 2. `profile.ts` - JOIN multiple tables
```typescript
// MỚI: JOIN cả user_profiles và user_oauth
const result = await pool.query(`
  SELECT
    u.id, u.username, u.created_at,
    up.email, up.discriminator,
    uo.is_authorized,
    ue.balance
  FROM users u
  LEFT JOIN user_profiles up ON u.id = up.user_id
  LEFT JOIN user_oauth uo ON u.id = uo.user_id
  LEFT JOIN user_economy ue ON u.id = ue.user_id
  WHERE u.discord_id = $1
`);
```

### 3. `auth.ts` - Use helper functions
```typescript
// CŨ: Manual INSERT
await pool.query(`INSERT INTO users (discord_id, username, ...) VALUES (...)`);

// MỚI: Helper functions handle complexity
await registerUser(discordId, username, discriminator, avatar);
await storeOAuthTokens(discordId, accessToken, refreshToken, expiresIn, scopes, email);
```

---

## 🎁 BENEFITS

### 1. **Separation of Concerns** ✅
- `users`: Core identity
- `user_profiles`: Extended info
- `user_oauth`: Authorization

Mỗi bảng có 1 trách nhiệm rõ ràng!

### 2. **Better Security** 🔐
- OAuth tokens được cách ly
- Dễ implement encryption cho `user_oauth`
- Dễ implement access control
- Dễ audit trail

### 3. **Easier to Scale** 📈
- Thêm integration mới? → Thêm cột vào `user_profiles`
- Thêm OAuth provider? → Update `user_oauth`
- Core `users` table không bao giờ thay đổi!

### 4. **Better Performance** 🚀
```sql
-- Chỉ cần username? → Query users table (nhỏ, nhanh)
SELECT username FROM users WHERE discord_id = '123';

-- Cần OAuth status? → JOIN user_oauth
SELECT u.username, uo.is_authorized
FROM users u JOIN user_oauth uo ON u.id = uo.user_id
WHERE u.discord_id = '123';
```

### 5. **Cleaner Code** 💎
- Helper functions ẩn complexity
- Code dễ đọc, dễ maintain
- Type-safe với proper interfaces

---

## 📦 MIGRATION STRATEGY

### Option 1: Fresh Install (Dev/Testing)
```bash
npm run db:reset
```

### Option 2: Migration (Production - Preserve Data)
```bash
# Run migration 003
psql -U user -d whitecat_bot -f database/migrations/003_add_user_extended_tables.sql
```

Migration sẽ:
1. ✅ Tạo bảng `user_profiles`
2. ✅ Tạo bảng `user_oauth`
3. ✅ Tạo indexes cho performance
4. ✅ Setup triggers cho auto-update timestamps
5. ⚠️ (Optional) Migrate data từ cột cũ sang bảng mới

---

## 🏗️ FOLLOW DATABASE NORMALIZATION

### Third Normal Form (3NF) ✅
- ✅ No transitive dependencies
- ✅ Each table has single purpose
- ✅ No data duplication
- ✅ Proper foreign keys

### ACID Compliance ✅
- ✅ CASCADE deletes maintain integrity
- ✅ Transactions for multi-table updates
- ✅ Proper indexes for consistency

---

## 🎯 FUTURE-PROOF DESIGN

### Dễ mở rộng:
```sql
-- Thêm 2FA? → Thêm vào user_oauth
ALTER TABLE user_oauth ADD COLUMN two_factor_secret TEXT;

-- Thêm social links? → Thêm vào user_profiles
ALTER TABLE user_profiles ADD COLUMN twitter_handle VARCHAR(50);

-- Bảng users không bao giờ thay đổi! ✅
```

### Dễ tích hợp:
- Thêm Stripe? → `user_profiles.stripe_customer_id`
- Thêm GitHub? → Tạo bảng `user_github_oauth`
- Thêm Google? → Tạo bảng `user_google_oauth`

**Core users table luôn stable!**

---

## 📝 FILES CHANGED

### Database Schema
- ✅ `database/schema.sql` - Redesigned với 3 tables
- ✅ `database/migrations/003_add_user_extended_tables.sql` - Migration script

### Code Refactored
- ✅ `src/middlewares/authorization.ts` - JOINs + helper functions
- ✅ `src/commands/utility/profile.ts` - Multi-table JOINs
- ✅ `web/routes/auth.ts` - Use helper functions

### Documentation
- ✅ `DATABASE_DESIGN_IMPROVEMENTS.md` - This file
- ✅ `DATABASE_SECURITY_AUDIT_REPORT.md` - Archived (old design)

---

## 🎉 CONCLUSION

**Before:** Monolithic, messy, hard to maintain
**After:** Clean, modular, scalable, secure

**Philosophy:**
> "Keep the core small and simple.
> Extend with separate tables when needed.
> Each table should have one clear purpose."

---

**Report generated by Claude Code**
**Date:** 2025-11-17
**Design Pattern:** Separation of Concerns + Database Normalization
