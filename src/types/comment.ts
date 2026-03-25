export interface CommentPayload {
  id: string;
  userId: string;
  videoId: string;
  body: string;
  createdAt: Date;
}
