# BeTalent

Global talent discovery platform – Show the world your talent.

## Stack

- Next.js (App Router)
- TypeScript
- Prisma + PostgreSQL
- TailwindCSS
- Cloudinary (video)

## Setup

```bash
npm install
cp .env.example .env  # configure DATABASE_URL
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```
