/** Must match Prisma enum CreatorTier (talent ranking system). */
export type CreatorTier = 'STARTER' | 'RISING' | 'FEATURED' | 'SPOTLIGHT' | 'GLOBAL';
export type UserRole = 'USER' | 'ADMIN';

export interface UserPayload {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  /** Explicit ISO 3166-1 alpha-2 alias for country field. */
  countryCode?: string | null;
  city: string | null;
  talentType: string | null;
  role: UserRole;
  creatorTier: CreatorTier;
  uploadLimitSec: number;
  followersCount: number;
  followingCount: number;
  videosCount: number;
  totalViews: number;
  totalLikes: number;
  totalCoinsReceived: number;
  isVerified: boolean;
}
