/**
 * Idempotent: upsert canonical vocal style Category rows from VOCAL_STYLE_CATALOG.
 * Run after deploy or when adding styles: npx tsx scripts/upsert-vocal-categories.ts
 */
import { PrismaClient } from '@prisma/client';
import { VOCAL_STYLE_CATALOG } from '../src/constants/vocal-style-catalog';

const prisma = new PrismaClient();

async function main() {
  for (const row of VOCAL_STYLE_CATALOG) {
    await prisma.category.upsert({
      where: { slug: row.slug },
      create: {
        name: row.name,
        slug: row.slug,
        description: `Vocal style: ${row.name}`,
      },
      update: {
        name: row.name,
        description: `Vocal style: ${row.name}`,
      },
    });
  }
  console.log(`Upserted ${VOCAL_STYLE_CATALOG.length} vocal categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
