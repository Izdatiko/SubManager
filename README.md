## SubManager

Telegram bot for managing shared subscription rooms: create rooms, invite members via a room code, and split costs automatically. Built with TypeScript, Node.js, Prisma, PostgreSQL, and the grammy Telegram Bot API framework.

### Features
- Create a room for a subscription with total amount and payment day
- Join a room via a 6-character code
- See your created rooms and rooms you participate in
- Auto-calculate per-user amount as members join

### Tech Stack
- **Runtime**: Node.js (TypeScript, ESM)
- **Bot**: `grammy`
- **Database ORM**: Prisma (`@prisma/client`)
- **Database**: PostgreSQL
- **Dev tooling**: `tsx`, `nodemon`, `dotenv`

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Telegram Bot token (from @BotFather)

### Environment Variables
Create a `.env` file in the project root with:

```env
BOT_TOKEN=your_telegram_bot_token
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public
NODE_ENV=development
```

### Install

```bash
npm install
```

### Database Setup (Prisma)
- Generate Prisma client:

```bash
npm run db:generate
```

- Push schema to the database (safe for dev):

```bash
npm run db:push
```

- Alternatively, use migrations during development:

```bash
npm run db:migrate
```

- Seed sample data:

```bash
npm run db:seed
```

- Open Prisma Studio (DB UI):

```bash
npm run db:studio
```

### Run the Bot (Development)

```bash
npm run dev
```

This starts the bot using `nodemon` and `tsx`, loading `src/index.ts`.

### Bot Commands
- `/start` – Welcome and quick help
- `/create_room` – Instructions to create a room; send 3 lines: title, total amount, payment day (1–31)
- `/join_room` – Instructions to join a room; send the 6-character room code
- `/my_rooms` – List rooms you created and joined, with per-user amounts
- `/help` – Command reference

### Data Model (Prisma)
Core models located in `prisma/schema.prisma`:
- `User`: Telegram users; tracks names and activity
- `Room`: Subscription rooms with code, name, total amount, currency, payment day
- `RoomMember`: Many-to-many link between users and rooms
- `Payment`: Records of payments with status enum (`PENDING`, `PAID`, `CONFIRMED`, `OVERDUE`)

### Scripts
From `package.json`:
- `dev`: Run bot in watch mode
- `db:generate`: Generate Prisma client
- `db:push`: Apply schema changes to DB (no migration files)
- `db:migrate`: Create/apply migrations in dev
- `db:studio`: Open Prisma Studio
- `db:seed`: Seed database with sample users and a room

### Notes
- The bot uses long polling via `bot.start()` from `grammy`.
- Graceful shutdown is implemented for `SIGINT`/`SIGTERM` with Prisma disconnect.
- Amount per user is rounded to two decimals.

### Troubleshooting
- Ensure `BOT_TOKEN` and `DATABASE_URL` are set and valid.
- If Prisma client types are missing, run `npm run db:generate`.
- If tables are missing, run `npm run db:push` (or `npm run db:migrate`).
- For connectivity issues, verify your Postgres host, port, and firewall rules.

### License
ISC


