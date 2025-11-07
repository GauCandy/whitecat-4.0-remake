# User Verification System

WhiteCat Bot features a **2-level verification system** to protect bot features and collect user data responsibly.

## Overview

The verification system has two levels:
- **Basic:** Simple terms agreement (no email required)
- **Verified:** Full OAuth authentication with email collection

## Level 1: Basic Verification

### Requirements
- User must agree to Terms of Service
- No email or additional permissions required

### Process
1. User runs a command requiring basic verification
2. Bot displays embed with "Agree to Terms" button
3. User clicks button → redirects to web page
4. Server sets `agreed_terms = 1` in database
5. User returns to Discord → can use basic commands

### Data Collected
- Discord ID only
- Timestamp of agreement

### Commands Access
- `/help` - Display help
- `/ping` - Check bot latency
- All future basic commands

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
// In middleware/terms-check.ts
if (verificationLevel === 'basic') {
  if (user.agreed_terms === 0) {
    // Show "Agree to Terms" button
    // Link: /api/auth/terms?user_id=<id>
  }
}
```

## Level 2: Verified (OAuth)

### Requirements
- User must complete Discord OAuth flow
- Must grant email permission to bot

### Process
1. User runs a command requiring verified level
2. Bot displays embed with "Authenticate with Discord" button
3. User clicks → redirects to Discord OAuth page
4. User logs in and grants email permission
5. Discord redirects to callback URL
6. Server saves email + sets `agreed_terms = 1`
7. User returns to Discord → can use verified commands

### Data Collected
- Discord ID
- Email address
- Timestamp of agreement

### Commands Access
- All basic commands
- Premium features (to be added)
- Hosting features (to be added)
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
// In middleware/terms-check.ts
if (verificationLevel === 'verified') {
  if (user.agreed_terms === 0) {
    // Show "Authenticate with Discord" button (OAuth)
  } else if (!user.email) {
    // User agreed to terms but hasn't done OAuth yet
    // Show email verification required
  }
}
```

## Database Schema

```sql
CREATE TABLE users (
  id SERIAL,
  discord_id TEXT PRIMARY KEY,
  email TEXT,                    -- NULL if not verified
  agreed_terms SMALLINT DEFAULT 0, -- 0 = not agreed, 1 = agreed
  account_status SMALLINT DEFAULT 0, -- 0 = normal, 1 = banned
  ban_expires_at TIMESTAMP,
  banned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Basic Verification
- **Endpoint:** `GET /api/auth/terms?user_id=<discord_id>`
- **Purpose:** Simple terms agreement
- **Flow:**
  1. User clicks button in Discord
  2. Redirects to this endpoint
  3. Server creates/updates user record
  4. Sets `agreed_terms = 1`
  5. Shows success page
- **Data Collected:** Discord ID only

### Verified (OAuth)
- **Start OAuth:** `GET /api/auth/discord?user_id=<discord_id>`
  - Generates Discord OAuth URL
  - Redirects user to Discord login

- **OAuth Callback:** `GET /api/auth/discord/callback?code=<code>&state=<discord_id>`
  - Exchanges code for access token
  - Fetches user email from Discord API
  - Saves email to database
  - Sets `agreed_terms = 1`
  - Shows success page

- **Check Status:** `GET /api/auth/status/:userId`
  - Returns user verification status
  - Response:
    ```json
    {
      "success": true,
      "agreedTerms": true,
      "verified": true,
      "status": "normal",
      "banned": false
    }
    ```

## User Ban System

The verification system includes user ban functionality:

### Ban User (Temporary)
```typescript
await userRepository.banUser(discordId, expiresAt);
// expiresAt = Date object (e.g., 7 days from now)
```

### Ban User (Permanent)
```typescript
await userRepository.banUser(discordId, null);
// null = permanent ban
```

### Unban User
```typescript
await userRepository.unbanUser(discordId);
```

### Auto-Unban on Expiry
The system automatically unbans users when checking if they're banned:
```typescript
const isBanned = await userRepository.isUserBanned(discordId);
// If ban expired, automatically unbans and returns false
```

## Security Considerations

### Terms Agreement
- ✅ No sensitive data collected
- ✅ User can't bypass (middleware checks every command)
- ✅ Stored in database, not in-memory cache

### OAuth Flow
- ✅ Uses Discord's official OAuth2
- ✅ State parameter prevents CSRF attacks
- ✅ Only collects email (scope: `identify email`)
- ✅ No password or token storage
- ✅ Email verified by Discord

### Best Practices
- Always check verification level before command execution
- Never store Discord access tokens long-term
- Use HTTPS in production for OAuth callbacks
- Implement rate limiting on API endpoints
- Log all verification attempts for security audit

## Migration from Old System

If you had an old terms system, here's how to migrate:

### Old System
```typescript
requireTerms?: boolean // true or false
```

### New System
```typescript
verificationLevel?: 'basic' | 'verified' // default: 'basic'
```

### Migration Steps
1. Remove all `requireTerms: false` → These become basic (default)
2. Keep `requireTerms: true` → These become basic (default)
3. For premium features → Add `verificationLevel: 'verified'`

**Backwards Compatibility:**
The middleware exports both old and new function names:
```typescript
export const checkTermsForSlashCommand = checkVerificationForSlashCommand;
export const checkTermsForPrefixCommand = checkVerificationForPrefixCommand;
```

## Testing

### Test Basic Verification
1. Create fresh user (clear database)
2. Run `/ping` command
3. Should see "Agree to Terms" button
4. Click button → should redirect to success page
5. Return to Discord, run `/ping` again
6. Should execute successfully

### Test Verified Verification
1. Create command with `verificationLevel: 'verified'`
2. User with basic verification runs command
3. Should see "Authenticate with Discord" button
4. Complete OAuth flow
5. Return to Discord, run command again
6. Should execute successfully

### Test Ban System
1. Ban a user: `userRepository.banUser(userId, null)`
2. User tries to run any command
3. Should see ban message
4. Unban user: `userRepository.unbanUser(userId)`
5. User can run commands again

---

[← Back to Main README](../README.md) | [API Documentation →](API.md)
