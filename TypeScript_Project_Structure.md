# 🏗️ CẤU TRÚC DỰ ÁN - DISCORD BOT (TYPESCRIPT)

## 📁 FULL PROJECT STRUCTURE (TypeScript)

```
discord-hosting-bot/
│
├── 📁 src/
│   ├── 📁 commands/              # Tất cả commands của bot
│   │   ├── 📁 hosting/
│   │   │   ├── buy.ts
│   │   │   ├── myservers.ts
│   │   │   ├── server.ts
│   │   │   ├── upgrade.ts
│   │   │   ├── renew.ts
│   │   │   └── packages.ts
│   │   │
│   │   ├── 📁 economy/
│   │   │   ├── balance.ts
│   │   │   ├── deposit.ts
│   │   │   ├── pay.ts
│   │   │   ├── currency.ts
│   │   │   └── shop.ts
│   │   │
│   │   ├── 📁 admin/
│   │   │   ├── approve.ts
│   │   │   ├── suspend.ts
│   │   │   ├── stats.ts
│   │   │   └── broadcast.ts
│   │   │
│   │   ├── 📁 utility/
│   │   │   ├── help.ts
│   │   │   ├── ping.ts
│   │   │   ├── profile.ts
│   │   │   └── verify.ts
│   │   │
│   │   ├── 📁 config/
│   │   │   ├── setprefix.ts
│   │   │   ├── setlang.ts
│   │   │   ├── disable.ts
│   │   │   └── enable.ts
│   │   │
│   │   └── 📁 giveaway/
│   │       ├── gstart.ts
│   │       ├── gend.ts
│   │       └── greroll.ts
│   │
│   ├── 📁 events/
│   │   ├── ready.ts
│   │   ├── interactionCreate.ts
│   │   ├── messageCreate.ts
│   │   ├── guildCreate.ts
│   │   └── guildDelete.ts
│   │
│   ├── 📁 database/
│   │   ├── 📁 models/
│   │   │   ├── User.ts
│   │   │   ├── Guild.ts
│   │   │   ├── Server.ts
│   │   │   ├── Transaction.ts
│   │   │   ├── Currency.ts
│   │   │   ├── Package.ts
│   │   │   ├── AutoResponse.ts
│   │   │   ├── Domain.ts
│   │   │   ├── Giveaway.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── 📁 migrations/
│   │   │   ├── 001_create_users.ts
│   │   │   ├── 002_create_guilds.ts
│   │   │   ├── 003_create_servers.ts
│   │   │   └── ...
│   │   │
│   │   ├── connection.ts
│   │   └── seeders.ts
│   │
│   ├── 📁 services/
│   │   ├── PterodactylService.ts
│   │   ├── PaymentService.ts
│   │   ├── HostingService.ts
│   │   ├── EconomyService.ts
│   │   ├── ProxyService.ts
│   │   ├── DNSService.ts
│   │   ├── NginxService.ts
│   │   └── MailService.ts
│   │
│   ├── 📁 utils/
│   │   ├── logger.ts
│   │   ├── validator.ts
│   │   ├── formatter.ts
│   │   ├── permissions.ts
│   │   ├── pagination.ts
│   │   ├── embeds.ts
│   │   └── constants.ts
│   │
│   ├── 📁 middlewares/
│   │   ├── auth.ts
│   │   ├── ratelimit.ts
│   │   ├── permissions.ts
│   │   └── i18n.ts
│   │
│   ├── 📁 locales/
│   │   ├── en.json
│   │   ├── vi.json
│   │   └── index.ts
│   │
│   ├── 📁 config/
│   │   ├── bot.ts
│   │   ├── database.ts
│   │   ├── packages.ts
│   │   ├── payments.ts
│   │   └── nginx.template.ts
│   │
│   ├── 📁 handlers/
│   │   ├── commandHandler.ts
│   │   ├── eventHandler.ts
│   │   └── errorHandler.ts
│   │
│   ├── 📁 jobs/
│   │   ├── checkExpiry.ts
│   │   ├── autoBackup.ts
│   │   ├── cleanupLogs.ts
│   │   └── updateStats.ts
│   │
│   ├── 📁 types/                 # TypeScript types & interfaces
│   │   ├── command.ts
│   │   ├── event.ts
│   │   ├── client.ts
│   │   ├── database.ts
│   │   ├── pterodactyl.ts
│   │   ├── payment.ts
│   │   └── index.ts
│   │
│   └── index.ts                  # Main entry point
│
├── 📁 web/
│   ├── 📁 routes/
│   │   ├── webhook.ts
│   │   ├── oauth.ts
│   │   └── api.ts
│   │
│   ├── 📁 controllers/
│   │   ├── WebhookController.ts
│   │   ├── OAuthController.ts
│   │   └── ApiController.ts
│   │
│   ├── 📁 views/
│   │   ├── oauth-success.html
│   │   └── oauth-error.html
│   │
│   ├── 📁 public/
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   │
│   └── server.ts
│
├── 📁 scripts/
│   ├── deploy-commands.ts
│   ├── backup-db.ts
│   ├── migrate.ts
│   └── seed.ts
│
├── 📁 tests/
│   ├── commands/
│   ├── services/
│   └── utils/
│
├── 📁 dist/                      # Compiled JavaScript (build output)
│   └── .gitkeep
│
├── 📁 logs/
│   ├── error.log
│   ├── combined.log
│   └── access.log
│
├── 📁 backups/
│   └── .gitkeep
│
├── 📁 nginx/
│   ├── templates/
│   └── sites-enabled/
│
├── .env
├── .env.example
├── .gitignore
├── .eslintrc.json              # ESLint config
├── .prettierrc                 # Prettier config
├── tsconfig.json               # TypeScript config
├── package.json
├── package-lock.json
├── README.md
├── LICENSE
└── ecosystem.config.js
```

---

## 📝 TYPESCRIPT CONFIGURATION FILES

### 1. `tsconfig.json` - TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "removeComments": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": "./src",
    "paths": {
      "@commands/*": ["commands/*"],
      "@events/*": ["events/*"],
      "@services/*": ["services/*"],
      "@utils/*": ["utils/*"],
      "@database/*": ["database/*"],
      "@types/*": ["types/*"],
      "@config/*": ["config/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

### 2. `.eslintrc.json` - ESLint Configuration

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "no-console": "warn"
  },
  "env": {
    "node": true,
    "es2022": true
  }
}
```

---

### 3. `.prettierrc` - Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

---

## 🎯 TYPESCRIPT TYPES & INTERFACES

### 1. `src/types/command.ts` - Command Types

```typescript
import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  PermissionResolvable 
} from 'discord.js';

export interface Command {
  data: SlashCommandBuilder;
  category: CommandCategory;
  permissions?: PermissionResolvable[];
  cooldown?: number;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export enum CommandCategory {
  Hosting = 'hosting',
  Economy = 'economy',
  Admin = 'admin',
  Utility = 'utility',
  Config = 'config',
  Giveaway = 'giveaway',
}

export interface CommandOptions {
  name: string;
  description: string;
  category: CommandCategory;
  usage?: string;
  examples?: string[];
}
```

---

### 2. `src/types/event.ts` - Event Types

```typescript
import { ClientEvents } from 'discord.js';

export interface Event<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute(...args: ClientEvents[K]): Promise<void> | void;
}
```

---

### 3. `src/types/client.ts` - Extended Client

```typescript
import { Client, Collection } from 'discord.js';
import { Command } from './command';

export interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
  cooldowns: Collection<string, Collection<string, number>>;
}
```

---

### 4. `src/types/database.ts` - Database Types

```typescript
import { Model, Optional } from 'sequelize';

// User attributes
export interface UserAttributes {
  id: number;
  discordId: string;
  email?: string;
  pterodactylId?: number;
  balance: number;
  points: number;
  language: string;
  verified: boolean;
  referredBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id'> {}

export interface UserInstance 
  extends Model<UserAttributes, UserCreationAttributes>, 
  UserAttributes {}

// Server attributes
export interface ServerAttributes {
  id: number;
  userId: number;
  pterodactylId: string;
  packageId: number;
  name: string;
  status: ServerStatus;
  expiryDate: Date;
  autoRenew: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum ServerStatus {
  Active = 'active',
  Suspended = 'suspended',
  Expired = 'expired',
  Pending = 'pending',
}

export interface ServerCreationAttributes extends Optional<ServerAttributes, 'id'> {}

export interface ServerInstance
  extends Model<ServerAttributes, ServerCreationAttributes>,
  ServerAttributes {}

// Transaction attributes
export interface TransactionAttributes {
  id: number;
  userId: number;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  description?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum TransactionType {
  Deposit = 'deposit',
  Purchase = 'purchase',
  Refund = 'refund',
  Transfer = 'transfer',
}

export enum TransactionStatus {
  Pending = 'pending',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export interface TransactionCreationAttributes 
  extends Optional<TransactionAttributes, 'id'> {}

export interface TransactionInstance
  extends Model<TransactionAttributes, TransactionCreationAttributes>,
  TransactionAttributes {}
```

---

### 5. `src/types/pterodactyl.ts` - Pterodactyl API Types

```typescript
export interface PterodactylUser {
  id: number;
  external_id: string | null;
  uuid: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  language: string;
  root_admin: boolean;
  '2fa': boolean;
  created_at: string;
  updated_at: string;
}

export interface PterodactylServer {
  id: number;
  external_id: string | null;
  uuid: string;
  identifier: string;
  name: string;
  description: string;
  status: string | null;
  suspended: boolean;
  limits: ServerLimits;
  feature_limits: FeatureLimits;
  user: number;
  node: number;
  allocation: number;
  nest: number;
  egg: number;
  container: ServerContainer;
  created_at: string;
  updated_at: string;
}

export interface ServerLimits {
  memory: number;
  swap: number;
  disk: number;
  io: number;
  cpu: number;
}

export interface FeatureLimits {
  databases: number;
  allocations: number;
  backups: number;
}

export interface ServerContainer {
  startup_command: string;
  image: string;
  installed: number;
  environment: Record<string, string>;
}

export interface CreateServerRequest {
  name: string;
  user: number;
  egg: number;
  docker_image: string;
  startup: string;
  environment: Record<string, string>;
  limits: ServerLimits;
  feature_limits: FeatureLimits;
  allocation: {
    default: number;
  };
}
```

---

### 6. `src/types/payment.ts` - Payment Types

```typescript
export interface PaymentGateway {
  name: string;
  process(data: PaymentData): Promise<PaymentResult>;
  verify(webhook: WebhookData): Promise<VerificationResult>;
}

export interface PaymentData {
  userId: number;
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  error?: string;
}

export interface WebhookData {
  gateway: string;
  payload: any;
  signature?: string;
}

export interface VerificationResult {
  valid: boolean;
  transactionId?: string;
  amount?: number;
  userId?: number;
  error?: string;
}
```

---

## 💻 CODE EXAMPLES (TypeScript)

### 1. `src/index.ts` - Main Entry Point

```typescript
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from 'dotenv';
import { logger } from '@utils/logger';
import { connectDatabase } from '@database/connection';
import { loadCommands } from '@handlers/commandHandler';
import { loadEvents } from '@handlers/eventHandler';
import type { ExtendedClient } from '@types/client';
import type { Command } from '@types/command';

// Load environment variables
config();

// Create extended client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
}) as ExtendedClient;

// Initialize collections
client.commands = new Collection<string, Command>();
client.cooldowns = new Collection<string, Collection<string, number>>();

// Startup function
async function start(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('✅ Database connected');

    // Load commands
    await loadCommands(client);
    logger.info('✅ Commands loaded');

    // Load events
    await loadEvents(client);
    logger.info('✅ Events loaded');

    // Login bot
    await client.login(process.env.DISCORD_TOKEN);
    logger.info('✅ Bot logged in');
  } catch (error) {
    logger.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// Error handling
process.on('unhandledRejection', (error: Error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Start bot
void start();
```

---

### 2. `src/handlers/commandHandler.ts` - Command Handler

```typescript
import { readdirSync } from 'fs';
import { join } from 'path';
import { logger } from '@utils/logger';
import type { ExtendedClient } from '@types/client';
import type { Command } from '@types/command';

export async function loadCommands(client: ExtendedClient): Promise<void> {
  const commandsPath = join(__dirname, '../commands');
  const commandFolders = readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = join(commandsPath, folder);
    const commandFiles = readdirSync(folderPath).filter((file) => 
      file.endsWith('.ts') || file.endsWith('.js')
    );

    for (const file of commandFiles) {
      const filePath = join(folderPath, file);
      
      try {
        // Dynamic import
        const commandModule = await import(filePath);
        const command: Command = commandModule.default || commandModule;

        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          logger.info(`✅ Loaded command: ${command.data.name}`);
        } else {
          logger.warn(`⚠️ Command ${file} missing required properties`);
        }
      } catch (error) {
        logger.error(`❌ Error loading command ${file}:`, error);
      }
    }
  }
}
```

---

### 3. `src/commands/utility/ping.ts` - Example Command

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '@types/command';
import { CommandCategory } from '@types/command';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),
  
  category: CommandCategory.Utility,
  
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sent = await interaction.reply({ 
      content: 'Pinging...', 
      fetchReply: true 
    });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'Bot Latency', value: `${latency}ms`, inline: true },
        { name: 'API Latency', value: `${apiLatency}ms`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ content: '', embeds: [embed] });
  },
};

export default command;
```

---

### 4. `src/events/ready.ts` - Ready Event

```typescript
import type { Event } from '@types/event';
import { logger } from '@utils/logger';
import { startCronJobs } from '@jobs/index';

const event: Event<'ready'> = {
  name: 'ready',
  once: true,
  
  execute(client): void {
    logger.info(`✅ Bot is ready! Logged in as ${client.user?.tag}`);
    logger.info(`📊 Serving ${client.guilds.cache.size} guilds`);

    // Set bot status
    client.user?.setPresence({
      activities: [{ name: '/help | Hosting Bot' }],
      status: 'online',
    });

    // Start cron jobs
    startCronJobs(client);
  },
};

export default event;
```

---

### 5. `src/database/models/User.ts` - User Model

```typescript
import { DataTypes, Sequelize } from 'sequelize';
import type { UserInstance, UserCreationAttributes } from '@types/database';

export default function (sequelize: Sequelize) {
  const User = sequelize.define<UserInstance>(
    'User',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      discordId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        field: 'discord_id',
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
      },
      pterodactylId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'pterodactyl_id',
      },
      balance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        allowNull: false,
      },
      points: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      language: {
        type: DataTypes.STRING,
        defaultValue: 'vi',
        allowNull: false,
      },
      verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      referredBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'referred_by',
        references: {
          model: 'users',
          key: 'id',
        },
      },
    },
    {
      timestamps: true,
      tableName: 'users',
      underscored: true,
    }
  );

  return User;
}
```

---

### 6. `src/services/PterodactylService.ts` - Service Class

```typescript
import axios, { AxiosInstance } from 'axios';
import { logger } from '@utils/logger';
import type { 
  PterodactylUser, 
  PterodactylServer, 
  CreateServerRequest 
} from '@types/pterodactyl';

class PterodactylService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.PTERODACTYL_URL || '';
    
    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/application`,
      headers: {
        Authorization: `Bearer ${process.env.PTERODACTYL_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  async createUser(
    email: string, 
    username: string
  ): Promise<PterodactylUser> {
    try {
      const response = await this.client.post<{ attributes: PterodactylUser }>(
        '/users',
        {
          email,
          username,
          first_name: username,
          last_name: 'User',
        }
      );

      logger.info(`Created Pterodactyl user: ${username}`);
      return response.data.attributes;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async createServer(
    userId: number,
    request: CreateServerRequest
  ): Promise<PterodactylServer> {
    try {
      const response = await this.client.post<{ attributes: PterodactylServer }>(
        '/servers',
        {
          ...request,
          user: userId,
        }
      );

      logger.info(`Created server: ${request.name}`);
      return response.data.attributes;
    } catch (error) {
      logger.error('Error creating server:', error);
      throw error;
    }
  }

  async suspendServer(serverId: number): Promise<void> {
    try {
      await this.client.post(`/servers/${serverId}/suspend`);
      logger.info(`Suspended server: ${serverId}`);
    } catch (error) {
      logger.error('Error suspending server:', error);
      throw error;
    }
  }

  async getServer(serverId: number): Promise<PterodactylServer> {
    try {
      const response = await this.client.get<{ attributes: PterodactylServer }>(
        `/servers/${serverId}`
      );
      return response.data.attributes;
    } catch (error) {
      logger.error('Error getting server:', error);
      throw error;
    }
  }
}

export default new PterodactylService();
```

---

## 📦 UPDATED package.json (TypeScript)

```json
{
  "name": "discord-hosting-bot",
  "version": "1.0.0",
  "description": "Discord bot for hosting management (TypeScript)",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "watch": "tsc --watch",
    "deploy": "ts-node scripts/deploy-commands.ts",
    "migrate": "ts-node scripts/migrate.ts",
    "seed": "ts-node scripts/seed.ts",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "typecheck": "tsc --noEmit"
  },
  "keywords": ["discord", "bot", "hosting", "pterodactyl", "typescript"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "discord.js": "^14.14.1",
    "dotenv": "^16.3.1",
    "pg": "^8.11.3",
    "pg-hstore": "^2.3.4",
    "sequelize": "^6.35.2",
    "axios": "^1.6.5",
    "express": "^4.18.2",
    "winston": "^3.11.0",
    "redis": "^4.6.12",
    "i18next": "^23.7.16",
    "node-cron": "^3.0.3",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "validator": "^13.11.0",
    "nodemailer": "^6.9.8"
  },
  "devDependencies": {
    "@types/node": "^20.10.7",
    "@types/express": "^4.17.21",
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/validator": "^13.11.8",
    "@types/nodemailer": "^6.4.14",
    "@types/node-cron": "^3.0.11",
    "@typescript-eslint/eslint-plugin": "^6.18.1",
    "@typescript-eslint/parser": "^6.18.1",
    "eslint": "^8.56.0",
    "eslint-config-prettier": "^9.1.0",
    "prettier": "^3.1.1",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.3",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "ts-jest": "^29.1.1"
  }
}
```

---

## 🚀 SETUP INSTRUCTIONS (TypeScript)

### Bước 1: Initialize Project

```bash
# Tạo folder
mkdir discord-hosting-bot
cd discord-hosting-bot

# Initialize npm
npm init -y

# Install TypeScript dependencies
npm install -D typescript @types/node ts-node ts-node-dev

# Install Discord.js with types
npm install discord.js

# Install other dependencies
npm install dotenv pg sequelize axios express winston redis i18next node-cron bcrypt jsonwebtoken validator nodemailer

# Install type definitions
npm install -D @types/express @types/bcrypt @types/jsonwebtoken @types/validator @types/nodemailer @types/node-cron

# Install ESLint & Prettier
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-config-prettier prettier

# Install testing tools
npm install -D jest @types/jest ts-jest
```

---

### Bước 2: Create Config Files

```bash
# Create tsconfig.json
npx tsc --init

# Create other config files
touch .eslintrc.json .prettierrc
```

---

### Bước 3: Create Project Structure

```bash
# Create folders
mkdir -p src/{commands/{hosting,economy,admin,utility,config,giveaway},events,database/{models,migrations},services,utils,middlewares,locales,config,handlers,jobs,types}
mkdir -p web/{routes,controllers,views,public/{css,js,images}}
mkdir -p scripts tests dist logs backups nginx/{templates,sites-enabled}

# Create main files
touch src/index.ts
touch src/types/{command,event,client,database,pterodactyl,payment,index}.ts
```

---

### Bước 4: Build & Run

```bash
# Development mode (auto-restart on changes)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run production build
npm start

# Type checking without building
npm run typecheck

# Lint code
npm run lint

# Format code
npm run format
```

---

## 📋 PATH ALIASES SETUP

Để sử dụng path aliases (`@commands/`, `@utils/`, etc.), cần cài thêm:

```bash
npm install -D tsconfig-paths
```

Sau đó update `src/index.ts`:

```typescript
import 'tsconfig-paths/register'; // Add this at the very top
import { Client, GatewayIntentBits } from 'discord.js';
// ... rest of code
```

---

## ✅ CHECKLIST

- [ ] Install TypeScript & dependencies
- [ ] Create `tsconfig.json`
- [ ] Create `.eslintrc.json` & `.prettierrc`
- [ ] Create folder structure
- [ ] Create type definitions in `src/types/`
- [ ] Implement `src/index.ts`
- [ ] Implement handlers
- [ ] Create first command with types
- [ ] Test build: `npm run build`
- [ ] Test dev mode: `npm run dev`

---

**🔥 TYPESCRIPT SETUP HOÀN CHỈNH! BẮT ĐẦU CODE THÔI!** 🚀
