import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { giftCatalogToSeedRows } from '../src/constants/giftCatalog';
import { COVER_CHALLENGE_MAX_DURATION_SEC, WEEKLY_ARTIST_THEMES } from '../src/constants/cover-challenge';

const prisma = new PrismaClient();

// Test user – login: betalent@gmail.com / password: Test1234
const TEST_PASSWORD_HASH = bcrypt.hashSync('Test1234', 10);

function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

async function main() {
  console.log('🌱 BETALENT seed starting...');

  // Clean in FK-safe order (ignore if new economy tables not yet migrated)
  const safeDelete = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2021') return;
      throw e;
    }
  };
  await prisma.leaderboardEntry.deleteMany();
  await prisma.coinTransaction.deleteMany();
  await safeDelete(() => prisma.creatorEarningsLedger.deleteMany());
  await safeDelete(() => prisma.platformRevenueLedger.deleteMany());
  await safeDelete(() => prisma.giftTransaction.deleteMany());
  await safeDelete(() => prisma.gift.deleteMany());
  await safeDelete(() => prisma.coinPackage.deleteMany());
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.follow.deleteMany();
  await safeDelete(() => prisma.challenge.deleteMany());
  await prisma.video.deleteMany();
  await safeDelete(() => prisma.userWallet.deleteMany());
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Categories (legacy + vocal styles for upload/explore)
  const categoriesData = [
    { name: 'Singing', slug: 'singing', description: 'Vocal performances, solo singing, covers, original vocals.' },
    { name: 'Radio Jingle', slug: 'radio-jingle', description: 'Short melodic radio-style vocal intros and branded singing clips.' },
    { name: 'Rap', slug: 'rap', description: 'Rap performances, freestyle rap, lyrical delivery.' },
    { name: 'Instrument', slug: 'instrument', description: 'Piano, guitar, violin, drums and other instrumental performances.' },
    { name: 'Dance', slug: 'dance', description: 'Dance performances including freestyle, hip-hop and stage choreography.' },
    { name: 'Performance', slug: 'performance', description: 'Live stage performance, musical theatre and vocal storytelling.' },
    { name: 'Gospel', slug: 'gospel', description: 'Gospel singing, spiritual and inspirational vocal performances.' },
    { name: 'Beatbox', slug: 'beatbox', description: 'Beatboxing and vocal rhythm performance.' },
    { name: 'Special Talent', slug: 'special-talent', description: 'Unique, unusual and memorable talents.' },
    { name: 'Pop', slug: 'pop', description: 'Pop vocal style.' },
    { name: 'R&B', slug: 'rnb', description: 'R&B vocal style.' },
    { name: 'Soul', slug: 'soul', description: 'Soul vocal style.' },
    { name: 'Jazz', slug: 'jazz', description: 'Jazz vocal style.' },
    { name: 'Acoustic', slug: 'acoustic', description: 'Acoustic vocal style.' },
    { name: 'Classical / Opera', slug: 'classical', description: 'Classical and opera vocal style.' },
    { name: 'Country', slug: 'country', description: 'Country vocal style.' },
    { name: 'Rock', slug: 'rock', description: 'Rock vocal style.' },
    { name: 'Indie', slug: 'indie', description: 'Indie vocal style.' },
    { name: 'Latin', slug: 'latin', description: 'Latin vocal style.' },
    { name: 'Afrobeat', slug: 'afrobeat', description: 'Afrobeat vocal style.' },
    { name: 'Folk', slug: 'folk', description: 'Folk vocal style.' },
    { name: 'Reggae', slug: 'reggae', description: 'Reggae vocal style.' },
    { name: 'Alternative', slug: 'alternative', description: 'Alternative vocal style.' },
    { name: 'Worship', slug: 'worship', description: 'Worship vocal style.' },
    { name: 'Cover', slug: 'cover', description: 'Cover performances for Weekly Live Cover Challenges.' },
  ];

  const categories: Record<string, { id: string; slug: string }> = {};
  for (const c of categoriesData) {
    const created = await prisma.category.create({ data: c });
    categories[c.slug] = { id: created.id, slug: created.slug };
  }

  // Coin packages (MVP: 100, 500, 1000, 5000)
  try {
    await prisma.coinPackage.createMany({
      data: [
        { internalName: 'package_100', name: '100 Coins', coins: 100, price: 0.99, currency: 'USD', isActive: true, sortOrder: 1 },
        { internalName: 'package_500', name: '500 Coins', coins: 500, price: 4.99, currency: 'USD', isActive: true, sortOrder: 2 },
        { internalName: 'package_1000', name: '1000 Coins', coins: 1000, price: 9.99, currency: 'USD', isActive: true, sortOrder: 3 },
        { internalName: 'package_5000', name: '5000 Coins', coins: 5000, price: 39.99, currency: 'USD', isActive: true, sortOrder: 4 },
      ],
      skipDuplicates: true,
    });
    console.log('Coin packages seeded.');
  } catch (e: unknown) {
    console.warn('Coin package seed skipped (run coin package migration if needed).', e);
  }

  // Demo users – PLACEHOLDER password hashes, replace via register in production
  const PLACEHOLDER_HASH = 'REPLACE_VIA_REGISTER_OR_BCRYPT';

  const user1 = await prisma.user.create({
    data: {
      email: 'rising@betalent.local',
      username: 'rising_talent',
      isSeedAccount: true,
      passwordHash: PLACEHOLDER_HASH,
      displayName: 'Rising Talent',
      avatarUrl: '/uploads/avatars/rising.jpg',
      bio: null,
      country: 'CA',
      city: 'Toronto',
      talentType: null,
      creatorTier: 'RISING',
      uploadLimitSec: 90,
      followersCount: 1,
      followingCount: 1,
      videosCount: 1,
      totalViews: 12500,
      totalLikes: 2200,
      totalComments: 170,
      totalCoinsReceived: 950,
      totalCoinsSpent: 100,
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'betalent@gmail.com',
      username: 'betalent',
      passwordHash: TEST_PASSWORD_HASH,
      displayName: 'BETALENT',
      avatarUrl: '/uploads/avatars/starter.jpg',
      bio: null,
      country: 'HU',
      city: 'Budapest',
      talentType: null,
      creatorTier: 'STARTER',
      uploadLimitSec: 90,
      followersCount: 1,
      followingCount: 1,
      videosCount: 1,
      totalViews: 6400,
      totalLikes: 960,
      totalComments: 60,
      totalCoinsReceived: 280,
      totalCoinsSpent: 80,
      isVerified: false,
      emailVerifiedAt: new Date(),
    },
  });

  // Gift catalog + User wallets (require new coin/gift migration)
  try {
    const giftCatalogRows = giftCatalogToSeedRows();
    for (const row of giftCatalogRows) {
      await prisma.gift.upsert({
        where: { slug: row.slug },
        create: row,
        update: {
          name: row.name,
          icon: row.icon,
          animationType: row.animationType,
          coinCost: row.coinCost,
          rarityTier: row.rarityTier,
          isActive: row.isActive,
        },
      });
    }
    await prisma.userWallet.create({
      data: {
        userId: user1.id,
        coinBalance: 950,
        totalCoinsPurchased: 1100,
        totalCoinsSpent: 100,
      },
    });
    await prisma.userWallet.create({
      data: {
        userId: user2.id,
        coinBalance: 500,
        totalCoinsPurchased: 600,
        totalCoinsSpent: 80,
      },
    });
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : '';
    if (code === 'P2021' || code === 'P2022') {
      console.log('⏭️  Skipping gift catalog & wallets (run db:migrate for coin/gift schema).');
    } else throw e;
  }

  // Videos
  const score1 = 12500 + 2200 * 3 + 170 * 4 + 950 * 5;
  const score2 = 6400 + 960 * 3 + 60 * 4 + 280 * 5;

  const video1 = await prisma.video.create({
    data: {
      creatorId: user1.id,
      categoryId: categories['singing'].id,
      title: 'Show the World',
      description: 'Dramatic vocal performance for the BETALENT stage.',
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/betalent/v1.mp4',
      publicId: 'betalent/rising-show',
      thumbnailUrl: 'https://res.cloudinary.com/demo/video/upload/so_2/v1/betalent/v1.jpg',
      durationSec: 58,
      status: 'READY',
      viewsCount: 12500,
      likesCount: 2200,
      commentsCount: 170,
      coinsCount: 950,
      giftsCount: 12,
      sharesCount: 90,
      score: score1,
      isFeatured: true,
    },
  });

  const video2 = await prisma.video.create({
    data: {
      creatorId: user2.id,
      categoryId: categories['radio-jingle'].id,
      title: 'Midnight Radio Intro',
      description: 'Short radio-style melodic vocal intro.',
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/v2/betalent/v2.mp4',
      publicId: 'betalent/starter-radio',
      thumbnailUrl: 'https://res.cloudinary.com/demo/video/upload/so_2/v2/betalent/v2.jpg',
      durationSec: 42,
      status: 'READY',
      viewsCount: 6400,
      likesCount: 960,
      commentsCount: 60,
      coinsCount: 280,
      giftsCount: 5,
      sharesCount: 32,
      score: score2,
      isFeatured: false,
    },
  });

  // Follow (source=SEED: do not notify)
  await prisma.follow.create({ data: { followerId: user1.id, creatorId: user2.id, source: 'SEED' } });
  await prisma.follow.create({ data: { followerId: user2.id, creatorId: user1.id, source: 'SEED' } });

  // Likes
  await prisma.like.create({ data: { userId: user2.id, videoId: video1.id } });
  await prisma.like.create({ data: { userId: user1.id, videoId: video2.id } });

  // Comments
  await prisma.comment.create({
    data: { userId: user2.id, videoId: video1.id, body: 'Strong voice and amazing stage energy!' },
  });
  await prisma.comment.create({
    data: { userId: user1.id, videoId: video2.id, body: 'Beautiful tone. Radio jingle category is going to be huge.' },
  });

  // Demo gift transactions (use catalog gifts; skip if Gift/GiftTransaction tables missing)
  try {
    const musicNote = await prisma.gift.findUnique({ where: { slug: 'music-note' } });
    const microphone = await prisma.gift.findUnique({ where: { slug: 'microphone' } });
    if (musicNote && microphone) {
      await prisma.giftTransaction.create({
        data: {
          senderId: user2.id,
          receiverId: user1.id,
          videoId: video1.id,
          giftId: microphone.id,
          coinAmount: 20,
          creatorShareCoins: 14,
          platformShareCoins: 6,
          status: 'COMPLETED',
        },
      });
      await prisma.giftTransaction.create({
        data: {
          senderId: user1.id,
          receiverId: user2.id,
          videoId: video2.id,
          giftId: musicNote.id,
          coinAmount: 5,
          creatorShareCoins: 4,
          platformShareCoins: 1,
          status: 'COMPLETED',
        },
      });
    }
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : '';
    if (code === 'P2021' || code === 'P2022') {
      // tables not migrated or schema mismatch
    } else throw e;
  }

  // Coin transactions
  await prisma.coinTransaction.create({
    data: {
      fromUserId: user2.id,
      toUserId: user1.id,
      videoId: video1.id,
      type: 'GIFT_SENT',
      amount: 20,
      description: 'Microphone gift to Rising Talent',
    },
  });
  await prisma.coinTransaction.create({
    data: {
      fromUserId: user1.id,
      toUserId: user2.id,
      videoId: video2.id,
      type: 'GIFT_SENT',
      amount: 5,
      description: 'Music Note gift to Starter Creator',
    },
  });

  // Leaderboard
  const { year, week } = getISOWeek(new Date());
  await prisma.leaderboardEntry.create({ data: { videoId: video1.id, year, week, score: score1 } });
  await prisma.leaderboardEntry.create({ data: { videoId: video2.id, year, week, score: score2 } });

  // Weekly Live Cover Challenges – 50 weeks preplanned
  try {
  const coverCategoryId = categories['cover']?.id ?? categories['singing'].id;
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
  const week1Start = new Date(Date.UTC(2026, 2, 9, 0, 0, 0)); // March 9, 2026 Monday

  for (let i = 0; i < WEEKLY_ARTIST_THEMES.length; i++) {
    const artist = WEEKLY_ARTIST_THEMES[i];
    const weekIndex = i + 1;
    const startAt = new Date(week1Start.getTime() + (i * MS_PER_WEEK));
    const endAt = new Date(startAt.getTime() + MS_PER_WEEK - 1);
    const liveEventAt = new Date(endAt);
    liveEventAt.setUTCHours(20, 0, 0, 0);
    liveEventAt.setUTCDate(liveEventAt.getUTCDate() - 1);
    const liveStartAt = new Date(liveEventAt);

    const baseSlug =
      artist
        .toLowerCase()
        .replace(/\s*\/\s*/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || `week${weekIndex}`;
    const slug = baseSlug + '-week';

    const title = `${artist} Week`;
    const status = weekIndex === 1 ? 'ENTRY_OPEN' : 'DRAFT';
    const entryOpenAt = startAt;
    const entryCloseAt = new Date(liveStartAt.getTime() - 60 * 60 * 1000);
    const votingCloseAt = endAt;

    await prisma.challenge.upsert({
      where: { slug },
      create: {
        slug: `${slug}-${weekIndex}`,
        title,
        categoryId: coverCategoryId,
        description: `Perform a cover from ${artist}. Choose your song and performance style. Max ${COVER_CHALLENGE_MAX_DURATION_SEC} seconds.`,
        rules: [
          'One entry per creator per challenge.',
          `Maximum ${COVER_CHALLENGE_MAX_DURATION_SEC} seconds per performance.`,
          `Perform a cover of a song by or associated with ${artist}.`,
          'Choose your performance style (Pop, R&B, Soul, Gospel, Jazz, etc.).',
          'No lip-sync or fake playback. Live vocal or instrumental only.',
        ],
        prizeDescription: 'Top 3 win coins and badges.',
        prizeCoins: { '1': 5000, '2': 3000, '3': 1000 },
        status,
        startAt,
        endAt,
        entryOpenAt,
        entryCloseAt,
        votingCloseAt,
        isGlobalWeekly: weekIndex === 1,
        artistTheme: artist,
        weekIndex,
        maxDurationSec: COVER_CHALLENGE_MAX_DURATION_SEC,
        liveEventAt,
        liveStartAt,
      },
      update: {
        title,
        description: `Perform a cover from ${artist}. Choose your song and performance style. Max ${COVER_CHALLENGE_MAX_DURATION_SEC} seconds.`,
        artistTheme: artist,
        weekIndex,
        maxDurationSec: COVER_CHALLENGE_MAX_DURATION_SEC,
        liveEventAt,
        liveStartAt,
        startAt,
        endAt,
        entryOpenAt,
        entryCloseAt,
        votingCloseAt,
      },
    });
  }
  console.log(`✅ Seeded ${WEEKLY_ARTIST_THEMES.length} Weekly Live Cover Challenges.`);
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : '';
    if (code === 'P2021' || code === 'P2010') {
      console.log('⏭️  Skipping Weekly Cover Challenges (run prisma migrate deploy for new schema).');
    } else {
      console.warn('⚠️  Weekly Cover Challenge seed failed:', e);
    }
  }

  console.log('✅ BETALENT seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ BETALENT seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
