/** Client shapes aligned with Prisma /api/users/me/preferences (server is source of truth). */

export type ProfileVisibilitySetting = 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE';
export type DefaultCommentPermissionSetting = 'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF';

export type PrivacySettings = {
  profileVisibility: ProfileVisibilitySetting;
  defaultCommentPermission: DefaultCommentPermissionSetting;
  allowVotesOnPerformances: boolean;
};

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  profileVisibility: 'PUBLIC',
  defaultCommentPermission: 'EVERYONE',
  allowVotesOnPerformances: true,
};

export type NotificationsPrefs = {
  challenges: boolean;
  votes: boolean;
  gifts: boolean;
  followers: boolean;
  comments: boolean;
  announcements: boolean;
};

export const DEFAULT_NOTIFICATIONS_PREFS: NotificationsPrefs = {
  challenges: true,
  votes: true,
  gifts: true,
  followers: true,
  comments: true,
  announcements: true,
};

export type CreatorPrefs = {
  preferredGenreSlugs: string[];
  challengeInterests: '' | 'all' | 'singing' | 'dance' | 'gospel';
  showInDiscoverCreators: boolean;
};

export const CREATOR_PREFS_STORAGE_KEY = 'betalent.settings.creatorPrefs.v1';

export const DEFAULT_CREATOR_PREFS: CreatorPrefs = {
  preferredGenreSlugs: [],
  challengeInterests: '',
  showInDiscoverCreators: true,
};

function safeLoadJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadCreatorPrefs(): CreatorPrefs {
  const v = safeLoadJson<CreatorPrefs>(CREATOR_PREFS_STORAGE_KEY);
  return v ? { ...DEFAULT_CREATOR_PREFS, ...v } : DEFAULT_CREATOR_PREFS;
}

export function saveCreatorPrefs(v: CreatorPrefs) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CREATOR_PREFS_STORAGE_KEY, JSON.stringify(v));
}

export function mapPrefsFromApi(p: {
  profileVisibility: ProfileVisibilitySetting;
  defaultCommentPermission: DefaultCommentPermissionSetting;
  allowVotesOnPerformances: boolean;
  notifyChallenges: boolean;
  notifyVotes: boolean;
  /** Present after DB migration; default true when absent. */
  notifyGifts?: boolean;
  notifyFollowers: boolean;
  notifyComments: boolean;
  notifyAnnouncements: boolean;
}): { privacy: PrivacySettings; notifications: NotificationsPrefs } {
  return {
    privacy: {
      profileVisibility: p.profileVisibility,
      defaultCommentPermission: p.defaultCommentPermission,
      allowVotesOnPerformances: p.allowVotesOnPerformances,
    },
    notifications: {
      challenges: p.notifyChallenges,
      votes: p.notifyVotes,
      gifts: p.notifyGifts ?? true,
      followers: p.notifyFollowers,
      comments: p.notifyComments,
      announcements: p.notifyAnnouncements,
    },
  };
}

export function notificationsToApiPatch(prefs: NotificationsPrefs): Record<string, boolean> {
  return {
    notifyChallenges: prefs.challenges,
    notifyVotes: prefs.votes,
    notifyGifts: prefs.gifts,
    notifyFollowers: prefs.followers,
    notifyComments: prefs.comments,
    notifyAnnouncements: prefs.announcements,
  };
}
