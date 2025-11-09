# User Verification System

WhiteCat Bot features a **2-level verification system** to protect bot features and collect user data responsibly.

## Overview

The verification system has two levels:
- **Basic (Level 1):** OAuth with `identify` scope - User info only (username, avatar)
- **Verified (Level 2):** OAuth with `identify + email` scope - Includes email verification

**Key Concept:** Bot invitation (guild/user install) = Basic verification automatically

---

## Level 1: Basic Verification

### Requirements
- User authorizes bot via Discord OAuth
- OAuth scope: `identify` (basic user info only)
- **OR** invites bot to server (guild/user install)

### Process

**Option A: Via Bot Invite (Recommended)**
1. User clicks invite link (`/invite/guild` or `/invite/user`)
2. Discord OAuth page → User authorizes bot
3. Callback saves user info to database
4. Sets `verification_level = BASIC (1)`
5. User can use basic commands

**Option B: Via Command Authorization**
1. User runs a command requiring basic verification
2. Bot displays "Authorize Bot" button
3. User clicks → OAuth flow with `identify` scope
4. Callback saves user info
5. Sets `verification_level = BASIC (1)`

### Data Collected
- Discord ID
- Username
- Discriminator
- Avatar
- Timestamp of authorization

### Commands Access
- `/help` - Display help
- `/ping` - Check bot latency
- All general commands
- Basic features

### Implementation

**Command Example:**
```typescript
import { SlashCommand } from '../../types/command';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  // Default is 'basic' - no need to specify
  // verificationLevel: 'basic',

  async execute(interaction) {
    // Command code
  }
};
```

**Middleware Check:**
```typescript
// In middleware/verification-check.ts
if (verificationLevel === 'basic') {
  if (user.verification_level < VerificationLevel.BASIC) {
    // Show "Authorize Bot" button
    const authUrl = oauthService.generateAuthUrl(userId, 'basic');
    // Display embed with button
  }
}
```

---

## Level 2: Verified (Email)

### Requirements
- User must already have Basic verification
- Must grant `email` permission via OAuth

### Process
1. User runs a command requiring verified level
2. Bot displays "Email Verification Required" button
3. User clicks → OAuth flow with `identify + email` scope
4. Discord OAuth page → User grants email permission
5. Callback updates user profile with email
6. Sets `verification_level = VERIFIED (2)`
7. User can use premium/verified features

### Data Collected
- All basic data (Discord ID, username, avatar)
- Email address (verified by Discord)
- Timestamp of email verification

### Commands Access
- All basic commands
- Premium features
- Hosting features
- Any advanced features requiring email

### Implementation

**Command Example:**
```typescript
import { SlashCommand } from '../../types/command';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription('Premium feature'),

  // Require verified level
  verificationLevel: 'verified',

  async execute(interaction) {
    // Only verified users can run this
  }
};
```

**Middleware Check:**
```typescript
// In middleware/verification-check.ts
if (verificationLevel === 'verified') {
  if (user.verification_level < VerificationLevel.VERIFIED) {
    // Show "Email Verification Required" button
    const authUrl = oauthService.generateAuthUrl(userId, 'verified');
    // Display embed with button
  }
}
```

---

## Database Schema

```sql
-- Main users table
CREATE TABLE users (
  id SERIAL,
  discord_id TEXT PRIMARY KEY,
  verification_level SMALLINT DEFAULT 0,
    -- 0 = NOT_VERIFIED
    -- 1 = BASIC (has identify)
    -- 2 = VERIFIED (has email)
  account_status SMALLINT DEFAULT 0,
    -- 0 = NORMAL
    -- 1 = BANNED
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User profiles (for verified users)
CREATE TABLE user_profiles (
  discord_id TEXT PRIMARY KEY REFERENCES users(discord_id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  discriminator TEXT NOT NULL,
  avatar TEXT,
  email TEXT,  -- Only for VERIFIED level
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User bans
CREATE TABLE user_bans (
  id SERIAL PRIMARY KEY,
  discord_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
  reason TEXT,
  expires_at TIMESTAMP,  -- NULL = permanent ban
  banned_at TIMESTAMP DEFAULT NOW(),
  unbanned_at TIMESTAMP
);
```

---

## API Endpoints

### Bot Invitation (Auto Basic Verification)

- **Guild Install:** `GET /invite/guild?permissions=<permissions>`
  - Invite bot to server
  - OAuth scope: `bot + applications.commands + identify`
  - Redirects to callback → saves basic user info
  - Sets `verification_level = BASIC`

- **User Install:** `GET /invite/user`
  - Personal bot authorization (User Install Apps)
  - OAuth scope: `applications.commands + identify`
  - Redirects to callback → saves basic user info
  - Sets `verification_level = BASIC`

- **Flexible:** `GET /invite`
  - Supports both guild and user install
  - Automatically sets `verification_level = BASIC`

### Manual Authorization

- **Basic Auth:** `GET /api/auth/discord?user_id=<discord_id>&scope=basic`
  - For users who didn't invite bot
  - OAuth scope: `identify + applications.commands`
  - Redirects to callback
  - Sets `verification_level = BASIC`

- **Email Verification:** `GET /api/auth/discord?user_id=<discord_id>&scope=verified`
  - For premium features
  - OAuth scope: `identify + email + applications.commands`
  - Redirects to callback
  - Sets `verification_level = VERIFIED`

### OAuth Callback

- **Endpoint:** `GET /api/auth/discord/callback?code=<code>&state=<state>`
  - Handles all OAuth callbacks (invite + manual)
  - Exchanges code for access token
  - Fetches user info from Discord API
  - Saves to `users` and `user_profiles` tables
  - Shows success page

### Status Check

- **Endpoint:** `GET /api/auth/status/:userId`
  - Returns user verification status
  - Response:
    ```json
    {
      "success": true,
      "verificationLevel": 2,
      "hasBasicAuth": true,
      "hasEmailVerification": true,
      "email": "user@example.com",
      "status": "normal",
      "banned": false
    }
    ```

---

## User Ban System

The verification system includes user ban functionality:

### Ban User (Temporary)
```typescript
await banRepository.banUser(discordId, reason, expiresAt);
// expiresAt = Date object (e.g., 7 days from now)
```

### Ban User (Permanent)
```typescript
await banRepository.banUser(discordId, reason, null);
// null = permanent ban
```

### Unban User
```typescript
await banRepository.unbanUser(discordId);
```

### Check Ban Status
```typescript
const ban = await banRepository.getActiveBan(discordId);
if (ban) {
  // User is banned
  console.log('Ban reason:', ban.reason);
  console.log('Expires at:', ban.expires_at);
}
```

### Auto-Unban on Expiry
The system automatically checks for expired bans and unbans users when they try to use commands.

---

## Security Considerations

### OAuth Flow
- ✅ Uses Discord's official OAuth2
- ✅ State parameter prevents CSRF attacks
- ✅ HTTPS only in production
- ✅ No password or token storage
- ✅ Email verified by Discord

### Data Collection
- ✅ Basic: Only Discord ID, username, avatar
- ✅ Verified: Adds email (Discord-verified)
- ✅ Minimal data collection
- ✅ User can revoke access anytime via Discord

### Best Practices
- Always check verification level before command execution
- Never store Discord access tokens long-term
- Use HTTPS in production for OAuth callbacks
- Implement rate limiting on API endpoints
- Log all verification attempts for security audit

---

## Migration from Old System

### Old System
```typescript
requireTerms?: boolean // true or false
agreed_terms: 0 | 1 // in database
```

### New System
```typescript
verificationLevel?: 'basic' | 'verified' // in command
verification_level: 0 | 1 | 2 // in database
```

### Migration Steps
1. Run database migration to add `verification_level` column
2. Convert old `agreed_terms = 1` to `verification_level = 1` (BASIC)
3. Users with email already → `verification_level = 2` (VERIFIED)
4. Update middleware to check `verification_level` instead of `agreed_terms`

**Backwards Compatibility:**
The middleware exports both old and new function names:
```typescript
export const checkTermsForSlashCommand = checkVerificationForSlashCommand;
export const checkTermsForPrefixCommand = checkVerificationForPrefixCommand;
```

---

## OAuth Flow Types

The system supports 4 OAuth flow types (defined in `oauth.service.ts`):

1. **`guild`** - Bot invitation to server
   - Scope: `bot + applications.commands + identify`
   - Integration type: 0 (Guild Install)
   - Redirects to callback
   - Sets verification = BASIC

2. **`user`** - User Install Apps
   - Scope: `applications.commands + identify`
   - Integration type: 1 (User Install)
   - Redirects to callback
   - Sets verification = BASIC

3. **`basic`** - Manual basic authorization
   - Scope: `identify + applications.commands`
   - No integration type (pure OAuth)
   - Redirects to callback
   - Sets verification = BASIC

4. **`verified`** - Email verification
   - Scope: `identify + email + applications.commands`
   - No integration type (pure OAuth)
   - Redirects to callback
   - Sets verification = VERIFIED

---

## Testing

### Test Basic Verification (via Invite)
1. Navigate to `http://localhost:3000/invite/guild`
2. Authorize bot on Discord
3. Should redirect to success page
4. Check database: `verification_level = 1`
5. Run `/ping` command → should work

### Test Email Verification
1. User with basic verification runs premium command
2. Bot shows "Email Verification Required" button
3. User clicks → OAuth with email scope
4. Complete OAuth flow
5. Check database: `verification_level = 2`
6. Run premium command → should work

### Test Ban System
1. Ban a user: `banRepository.banUser(userId, 'Test ban', null)`
2. User tries to run any command
3. Should see ban message with reason
4. Unban user: `banRepository.unbanUser(userId)`
5. User can run commands again

---

[← Back to Main README](../README.md) | [API Documentation →](api.md)
