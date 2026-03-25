export type CreatorRecommendationPreview = {
  videoId: string;
  thumbnailUrl: string | null;
  title: string;
};

export type CreatorRecommendationPayload = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  talentType: string | null;
  previews: CreatorRecommendationPreview[];
  recommendationReason: string | null;
  followedByViewer: false;
};
