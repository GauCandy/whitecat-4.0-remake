# 🔒 WhiteCat Bot - Database Security Audit Report

**Ngày kiểm tra:** 2025-11-17
**Người thực hiện:** Claude Code
**Mức độ nghiêm trọng:** 🔴 **CRITICAL**

---

## 📋 Tóm tắt Executive Summary

Đã tìm thấy **1 lỗi CRITICAL** và **3 lỗi tiềm ẩn** trong codebase liên quan đến database:

- 🔴 **CRITICAL:** Schema mismatch giữa code và database → Bot sẽ CRASH
- 🟡 **MEDIUM:** SQL injection tiềm ẩn trong init.ts
- 🟢 **LOW:** Missing file trong migration script
- ⚠️ **WARNING:** Lưu OAuth tokens không mã hóa

---

## 🔴 LỖI 1: SCHEMA MISMATCH - CRITICAL

### Mô tả
Code đang query/update các cột **KHÔNG TỒN TẠI** trong database schema.

### Tác động
- ✅ Bot sẽ **CRASH ngay lập tức** khi user dùng lệnh `/verify`
- ✅ Bot sẽ **CRASH** khi user dùng lệnh `/profile`
- ✅ Bot sẽ **CRASH** khi check authorization cho BẤT KỲ lệnh nào
- ✅ OAuth callback sẽ **CRASH** khi cố lưu tokens
- ✅ Bot **HOÀN TOÀN KHÔNG THẾ SỬ DỤNG** trong production

### Các cột bị thiếu trong `users` table

| Cột | Được sử dụng ở | Mục đích |
|-----|----------------|----------|
| `discriminator` | `authorization.ts:248`, `profile.ts:32` | Discord tag (#1234) |
| `avatar` | `authorization.ts:248` | Discord avatar hash |
| `email` | `authorization.ts:292`, `profile.ts:32` | Email từ OAuth |
| `is_authorized` | `authorization.ts:32,102`, `profile.ts:33` | Trạng thái auth |
| `oauth_access_token` | `authorization.ts:288` | OAuth token |
| `oauth_refresh_token` | `authorization.ts:289` | Refresh token |
| `oauth_token_expires_at` | `authorization.ts:32,102,290` | Token expiry |
| `oauth_scopes` | `authorization.ts:32,102,291` | Granted scopes |
| `terms_accepted_at` | `authorization.ts:293` | Terms acceptance |
| `pterodactyl_user_id` | `profile.ts:32` | Hosting integration |

### Files bị ảnh hưởng
```
src/middlewares/authorization.ts:32    ❌ SELECT is_authorized, oauth_token_expires_at, oauth_scopes
src/middlewares/authorization.ts:102   ❌ SELECT is_authorized, oauth_token_expires_at, oauth_scopes
src/middlewares/authorization.ts:248   ❌ INSERT discriminator, avatar
src/middlewares/authorization.ts:284   ❌ UPDATE oauth_access_token, oauth_refresh_token, ...
src/commands/utility/profile.ts:32     ❌ SELECT discriminator, email, pterodactyl_user_id, is_authorized
```

### ✅ Giải pháp đã implement
1. ✅ Tạo migration `003_add_missing_user_columns.sql`
2. ✅ Cập nhật `database/schema.sql` với các cột còn thiếu
3. ✅ Thêm indexes cho performance

### Cách apply fix
```bash
# Chạy migration để thêm các cột vào database hiện tại
npm run db:migrate

# HOẶC reset database từ đầu với schema mới
npm run db:reset
```

---

## 🟡 LỖI 2: SQL INJECTION TIỀM ẨN - MEDIUM

### Mô tả
File `src/database/init.ts` dòng 127 sử dụng string interpolation trực tiếp vào SQL query.

### Code bị lỗi
```typescript
// ❌ DANGEROUS - SQL Injection tiềm ẩn
await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
```

### Tác động
- Nếu biến `table` được kiểm soát bởi attacker → SQL injection
- Tuy nhiên, trong context hiện tại, `table` được lấy từ database metadata nên **risk thấp**

### ✅ Giải pháp đề xuất
```typescript
// ✅ SAFE - Whitelist table names
const allowedTables = ['users', 'guilds', 'transactions', ...];
if (allowedTables.includes(table)) {
  await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
}
```

**Mức độ ưu tiên:** Medium (không urgent nhưng nên fix)

---

## 🟢 LỖI 3: MISSING MIGRATION FILE - LOW

### Mô tả
File `src/scripts/run-migration.ts` cố load file không tồn tại.

### Code bị lỗi
```typescript
// ❌ File này KHÔNG TỒN TẠI
const migrationPath = join(__dirname, '../../database/migrations/001_add_pterodactyl_user_id.sql');
```

### Files hiện có trong migrations/
```
001_simplify_guilds.sql
002_remove_giveaway_alt_detection.sql
003_add_missing_user_columns.sql  ← Mới tạo
```

### Tác động
- Script migration sẽ fail nếu được chạy
- Không ảnh hưởng bot runtime

### ✅ Giải pháp
- Xóa file `src/scripts/run-migration.ts` (không còn cần thiết)
- HOẶC update để load đúng migration file

---

## ⚠️ WARNING: OAUTH TOKENS KHÔNG MÃ HÓA

### Mô tả
OAuth tokens được lưu **PLAIN TEXT** trong database.

### Code
```typescript
// authorization.ts:284-296
await pool.query(`
  UPDATE users SET
    oauth_access_token = $2,      -- ⚠️ Plain text
    oauth_refresh_token = $3,     -- ⚠️ Plain text
    ...
`);
```

### Rủi ro
- Nếu database bị breach → attacker có full access vào Discord account của users
- Tokens có thể được sử dụng để impersonate users

### ✅ Best Practice đề xuất
```typescript
import crypto from 'crypto';

// Encrypt tokens trước khi lưu
function encryptToken(token: string): string {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}
```

**Mức độ ưu tiên:** Medium (nên implement cho production)

---

## 🔍 POSITIVE FINDINGS (Những điểm tốt)

✅ **Parameterized Queries được sử dụng đúng cách**
- File `web/routes/auth.ts` dùng `$1, $2` placeholders ✅
- File `src/events/ready.ts` dùng parameterized bulk insert ✅
- Hầu hết các queries đều an toàn

✅ **XSS Protection đã được implement**
- `web/routes/auth.ts` có function `escapeHtml()` ✅
- User input được sanitize trước khi inject vào HTML ✅

✅ **Database Connection Pool được config tốt**
- Có min/max connections
- Có timeout settings
- Có error handling

✅ **Schema design hợp lý**
- Foreign keys được sử dụng đúng
- Indexes được tạo cho các queries thường dùng
- Có triggers cho auto-update timestamps

---

## 📊 CHECKLIST ACTIONS

### 🔴 CRITICAL (Phải làm ngay)
- [x] Tạo migration `003_add_missing_user_columns.sql`
- [x] Cập nhật `database/schema.sql`
- [ ] **Run migration trên database production/dev**
- [ ] Test lại `/verify`, `/profile`, authorization

### 🟡 MEDIUM (Nên làm sớm)
- [ ] Fix SQL injection trong `init.ts:127`
- [ ] Implement encryption cho OAuth tokens
- [ ] Fix/xóa `run-migration.ts`

### 🟢 LOW (Có thể làm sau)
- [ ] Add database backup strategy
- [ ] Add audit logging cho sensitive operations
- [ ] Review và optimize indexes

---

## 🚀 CÁCH DEPLOY FIX

### Option 1: Migration (Khuyến nghị cho production)
```bash
# Backup database trước
pg_dump whitecat_bot > backup_$(date +%Y%m%d).sql

# Run migration
psql -U whitecat_user -d whitecat_bot -f database/migrations/003_add_missing_user_columns.sql

# Verify
psql -U whitecat_user -d whitecat_bot -c "\d users"
```

### Option 2: Reset (Chỉ dùng cho dev)
```bash
npm run db:reset
```

---

## 📝 NOTES

1. **Tại sao lỗi này xảy ra?**
   - Có vẻ như code được update nhưng schema.sql không được sync
   - Migration cũ có thể đã thêm các cột này nhưng bị xóa/mất

2. **Tại sao bot vẫn chạy được trước đây?**
   - Có thể database production đã có các cột này (từ migration cũ)
   - Schema.sql bị simplified gần đây (commit "tối giản database")
   - Chỉ bị lỗi khi setup database mới từ schema.sql

3. **Độ ưu tiên:**
   - Fix schema mismatch: **URGENT** 🔴
   - Encrypt tokens: **IMPORTANT** 🟡
   - SQL injection fix: **NICE TO HAVE** 🟢

---

## 🔗 FILES CHANGED

- ✅ `database/migrations/003_add_missing_user_columns.sql` (NEW)
- ✅ `database/schema.sql` (UPDATED)
- ✅ `DATABASE_SECURITY_AUDIT_REPORT.md` (NEW)

---

**Report generated by Claude Code**
**Date:** 2025-11-17
