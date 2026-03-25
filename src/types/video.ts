export type VideoStatus = 'PROCESSING' | 'READY' | 'FAILED' | 'HIDDEN' | 'REPORTED';

export interface VideoPayload {
  id: string;
  creatorId: string;
  categoryId: string;
  title: string;
  description: string | null;
  videoUrl: string;
  publicId: string;
  thumbnailUrl: string | null;
  durationSec: number;
  status: VideoStatus;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  coinsCount: number;
  score: number;
  isFeatured: boolean;
  createdAt: Date;
}
