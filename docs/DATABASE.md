# Database Management

SubVersio uses **Prisma ORM** with **SQLite** for metadata and subtitle tracking.

## Schema Location

The database schema is defined in [apps/backend/prisma/schema.prisma](../apps/backend/prisma/schema.prisma).

## Common Commands

Run these from the **root directory** (they target the `apps/backend` workspace):

Ensure `apps/backend/.env` contains `DATABASE_URL="file:./prisma/dev.db"` before running Prisma commands.

### Initialize / Reset Database

Run migrations and seed data (creates `dev.db` if it doesn't exist):

```bash
npm run prisma:init
```

### Generate Prisma Client

Whenever the schema is changed, you must regenerate the client:

```bash
npm run prisma:generate --workspace=apps/backend
```

_Note: This is automatically run during `npm run build`._

### Database Studio (GUI)

To browse the database content visually:

```bash
npm run prisma:studio --workspace=apps/backend
```

## Maintenance

The SQLite database file is located at `apps/backend/prisma/dev.db`. It is ignored by Git. To backup the data, simply copy this file.
