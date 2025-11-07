# API Reference

Complete API documentation for WhiteCat Bot REST endpoints.

## Table of Contents
- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication Endpoints](#authentication-endpoints)
- [Health Check Endpoints](#health-check-endpoints)
- [Response Formats](#response-formats)
- [Error Handling](#error-handling)

---

## Overview

WhiteCat Bot includes an Express REST API for:
- User authentication (OAuth)
- Terms agreement
- Status checking
- Health monitoring

**API Server:** Starts automatically with the bot
**Port:** Configured via `API_PORT` in `.env` (default: 3000)

---

## Base URL

### Development
```
http://localhost:3000
```

### Production
```
https://yourdomain.com
```

---

## Authentication Endpoints

### 1. Simple Terms Agreement

**Endpoint:** `GET /api/auth/terms`

**Description:** Basic terms agreement without OAuth (Level 1 verification)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | string | Yes | Discord user ID |

**Example Request:**
```http
GET /api/auth/terms?user_id=123456789012345678
```

**Success Response:**
- **Status:** 200 OK
- **Content-Type:** text/html
- **Body:** HTML success page

**Error Responses:**
- **400 Bad Request:** Missing `user_id` parameter
- **500 Internal Server Error:** Database or server error

**Flow:**
1. User clicks "Agree to Terms" button in Discord
2. Redirects to this endpoint
3. Server creates/updates user record
4. Sets `agreed_terms = 1` in database
5. Shows success page with "return to Discord" message

**Implementation:**
```typescript
// In Discord bot
const termsLink = `${apiUrl}/api/auth/terms?user_id=${userId}`;
const button = new ButtonBuilder()
  .setLabel('✅ Đồng ý điều khoản')
  .setStyle(ButtonStyle.Link)
  .setURL(termsLink);
```

---

### 2. Start OAuth Flow

**Endpoint:** `GET /api/auth/discord`

**Description:** Start Discord OAuth2 flow for email verification (Level 2)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | string | Yes | Discord user ID |

**Example Request:**
```http
GET /api/auth/discord?user_id=123456789012345678
```

**Response:**
- **Status:** 302 Redirect
- **Location:** Discord OAuth authorization URL

**Redirect URL Format:**
```
https://discord.com/api/oauth2/authorize?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=YOUR_REDIRECT_URI&
  response_type=code&
  scope=identify%20email&
  state=123456789012345678
```

**OAuth Scopes:**
- `identify` - Get user ID and username
- `email` - Get user email address

**State Parameter:**
- Contains Discord user ID for verification
- Prevents CSRF attacks

---

### 3. OAuth Callback

**Endpoint:** `GET /api/auth/discord/callback`

**Description:** Handle OAuth callback from Discord

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | Authorization code from Discord |
| `state` | string | Yes | Discord user ID (from OAuth flow) |

**Example Request:**
```http
GET /api/auth/discord/callback?code=ABC123&state=123456789012345678
```

**Success Response:**
- **Status:** 200 OK
- **Content-Type:** text/html
- **Body:** HTML success page

**Error Responses:**
- **400 Bad Request:** Missing `code` or `state`
- **500 Internal Server Error:** OAuth exchange failed

**Flow:**
1. Discord redirects user to this endpoint after authorization
2. Server exchanges code for access token
3. Server fetches user info from Discord API
4. Server saves email to database
5. Sets `agreed_terms = 1`
6. Shows success page

**Database Update:**
```sql
UPDATE users
SET email = 'user@example.com', agreed_terms = 1
WHERE discord_id = '123456789012345678';
```

---

### 4. Check User Status

**Endpoint:** `GET /api/auth/status/:userId`

**Description:** Check user verification and ban status

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | Discord user ID |

**Example Request:**
```http
GET /api/auth/status/123456789012345678
```

**Success Response:**
```json
{
  "success": true,
  "agreedTerms": true,
  "verified": true,
  "status": "normal",
  "banned": false,
  "banExpiresAt": null
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Request success status |
| `agreedTerms` | boolean | User agreed to terms (true/false) |
| `verified` | boolean | User has email (true/false) |
| `status` | string | Account status: "normal" or "banned" |
| `banned` | boolean | Is user currently banned |
| `banExpiresAt` | string\|null | Ban expiration (null = permanent) |

**User Not Found Response:**
```json
{
  "success": true,
  "authenticated": false,
  "status": "not_registered"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to check authentication status"
}
```

**Example Usage:**
```typescript
// Check user status
const response = await fetch(`/api/auth/status/${userId}`);
const data = await response.json();

if (data.verified) {
  console.log('User has email verification');
} else if (data.agreedTerms) {
  console.log('User has basic verification only');
} else {
  console.log('User not verified');
}
```

---

## Health Check Endpoints

### 1. Simple Ping

**Endpoint:** `GET /api/ping`

**Description:** Simple health check endpoint

**Example Request:**
```http
GET /api/ping
```

**Success Response:**
```json
{
  "success": true,
  "message": "pong",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Status:** 200 OK

---

### 2. Detailed Health Status

**Endpoint:** `GET /api/health`

**Description:** Detailed system health information

**Example Request:**
```http
GET /api/health
```

**Success Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 86400,
  "database": {
    "connected": true,
    "poolSize": 5,
    "availableConnections": 3
  },
  "bot": {
    "status": "ready",
    "guilds": 75,
    "users": 10500,
    "ping": 45
  }
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Overall status: "healthy", "degraded", "unhealthy" |
| `uptime` | number | Server uptime in seconds |
| `database.connected` | boolean | Database connection status |
| `database.poolSize` | number | Current pool size |
| `bot.status` | string | Discord bot status |
| `bot.guilds` | number | Number of servers |
| `bot.users` | number | Total users across servers |
| `bot.ping` | number | WebSocket ping (ms) |

---

## Response Formats

### HTML Responses

Used for OAuth flows and terms agreement (user-facing):

**Success Page Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Success</title>
  <style>
    /* Beautiful gradient background */
    body {
      font-family: Arial, sans-serif;
      text-align: center;
      padding: 50px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.1);
      padding: 40px;
      border-radius: 20px;
      backdrop-filter: blur(10px);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success">✅</div>
    <h1>Success!</h1>
    <p>You can now return to Discord.</p>
  </div>
</body>
</html>
```

### JSON Responses

Used for programmatic access:

**Success:**
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Request successful |
| 302 | Redirect | OAuth redirect to Discord |
| 400 | Bad Request | Missing or invalid parameters |
| 500 | Internal Server Error | Server or database error |

### Error Response Format

```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

### Common Errors

**Missing Parameters:**
```json
{
  "success": false,
  "error": "Missing user_id parameter"
}
```

**Database Error:**
```json
{
  "success": false,
  "error": "Failed to check authentication status"
}
```

**OAuth Error:**
```json
{
  "success": false,
  "error": "Failed to exchange authorization code"
}
```

---

## CORS Configuration

API uses CORS middleware to allow cross-origin requests:

```typescript
// Allowed origins
const corsOptions = {
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  credentials: true
};
```

**Development:** All origins allowed
**Production:** Specific domains only

---

## Rate Limiting

**Current Status:** No rate limiting (using Cloudflare proxy)

**Future Implementation:**
```typescript
// Example rate limit config
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per window
});
```

---

## Security Considerations

### OAuth Security

1. **State Parameter:** Prevents CSRF attacks
2. **HTTPS Only:** Production must use HTTPS
3. **Secure Callbacks:** Verify state matches user ID
4. **Token Validation:** Verify Discord token before saving

### API Security

1. **Input Validation:** All parameters validated
2. **Error Handling:** No sensitive info in errors
3. **Database Escaping:** Parameterized queries only
4. **CORS:** Restricted origins in production

### Best Practices

```typescript
// ✅ Good: Parameterized query
await query('SELECT * FROM users WHERE discord_id = $1', [userId]);

// ❌ Bad: String concatenation
await query(`SELECT * FROM users WHERE discord_id = '${userId}'`);
```

---

## Testing API Endpoints

### Using cURL

**Test ping:**
```bash
curl http://localhost:3000/api/ping
```

**Test health:**
```bash
curl http://localhost:3000/api/health
```

**Test status:**
```bash
curl http://localhost:3000/api/auth/status/123456789012345678
```

### Using Postman

1. Import collection:
   - GET `{{base_url}}/api/ping`
   - GET `{{base_url}}/api/health`
   - GET `{{base_url}}/api/auth/status/:userId`

2. Set environment variable:
   - `base_url`: `http://localhost:3000`

---

## Integration Examples

### Check User Before Command

```typescript
// In your Discord bot
async function checkUserVerification(userId: string) {
  const response = await fetch(`http://localhost:3000/api/auth/status/${userId}`);
  const data = await response.json();

  if (!data.agreedTerms) {
    return 'basic_required';
  }

  if (!data.verified) {
    return 'email_required';
  }

  return 'verified';
}
```

### Webhook Integration

```typescript
// External service calling your API
const webhook = {
  url: 'https://yourbot.com/api/auth/status/user_id',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_api_key'
  }
};
```

---

[← Back to Main README](../README.md) | [Creating Commands →](commands.md)
