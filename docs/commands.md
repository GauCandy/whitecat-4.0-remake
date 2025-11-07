# Creating Commands

Guide to creating and managing Discord commands for WhiteCat Bot.

## Table of Contents
- [Command Types](#command-types)
- [Verification Levels](#verification-levels)
- [Creating Slash Commands](#creating-slash-commands)
- [Command Organization](#command-organization)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Command Types

WhiteCat Bot supports three types of commands:

### 1. Slash Commands
Modern Discord interactions using `/command` syntax.
- **File:** `src/commands/category/command.ts`
- **Interface:** `SlashCommand`
- **Deployment:** Required via `npm run deploy`

### 2. Prefix Commands
Traditional text commands using prefix (e.g., `!ping`).
- **File:** `src/commands/category/command.ts`
- **Interface:** `PrefixCommand`
- **Deployment:** Automatic (no deploy needed)

### 3. Hybrid Commands
Support both slash and prefix.
- **File:** `src/commands/category/command.ts`
- **Interface:** `HybridCommand`
- **Deployment:** Slash part requires deploy

---

## Verification Levels

Commands can require different verification levels:

| Level | Description | Data Collected | Use Case |
|-------|-------------|----------------|----------|
| `'basic'` | Terms agreement | Discord ID only | Basic commands |
| `'verified'` | OAuth email | Discord ID + Email | Premium features |

**Default:** `'basic'` (if not specified)

---

## Creating Slash Commands

### Basic Command (Terms Agreement Required)

**File:** `src/commands/general/mycommand.ts`

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { SlashCommand } from '../../types/command';

const myCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('mycommand')
    .setDescription('Description of my command'),

  // Default verification level is 'basic'
  // No need to specify verificationLevel

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      content: 'Hello! This is my command.',
      ephemeral: true
    });
  },
};

export default myCommand;
```

### Verified Command (Email Required)

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { SlashCommand } from '../../types/command';

const premiumCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription('Premium feature requiring email'),

  // Require email verification
  verificationLevel: 'verified',

  async execute(interaction: ChatInputCommandInteraction) {
    // Only users with email can run this
    await interaction.reply('Welcome to premium features!');
  },
};

export default premiumCommand;
```

### Command with Options

```typescript
const userInfoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get user information')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('User to get info about')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('target') || interaction.user;

    await interaction.reply({
      content: `User: ${target.tag}\nID: ${target.id}`,
      ephemeral: true
    });
  },
};
```

### Command with Subcommands

```typescript
const settingsCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Bot settings')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current settings')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset to defaults')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
      await interaction.reply('Current settings...');
    } else if (subcommand === 'reset') {
      await interaction.reply('Settings reset!');
    }
  },
};
```

---

## Command Organization

### Directory Structure

```
src/commands/
├── general/           # General commands
│   ├── help.ts
│   └── ping.ts
├── moderation/        # Mod commands
│   ├── ban.ts
│   └── kick.ts
├── fun/               # Fun commands
│   ├── meme.ts
│   └── joke.ts
└── admin/             # Admin-only commands
    └── config.ts
```

### Naming Conventions

**File names:**
- Lowercase
- Dash-separated for multi-word
- Match command name

Examples:
- `ping.ts` → `/ping`
- `user-info.ts` → `/userinfo`
- `server-stats.ts` → `/serverstats`

**Command names:**
- Lowercase only
- No spaces (use dash if needed)
- Short and descriptive

---

## Best Practices

### 1. Use Defer for Long Operations

```typescript
async execute(interaction: ChatInputCommandInteraction) {
  // Defer for operations >3 seconds
  await interaction.deferReply();

  // Do long operation
  const result = await longOperation();

  // Edit deferred reply
  await interaction.editReply(`Result: ${result}`);
}
```

### 2. Error Handling

```typescript
async execute(interaction: ChatInputCommandInteraction) {
  try {
    // Command logic
    await interaction.reply('Success!');
  } catch (error) {
    console.error('Command error:', error);

    const errorMessage = 'An error occurred!';

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}
```

### 3. Ephemeral Replies

Use ephemeral for:
- Error messages
- Personal information
- Sensitive data

```typescript
await interaction.reply({
  content: 'This message is only visible to you',
  ephemeral: true
});
```

### 4. Permission Checks

```typescript
async execute(interaction: ChatInputCommandInteraction) {
  // Check if user has permission
  if (!interaction.memberPermissions?.has('Administrator')) {
    await interaction.reply({
      content: 'You need Administrator permission!',
      ephemeral: true
    });
    return;
  }

  // Command logic
}
```

### 5. Database Access

```typescript
import { userRepository } from '../../database/repositories/user.repository';

async execute(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;

  // Get user from database
  const user = await userRepository.getUserByDiscordId(userId);

  if (!user) {
    await interaction.reply('User not found in database!');
    return;
  }

  // Use user data
  await interaction.reply(`Email: ${user.email || 'Not verified'}`);
}
```

---

## Examples

### Simple Ping Command

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { SlashCommand } from '../../types/command';

const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.deferReply({ fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = interaction.client.ws.ping;

    await interaction.editReply(
      `🏓 Pong!\nLatency: ${latency}ms\nWebSocket: ${wsPing}ms`
    );
  },
};

export default pingCommand;
```

### User Info Command

```typescript
const userInfoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get user information')
    .addUserOption(option =>
      option.setName('target').setDescription('Target user')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('target') || interaction.user;
    const member = interaction.guild?.members.cache.get(target.id);

    const embed = new EmbedBuilder()
      .setColor(0x00AE86)
      .setTitle(`User Info: ${target.tag}`)
      .addFields(
        { name: 'ID', value: target.id },
        { name: 'Created', value: target.createdAt.toDateString() },
        { name: 'Joined', value: member?.joinedAt?.toDateString() || 'Unknown' }
      )
      .setThumbnail(target.displayAvatarURL());

    await interaction.reply({ embeds: [embed] });
  },
};
```

### Database Integration Example

```typescript
import { userRepository } from '../../database/repositories/user.repository';

const profileCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your profile'),

  verificationLevel: 'basic', // Requires terms

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const user = await userRepository.getUserByDiscordId(userId);

    if (!user) {
      await interaction.reply({
        content: 'Profile not found!',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Your Profile')
      .addFields(
        { name: 'Verification', value: user.email ? 'Verified ✅' : 'Basic' },
        { name: 'Member Since', value: user.created_at.toDateString() }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
```

---

## Deployment

After creating a command:

### 1. Save the file
```bash
src/commands/general/mycommand.ts
```

### 2. Deploy commands
```bash
npm run deploy
```

### 3. Restart bot
```bash
npm run dev
```

### 4. Test in Discord
```
/mycommand
```

---

## TypeScript Interfaces

### SlashCommand Interface

```typescript
export interface SlashCommand {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  verificationLevel?: 'basic' | 'verified'; // Optional, default: 'basic'
}
```

### PrefixCommand Interface

```typescript
export interface PrefixCommand {
  name: string;
  description: string;
  aliases?: string[];
  usage?: string;
  category?: string;
  execute: (message: Message, args: string[]) => Promise<void>;
  verificationLevel?: 'basic' | 'verified';
}
```

---

## Debugging Commands

### Enable Debug Logging

```typescript
import Logger from '../../utils/logger';

async execute(interaction: ChatInputCommandInteraction) {
  Logger.debug(`Command ${interaction.commandName} executed by ${interaction.user.tag}`);
  // ...
}
```

### Check Command Registration

```bash
# View deployed commands
npm run deploy

# Output:
# [INFO] Loaded command: help
# [INFO] Loaded command: ping
# [INFO] Successfully reloaded 2 commands
```

---

[← Back to Main README](../README.md) | [Database Reference →](database.md)
