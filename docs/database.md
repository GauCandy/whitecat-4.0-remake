# Database Reference

Complete guide to WhiteCat Bot's PostgreSQL database schema and repositories.

## Table of Contents
- [Overview](#overview)
- [Schema](#schema)
- [User Repository](#user-repository)
- [Common Operations](#common-operations)
- [Direct Queries](#direct-queries)
- [Best Practices](#best-practices)

---

## Overview

WhiteCat Bot uses PostgreSQL for persistent data storage:
- **User management** - Discord IDs, emails, verification status
- **Ban system** - Temporary and permanent bans
- **Milestone tracking** - Auto-increment IDs for events

**Connection:** Uses `pg-pool` for connection pooling
**Schema File:** `database/schema.sql`
**Repository:** `src/database/repositories/user.repository.ts`

---

## Schema

### Users Table

```sql
CREATE TABLE users (
  -- Auto-increment ID for milestone tracking
  id SERIAL,

  -- Primary key: Discord user ID
  discord_id TEXT PRIMARY KEY,

  -- User email (NULL if not verified via OAuth)
  email TEXT,

  -- Terms agreement: 0 = not agreed, 1 = agreed
  agreed_terms SMALLINT NOT NULL DEFAULT 0 CHECK (agreed_terms IN (0, 1)),

  -- Account status: 0 = normal, 1 = banned
  account_status SMALLINT NOT NULL DEFAULT 0 CHECK (account_status IN (0, 1)),

  -- Ban expiration (NULL = permanent ban)
  ban_expires_at TIMESTAMP WITH TIME ZONE,

  -- Timestamp when user was banned
  banned_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### Indexes

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_account_status ON users(account_status);
CREATE INDEX idx_users_agreed_terms ON users(agreed_terms);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_id ON users(id);
```

### Auto-Update Trigger

```sql
-- Automatically update updated_at on row change
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## User Repository

### Import

```typescript
import { userRepository, AccountStatus } from '../database/repositories/user.repository';
```

### User Interface

```typescript
interface User {
  id: number;                    // Auto-increment ID
  discord_id: string;             // Discord user ID
  email: string | null;           // Email (null if not verified)
  agreed_terms: number;           // 0 or 1
  account_status: AccountStatus;  // 0 = NORMAL, 1 = BANNED
  ban_expires_at: Date | null;    // Ban expiration
  banned_at: Date | null;         // Ban timestamp
  created_at: Date;               // Created timestamp
  updated_at: Date;               // Updated timestamp
}
```

### AccountStatus Enum

```typescript
enum AccountStatus {
  NORMAL = 0,   // No issues
  BANNED = 1,   // Warned/banned (temporary or permanent)
}
```

---

## Common Operations

### Create User

```typescript
const user = await userRepository.createUser({
  discord_id: '123456789012345678',
});

// With email
const verifiedUser = await userRepository.createUser({
  discord_id: '123456789012345678',
  email: 'user@example.com',
  agreed_terms: 1,
});
```

### Get User by Discord ID

```typescript
const user = await userRepository.getUserByDiscordId('123456789012345678');

if (!user) {
  console.log('User not found');
} else {
  console.log(`User: ${user.discord_id}, Email: ${user.email}`);
}
```

### Get or Create User

```typescript
// Returns existing user or creates new one
const user = await userRepository.getOrCreateUser({
  discord_id: '123456789012345678',
});
```

### Update User

```typescript
await userRepository.updateUser({
  discord_id: '123456789012345678',
  email: 'newemail@example.com',
  agreed_terms: 1,
});
```

### Agree to Terms

```typescript
await userRepository.agreeToTerms('123456789012345678');
// Sets agreed_terms = 1
```

### Set User Email

```typescript
await userRepository.setUserEmail(
  '123456789012345678',
  'user@example.com'
);
```

---

## Ban System

### Ban User (Temporary)

```typescript
// Ban for 7 days
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 7);

await userRepository.banUser('123456789012345678', expiresAt);
```

### Ban User (Permanent)

```typescript
await userRepository.banUser('123456789012345678', null);
// null = permanent ban
```

### Unban User

```typescript
await userRepository.unbanUser('123456789012345678');
```

### Check if User is Banned

```typescript
const isBanned = await userRepository.isUserBanned('123456789012345678');

if (isBanned) {
  console.log('User is currently banned');
}

// Note: Automatically unbans if ban expired
```

---

## Statistics

### Total User Count

```typescript
const total = await userRepository.getTotalUsers();
console.log(`Total users: ${total}`);
```

### Users Who Agreed to Terms

```typescript
const agreedCount = await userRepository.getAgreedUsersCount();
console.log(`Users with terms: ${agreedCount}`);
```

### Verified Users (Have Email)

```typescript
const verifiedCount = await userRepository.getVerifiedUsersCount();
console.log(`Verified users: ${verifiedCount}`);
```

### Users by Status

```typescript
import { AccountStatus } from '../database/repositories/user.repository';

const normalUsers = await userRepository.getUsersByStatus(AccountStatus.NORMAL);
const bannedUsers = await userRepository.getUsersByStatus(AccountStatus.BANNED);

console.log(`Normal: ${normalUsers.length}, Banned: ${bannedUsers.length}`);
```

---

## Direct Queries

For custom queries, use the `query` function:

```typescript
import { query } from '../database/pool';

// Simple query
const results = await query<User>(
  'SELECT * FROM users WHERE email LIKE $1',
  ['%@gmail.com']
);

// With transaction
import { transaction } from '../database/pool';

await transaction(async (client) => {
  await client.query('UPDATE users SET agreed_terms = 1 WHERE discord_id = $1', [userId]);
  await client.query('INSERT INTO logs (user_id, action) VALUES ($1, $2)', [userId, 'agreed']);
});
```

---

## Best Practices

### 1. Always Use Parameterized Queries

```typescript
// ✅ Good
await query('SELECT * FROM users WHERE discord_id = $1', [userId]);

// ❌ Bad (SQL injection risk!)
await query(`SELECT * FROM users WHERE discord_id = '${userId}'`);
```

### 2. Handle Null Values

```typescript
const user = await userRepository.getUserByDiscordId(userId);

if (!user) {
  // Handle user not found
  return;
}

// Check email is not null
if (user.email) {
  console.log(`Email: ${user.email}`);
} else {
  console.log('User has not verified email');
}
```

### 3. Use Transactions for Multiple Operations

```typescript
import { transaction } from '../database/pool';

await transaction(async (client) => {
  // Both operations succeed or both fail
  await client.query('UPDATE users SET agreed_terms = 1 WHERE discord_id = $1', [userId]);
  await client.query('INSERT INTO audit_log (user_id, action) VALUES ($1, $2)', [userId, 'terms_agreed']);
});
```

### 4. Check Ban Status Before Actions

```typescript
const isBanned = await userRepository.isUserBanned(userId);

if (isBanned) {
  await interaction.reply({
    content: 'Your account is banned.',
    ephemeral: true
  });
  return;
}

// Proceed with command
```

### 5. Error Handling

```typescript
try {
  const user = await userRepository.getUserByDiscordId(userId);
  // Use user data
} catch (error) {
  console.error('Database error:', error);
  // Handle error gracefully
}
```

---

## Migration

### Initialize Database

```bash
npm run db:init
```

Runs `database/schema.sql` to create tables and indexes.

### Reset Database

```bash
npm run db:reset
```

⚠️ **Warning:** Drops all tables and recreates them. All data will be lost!

### Drop Tables

```bash
npm run db:drop
```

⚠️ **Warning:** Drops all tables. All data will be lost!

---

## Connection Pool

### Configuration

```env
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### Pool Status

```typescript
import { getPool } from '../database/pool';

const pool = getPool();
console.log(`Total connections: ${pool.totalCount}`);
console.log(`Idle connections: ${pool.idleCount}`);
console.log(`Waiting requests: ${pool.waitingCount}`);
```

### Test Connection

```typescript
import { testConnection } from '../database/pool';

const isConnected = await testConnection();
if (isConnected) {
  console.log('Database connection successful');
}
```

### Close Pool

```typescript
import { closePool } from '../database/pool';

await closePool();
```

---

## Example: Complete User Flow

```typescript
import { userRepository, AccountStatus } from '../database/repositories/user.repository';

async function handleNewUser(discordId: string, email?: string) {
  // Step 1: Get or create user
  let user = await userRepository.getOrCreateUser({ discord_id: discordId });

  // Step 2: If user agreed to terms
  if (user.agreed_terms === 0) {
    await userRepository.agreeToTerms(discordId);
    user = await userRepository.getUserByDiscordId(discordId);
  }

  // Step 3: If email provided (OAuth flow)
  if (email && !user.email) {
    await userRepository.setUserEmail(discordId, email);
    user = await userRepository.getUserByDiscordId(discordId);
  }

  // Step 4: Check ban status
  const isBanned = await userRepository.isUserBanned(discordId);
  if (isBanned) {
    console.log('User is banned');
    return;
  }

  // Step 5: Get milestone info
  console.log(`User #${user.id} - Created: ${user.created_at}`);

  return user;
}
```

---

## Database Backup

### Manual Backup

```bash
# Backup database
pg_dump -U postgres -d whitecat_bot > backup.sql

# Restore database
psql -U postgres -d whitecat_bot < backup.sql
```

### Automated Backup (Production)

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * pg_dump -U postgres -d whitecat_bot > /backups/whitecat_$(date +\%Y\%m\%d).sql
```

---

[← Back to Main README](../README.md) | [Deployment Guide →](deployment.md)
