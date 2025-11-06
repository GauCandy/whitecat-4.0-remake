# Discord Bot - TypeScript

A modern Discord bot built with TypeScript and discord.js v14, featuring slash commands and environment variable configuration.

## Features

- Written in TypeScript for type safety
- Slash commands support
- PostgreSQL database integration with connection pooling
- Environment variables for secure configuration
- Command handler system for easy command management
- Error handling and logging
- Hot reload support during development
- Database migrations and initialization scripts

## Prerequisites

- Node.js 16.9.0 or higher
- npm or yarn
- PostgreSQL 12 or higher
- A Discord Bot Token

## Getting Started

### 1. Clone and Install Dependencies

```bash
# Install dependencies
npm install
```

### 2. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section and click "Add Bot"
4. Under "Token", click "Reset Token" and copy your bot token
5. Enable the following Privileged Gateway Intents:
   - Server Members Intent
   - Message Content Intent
6. Go to "OAuth2" > "General" and copy your Client ID
7. Go to "OAuth2" > "URL Generator":
   - Select scopes: `bot` and `applications.commands`
   - Select bot permissions: (at minimum) `Send Messages`, `Read Messages/View Channels`
   - Copy the generated URL and use it to invite the bot to your server

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_bot
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_POOL_MIN=2
DB_POOL_MAX=10
```

**How to get Guild ID:**
1. Enable Developer Mode in Discord (Settings > Advanced > Developer Mode)
2. Right-click your server and select "Copy ID"

### 4. Setup PostgreSQL Database

**Install PostgreSQL:**
- Windows: Download from [postgresql.org](https://www.postgresql.org/download/windows/)
- macOS: `brew install postgresql`
- Linux: `sudo apt install postgresql postgresql-contrib`

**Create Database:**
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE discord_bot;

# Exit psql
\q
```

**Initialize Database Schema:**
```bash
npm run db:init
```

This will create all necessary tables, indexes, views, and triggers defined in [database/schema.sql](database/schema.sql).

**Database Commands:**
- `npm run db:init` - Initialize database with schema
- `npm run db:drop` - Drop all tables (WARNING: deletes all data!)
- `npm run db:reset` - Reset database (drop and reinitialize)

### 5. Deploy Commands

Before running the bot, you need to register slash commands with Discord:

```bash
npm run deploy
```

This registers commands to your test guild (faster). For global commands (takes up to 1 hour), modify [src/deploy-commands.ts](src/deploy-commands.ts).

### 6. Run the Bot

**Development mode (with hot reload):**
```bash
npm run dev:watch
```

**Development mode (single run):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

## Project Structure

```
.
├── src/
│   ├── commands/          # Slash commands
│   │   ├── ping.ts       # Ping command
│   │   ├── userinfo.ts   # User info command
│   │   └── serverinfo.ts # Server info command
│   ├── database/         # Database related files
│   │   ├── pool.ts       # PostgreSQL connection pool
│   │   ├── init.ts       # Database initialization script
│   │   └── index.ts      # Database helper functions
│   ├── types/            # TypeScript type definitions
│   │   └── command.ts    # Command interface
│   ├── config.ts         # Environment configuration
│   ├── deploy-commands.ts # Command deployment script
│   └── index.ts          # Main bot file
├── database/             # SQL files
│   └── schema.sql        # Database schema
├── .env                  # Environment variables (create this)
├── .env.example          # Environment variables template
├── .gitignore           # Git ignore file
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── README.md            # This file
```

## Available Commands

- `/ping` - Check bot latency
- `/userinfo [user]` - Get information about a user
- `/serverinfo` - Get information about the server

## Creating New Commands

1. Create a new file in [src/commands/](src/commands/) (e.g., `mycommand.ts`)
2. Use this template:

```typescript
import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { Command } from '../types/command';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('mycommand')
    .setDescription('My command description'),

  async execute(interaction: CommandInteraction) {
    await interaction.reply('Hello World!');
  },
};

export default command;
```

3. Deploy the commands: `npm run deploy`
4. Restart the bot

## Using the Database

The bot includes a PostgreSQL database integration with helper functions for common operations.

**Import database functions:**
```typescript
import { Guilds, Users, CommandLogs, GuildSettings, query } from './database';
```

**Example Usage:**

```typescript
// Save guild information
await Guilds.upsert({
  id: guild.id,
  name: guild.name,
  icon_url: guild.iconURL(),
  owner_id: guild.ownerId,
});

// Save user information
await Users.upsert({
  id: user.id,
  username: user.username,
  avatar_url: user.displayAvatarURL(),
  is_bot: user.bot,
});

// Log command execution
await CommandLogs.create({
  guild_id: interaction.guildId,
  user_id: interaction.user.id,
  command_name: interaction.commandName,
  channel_id: interaction.channelId,
  success: true,
});

// Get command statistics
const stats = await CommandLogs.getStatistics();

// Custom queries
const results = await query(
  'SELECT * FROM users WHERE username ILIKE $1',
  ['%search%']
);
```

**Database Schema:**

The database includes the following tables:
- `guilds` - Discord server information
- `users` - Discord user information
- `guild_members` - User membership in guilds
- `command_logs` - Command execution logs
- `user_stats` - User activity statistics
- `guild_settings` - Per-guild configuration

And views:
- `active_guild_members` - Active members across guilds
- `command_statistics` - Command usage statistics

See [database/schema.sql](database/schema.sql) for complete schema details.

## Scripts

**Bot Commands:**
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled bot
- `npm run dev` - Run bot in development mode with ts-node
- `npm run dev:watch` - Run bot with hot reload (recommended for development)
- `npm run watch` - Watch TypeScript files and compile on change
- `npm run deploy` - Deploy slash commands to Discord

**Database Commands:**
- `npm run db:init` - Initialize database with schema
- `npm run db:drop` - Drop all tables (WARNING: deletes all data!)
- `npm run db:reset` - Reset database (drop and reinitialize)

## Troubleshooting

### Bot doesn't respond to commands

1. Make sure you deployed commands: `npm run deploy`
2. Check if the bot has proper permissions in your server
3. Verify your `.env` file has correct values
4. Check console for error messages

### "DISCORD_TOKEN is not defined" error

Make sure your `.env` file exists and contains your bot token.

### Commands don't update

Slash commands are cached by Discord. Use guild commands (current setup) for instant updates during development. Global commands take up to 1 hour to update.

### Database connection errors

1. Make sure PostgreSQL is running: `sudo service postgresql status` (Linux) or check Services (Windows)
2. Verify database credentials in `.env` file
3. Check if database exists: `psql -U postgres -l`
4. Test connection: Create a simple script to test the pool connection
5. Check firewall settings if connecting to remote database

### "relation does not exist" error

This means the database tables haven't been created. Run:
```bash
npm run db:init
```

## Security Notes

- Never commit your `.env` file to version control
- Keep your bot token secret
- Regularly rotate your bot token if compromised
- Use environment variables for all sensitive data

## Resources

- [Discord.js Documentation](https://discord.js.org/)
- [Discord.js Guide](https://discordjs.guide/)
- [Discord Developer Portal](https://discord.com/developers/docs/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## License

ISC
