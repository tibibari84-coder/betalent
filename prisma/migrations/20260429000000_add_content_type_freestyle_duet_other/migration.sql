-- Prisma enum ContentType: add creator-facing variants (upload UI).
ALTER TYPE "ContentType" ADD VALUE 'FREESTYLE';
ALTER TYPE "ContentType" ADD VALUE 'DUET';
ALTER TYPE "ContentType" ADD VALUE 'OTHER';
