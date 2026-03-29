/**
 * Safe upsert for vocal style Category rows (production / staging).
 * Run: npx tsx scripts/upsert-vocal-categories.ts
 */
import { PrismaClient } from '@prisma/client';
import { VOCAL_STYLE_CATALOG } from '../src/constants/vocal-style-catalog';

const prisma = new PrismaClient();

async function main() {
  for (const v of VOCAL_STYLE_CATALOG) {
    await prisma.category.upsert({
      where: { slug: v.slug },
      create: {
        name: v.name,
        slug: v.slug,
        description: `${v.name} — vocal performances on BETALENT.`,
      },
      update: { name: v.name },
    });
    console.log('upsert', v.slug);
  }
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
