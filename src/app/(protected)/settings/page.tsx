'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { IconUser, IconSettings, IconShieldCheck, IconBell, IconAward, IconCompass, IconSparkles, IconChevronRight, IconArrowPath } from '@/components/ui/Icons';
import CountrySelect from '@/components/ui/CountrySelect';
import { CREATOR_VERIFICATION_LABELS } from '@/constants/creator-verification';
import { useI18n } from '@/contexts/I18nContext';
import { SUPPORTED_LOCALES, validatePasswordPolicyForUser } from '@/lib/validations';
import { LOCALE_LABELS } from '@/constants/locales';
import type { SupportedLocale } from '@/lib/validations';
import ShareButton from '@/components/shared/ShareButton';
import AvatarCropModal from '@/components/profile/AvatarCropModal';
import { SettingsRightAside } from '@/components/settings/SettingsRightAside';
import {
  DEFAULT_PRIVACY_SETTINGS,
  DEFAULT_NOTIFICATIONS_PREFS,
  mapPrefsFromApi,
  type PrivacySettings,
  type NotificationsPrefs,
} from '@/lib/settings-client';

const NOTIFY_API_KEY: Record<keyof NotificationsPrefs, string> = {
  challenges: 'notifyChallenges',
  votes: 'notifyVotes',
  gifts: 'notifyGifts',
  followers: 'notifyFollowers',
  comments: 'notifyComments',
  announcements: 'notifyAnnouncements',
};

const NAV_ITEMS = [
  { id: 'profile', labelKey: 'settings.profile', icon: IconUser },
  { id: 'account', labelKey: 'settings.account', icon: IconSettings },
  { id: 'verification', labelKey: 'settings.verification', icon: IconSparkles },
  { id: 'privacy', labelKey: 'settings.privacy', icon: IconShieldCheck },
  { id: 'notifications', labelKey: 'settings.notifications', icon: IconBell },
  { id: 'creator', labelKey: 'settings.creator', icon: IconAward },
  { id: 'language', labelKey: 'settings.languageAndRegion', icon: IconCompass },
] as const;

/** Grouped sections - reduced clutter; planned features grouped into one row */
const SETTINGS_GROUPS = [
  {
    title: 'Activity & Content',
    items: [
      { id: 'activity', label: 'Activity Center', icon: IconUser, sectionId: 'notifications' as const },
      { id: 'content', label: 'Content Preferences', icon: IconAward, sectionId: 'creator' as const },
    ],
  },
  {
    title: 'Account',
    items: [
      { id: 'account', label: 'Account', icon: IconSettings, sectionId: 'account' as const },
      { id: 'privacy', label: 'Privacy', icon: IconShieldCheck, sectionId: 'privacy' as const },
      { id: 'security', label: 'Security & Permissions', icon: IconShieldCheck, sectionId: 'account' as const },
      { id: 'share', label: 'Share Profile', icon: IconUser, sectionId: 'profile' as const },
    ],
  },
  {
    title: 'Content & Display',
    items: [
      { id: 'notifications', label: 'Notifications', icon: IconBell, sectionId: 'notifications' as const },
      { id: 'language', label: 'Language', icon: IconCompass, sectionId: 'language' as const },
    ],
  },
  {
    title: 'Storage / Data',
    items: [
      { id: 'offline', label: 'Offline videos', icon: IconSettings },
      { id: 'storage', label: 'Free up space', icon: IconSettings },
      { id: 'dataSaver', label: 'Data Saver', icon: IconSettings },
    ],
  },
  {
    title: 'Coming later',
    items: [
      { id: 'planned', label: 'More features', icon: IconSparkles, isPlannedSummary: true },
    ],
  },
  {
    title: 'Support & Legal',
    items: [
      { id: 'help', label: 'Help Center', icon: IconAward, href: '/contact' },
      { id: 'terms', label: 'Terms of Service', icon: IconShieldCheck, href: '/terms' },
      { id: 'creatorRules', label: 'Creator Rules', icon: IconShieldCheck, href: '/legal/creator-rules' },
      { id: 'privacyCenter', label: 'Privacy Policy', icon: IconShieldCheck, href: '/privacy' },
    ],
  },
  {
    title: 'Account Actions',
    items: [
      { id: 'switch', label: 'Switch account', icon: IconUser },
      { id: 'logout', label: 'Log out', icon: IconArrowPath, isDestructive: true },
    ],
  },
];

/** Rows that are native-app concepts; not available on web. */
const NOT_AVAILABLE_WEB_ROW_IDS = new Set(['offline', 'storage', 'dataSaver']);

/** Explicitly not implemented on web (honest copy, not “coming soon”). */
const NOT_ON_WEB_ROW_IDS = new Set(['switch']);

type SectionId = (typeof NAV_ITEMS)[number]['id'];

const inputClass =
  'w-full h-12 px-4 rounded-[12px] bg-canvas-tertiary border border-[rgba(255,255,255,0.08)] text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 text-[15px]';

const labelClass = 'block text-[13px] font-semibold text-text-primary mb-2';
const helperClass = 'block text-[12px] text-text-muted mt-1.5';

function Section({ id, title, children }: { id: SectionId; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="glass-panel rounded-[24px] p-6 lg:p-8 min-w-0 overflow-x-hidden">
      <h2 className="font-display text-[20px] lg:text-[22px] font-semibold text-text-primary mb-6 lg:mb-8 text-left break-words">
        {title}
      </h2>
      {children}
    </section>
  );
}

type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';

type ProfileData = {
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
};

export default function SettingsPage() {
  const router = useRouter();
  const { t, setLocale } = useI18n();
  const [activeSection, setActiveSection] = useState<SectionId>('profile');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileCountry, setProfileCountry] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveMessage, setProfileSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [accountEmail, setAccountEmail] = useState<string>('');
  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [passwordNew, setPasswordNew] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailOwnershipVerified, setEmailOwnershipVerified] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [totpSetupSecret, setTotpSetupSecret] = useState<string | null>(null);
  const [totpOtpauthUrl, setTotpOtpauthUrl] = useState<string | null>(null);
  const [totpEnableCode, setTotpEnableCode] = useState('');
  const [totpDisablePassword, setTotpDisablePassword] = useState('');
  const [totpDisableCode, setTotpDisableCode] = useState('');
  const [totpBusy, setTotpBusy] = useState(false);
  const [totpMessage, setTotpMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [regionCountry, setRegionCountry] = useState('');
  const [preferredLocale, setPreferredLocale] = useState<SupportedLocale>('en');
  const [localeLoading, setLocaleLoading] = useState(false);
  const [verification, setVerification] = useState<{
    verificationLevel: string;
    verificationStatus: VerificationStatus;
    rejectionReason: string | null;
    requestPayload: { socialLinks?: string[]; portfolioLinks?: string[]; musicPlatformLinks?: string[]; notes?: string } | null;
  } | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationSubmitLoading, setVerificationSubmitLoading] = useState(false);
  const [verificationForm, setVerificationForm] = useState({
    socialLinks: '',
    portfolioLinks: '',
    musicPlatformLinks: '',
    notes: '',
  });

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(DEFAULT_PRIVACY_SETTINGS);
  const [notificationsPrefs, setNotificationsPrefs] = useState<NotificationsPrefs>(DEFAULT_NOTIFICATIONS_PREFS);
  const [preferencesMessage, setPreferencesMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: 'follow' | 'vote' | 'comment' | 'gift' | 'challenge' | 'security';
      message: string;
      actorName: string;
      timestamp: string;
      href: string;
    }>
  >([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  const [comingSoon, setComingSoon] = useState<{ title: string; message: string } | null>(null);

  const [languageSaving, setLanguageSaving] = useState(false);

  const [languageSaveMessage, setLanguageSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (activeSection !== 'profile') return;
    setProfileLoading(true);
    setAvatarMessage(null);
    setProfileSaveMessage(null);
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.user) {
          const u = data.user;
          setProfile({
            displayName: u.displayName ?? null,
            username: u.username ?? '',
            avatarUrl: u.avatarUrl ?? null,
            bio: u.bio ?? null,
            country: u.country ?? null,
          });
          setProfileCountry(u.country ?? '');
        } else {
          setProfile(null);
          setProfileCountry('');
        }
      })
      .finally(() => setProfileLoading(false));
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== 'account') return;
    setPasswordMessage(null);
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.user?.email) {
          setAccountEmail(data.user.email);
          setEmailOwnershipVerified(!!data.user.emailOwnershipVerified);
          setTwoFactorEnabled(!!data.user.twoFactorEnabled);
        } else {
          setAccountEmail('');
          setEmailOwnershipVerified(false);
          setTwoFactorEnabled(false);
        }
        setTotpSetupSecret(null);
        setTotpOtpauthUrl(null);
        setTotpEnableCode('');
        setTotpMessage(null);
      })
      .catch(() => {
        setAccountEmail('');
        setEmailOwnershipVerified(false);
        setTwoFactorEnabled(false);
      });
  }, [activeSection]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const mime = file.type?.toLowerCase()?.trim() ?? '';
    if (!mime || !allowed.includes(mime)) {
      setAvatarMessage({ type: 'error', text: 'Invalid file type. Use JPG, PNG, or WebP.' });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setAvatarMessage({ type: 'error', text: 'File too large. Max 20MB.' });
      return;
    }

    setAvatarMessage(null);
    const cropUrl = URL.createObjectURL(file);
    setAvatarCropSrc(cropUrl);
  };

  const cancelAvatarCrop = () => {
    if (avatarCropSrc) {
      URL.revokeObjectURL(avatarCropSrc);
      setAvatarCropSrc(null);
    }
  };

  const uploadAvatarBlob = (blob: Blob) => {
    if (avatarCropSrc) {
      URL.revokeObjectURL(avatarCropSrc);
      setAvatarCropSrc(null);
    }
    setAvatarUploading(true);
    setAvatarMessage(null);
    const formData = new FormData();
    formData.set('file', blob, 'avatar.png');
    fetch('/api/users/me/avatar', { method: 'POST', body: formData, credentials: 'include' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (data.ok && data.avatarUrl) {
          setProfile((p) => (p ? { ...p, avatarUrl: data.avatarUrl } : null));
          setAvatarPreviewUrl(null);
          setAvatarMessage({ type: 'success', text: 'Photo updated.' });
          router.refresh();
        } else {
          setAvatarMessage({ type: 'error', text: data.message || `Upload failed (${r.status}).` });
        }
      })
      .catch((err) => setAvatarMessage({ type: 'error', text: err?.message || 'Upload failed.' }))
      .finally(() => setAvatarUploading(false));
  };

  useEffect(() => {
    if (activeSection !== 'verification') return;
    setVerificationLoading(true);
    fetch('/api/creators/verification/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.verification) {
          setVerification({
            verificationLevel: data.verification.verificationLevel,
            verificationStatus: data.verification.verificationStatus,
            rejectionReason: data.verification.rejectionReason ?? null,
            requestPayload: data.verification.requestPayload ?? null,
          });
          const p = data.verification.requestPayload;
          if (p) {
            setVerificationForm({
              socialLinks: (p.socialLinks ?? []).join('\n'),
              portfolioLinks: (p.portfolioLinks ?? []).join('\n'),
              musicPlatformLinks: (p.musicPlatformLinks ?? []).join('\n'),
              notes: p.notes ?? '',
            });
          }
        } else {
          setVerification(null);
        }
      })
      .finally(() => setVerificationLoading(false));
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== 'language') return;
    setLocaleLoading(true);
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.user?.preferredLocale && SUPPORTED_LOCALES.includes(data.user.preferredLocale)) {
          setPreferredLocale(data.user.preferredLocale);
          setRegionCountry(typeof data.user.country === 'string' ? data.user.country : '');
        }
      })
      .finally(() => setLocaleLoading(false));
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== 'notifications') return;
    setNotificationsLoading(true);
    setNotificationsError(null);
    fetch('/api/notifications', { credentials: 'include' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (data.ok && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        } else {
          setNotificationsError(data.message || 'Failed to load notifications');
          setNotifications([]);
        }
      })
      .catch(() => {
        setNotificationsError('Failed to load notifications');
        setNotifications([]);
      })
      .finally(() => setNotificationsLoading(false));
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== 'privacy' && activeSection !== 'notifications') return;
    setPreferencesMessage(null);
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.user?.preferences) {
          const { privacy, notifications } = mapPrefsFromApi(data.user.preferences);
          setPrivacySettings(privacy);
          setNotificationsPrefs(notifications);
        }
      })
      .catch(() =>
        setPreferencesMessage({ type: 'error', text: 'Could not load saved preferences from server.' })
      );
  }, [activeSection]);

  const patchPreferences = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/users/me/preferences', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setPreferencesMessage({
        type: 'error',
        text: typeof data.message === 'string' ? data.message : 'Could not save settings.',
      });
      return false;
    }
    setPreferencesMessage({ type: 'success', text: 'Saved.' });
    window.setTimeout(() => setPreferencesMessage(null), 2200);
    return true;
  };

  const handleLocaleChange = (newLocale: SupportedLocale) => {
    setPreferredLocale(newLocale);
    setLocale(newLocale);
  };

  const handleVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationSubmitLoading(true);
    const payload = {
      socialLinks: verificationForm.socialLinks.trim().split(/\n+/).filter(Boolean).filter((u) => /^https?:\/\//i.test(u)),
      portfolioLinks: verificationForm.portfolioLinks.trim().split(/\n+/).filter(Boolean).filter((u) => /^https?:\/\//i.test(u)),
      musicPlatformLinks: verificationForm.musicPlatformLinks.trim().split(/\n+/).filter(Boolean).filter((u) => /^https?:\/\//i.test(u)),
      notes: verificationForm.notes.trim() || undefined,
    };
    fetch('/api/creators/verification/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setVerification((prev) => (prev ? { ...prev, verificationStatus: 'PENDING' } : { verificationLevel: 'STANDARD_CREATOR', verificationStatus: 'PENDING', rejectionReason: null, requestPayload: payload }));
        }
      })
      .finally(() => setVerificationSubmitLoading(false));
  };

  const handleSaveProfile = () => {
    if (activeSection !== 'profile' || !profile) return;

    const displayName = (profile.displayName ?? '').trim();
    const bio = (profile.bio ?? '').trim() || null;
    const country = profileCountry.trim() || null;

    if (!displayName) {
      setProfileSaveMessage({ type: 'error', text: 'Display name is required.' });
      return;
    }

    if (bio && bio.length > 500) {
      setProfileSaveMessage({ type: 'error', text: 'Bio must be 500 characters or less.' });
      return;
    }

    setProfileSaveMessage(null);
    setProfileSaving(true);
    fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, bio, country }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({ ok: false, message: 'Invalid response' }));
        if (data.ok) {
          const updated = data.user ?? {};
          setProfile((p) =>
            p
              ? {
                  ...p,
                  displayName: updated.displayName ?? (displayName || p.username),
                  bio: updated.bio ?? bio,
                  country: updated.country ?? country,
                  avatarUrl: updated.avatarUrl ?? p.avatarUrl,
                }
              : null
          );
          if (data.user?.country !== undefined) setProfileCountry(data.user.country ?? '');
          setProfileSaveMessage({ type: 'success', text: 'Profile saved.' });
          router.refresh();
          setTimeout(() => setProfileSaveMessage(null), 4000);
        } else {
          setProfileSaveMessage({ type: 'error', text: data.message || `Save failed (${r.status}).` });
        }
      })
      .catch((err) => {
        setProfileSaveMessage({ type: 'error', text: err?.message || 'Network error. Please try again.' });
      })
      .finally(() => setProfileSaving(false));
  };

  const handleSaveLanguage = () => {
    if (activeSection !== 'language') return;
    setLanguageSaving(true);
    setLanguageSaveMessage(null);

    fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredLocale, country: regionCountry.trim() || null }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (data.ok) {
          setRegionCountry(regionCountry.trim());
          setLanguageSaveMessage({ type: 'success', text: 'Language & region saved.' });
          router.refresh();
        } else {
          setLanguageSaveMessage({ type: 'error', text: data.message || `Save failed (${r.status}).` });
        }
      })
      .catch((err) => {
        setLanguageSaveMessage({ type: 'error', text: err?.message || 'Network error. Please try again.' });
      })
      .finally(() => setLanguageSaving(false));
  };

  const handleSaveClick = () => {
    if (activeSection === 'profile') handleSaveProfile();
    if (activeSection === 'language') handleSaveLanguage();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch {
      router.push('/');
      router.refresh();
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordCurrent.trim() || !passwordNew.trim()) {
      setPasswordMessage({ type: 'error', text: 'Please enter both current and new password.' });
      return;
    }
    const policy = validatePasswordPolicyForUser(passwordNew, accountEmail);
    if (!policy.ok) {
      setPasswordMessage({ type: 'error', text: policy.message });
      return;
    }

    setPasswordSaving(true);
    setPasswordMessage(null);
    try {
      const r = await fetch('/api/users/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordCurrent, newPassword: passwordNew }),
        credentials: 'include',
      });
      const data = await r.json().catch(() => ({}));
      if (data.ok) {
        setPasswordMessage({ type: 'success', text: 'Password updated.' });
        setPasswordCurrent('');
        setPasswordNew('');
      } else {
        setPasswordMessage({ type: 'error', text: data.message || 'Password update failed.' });
      }
    } catch {
      setPasswordMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setPasswordSaving(false);
    }
  };

  const startTotpSetup = async () => {
    setTotpBusy(true);
    setTotpMessage(null);
    try {
      const r = await fetch('/api/auth/two-factor/setup', { credentials: 'include' });
      const data = await r.json();
      if (data.ok) {
        setTotpSetupSecret(data.secret);
        setTotpOtpauthUrl(data.otpauthUrl);
      } else {
        setTotpMessage({ type: 'error', text: data.message || 'Could not start authenticator setup.' });
      }
    } catch {
      setTotpMessage({ type: 'error', text: 'Network error. Try again.' });
    } finally {
      setTotpBusy(false);
    }
  };

  const confirmTotpEnable = async () => {
    if (!totpSetupSecret || !totpEnableCode.trim()) {
      setTotpMessage({ type: 'error', text: 'Enter the 6-digit code from your app.' });
      return;
    }
    setTotpBusy(true);
    setTotpMessage(null);
    try {
      const r = await fetch('/api/auth/two-factor/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: totpSetupSecret, code: totpEnableCode.trim() }),
        credentials: 'include',
      });
      const data = await r.json();
      if (data.ok) {
        setTwoFactorEnabled(true);
        setTotpSetupSecret(null);
        setTotpOtpauthUrl(null);
        setTotpEnableCode('');
        setTotpMessage({ type: 'success', text: 'Authenticator app protection is enabled for your account.' });
      } else {
        setTotpMessage({ type: 'error', text: data.message || 'Could not enable two-factor.' });
      }
    } catch {
      setTotpMessage({ type: 'error', text: 'Network error.' });
    } finally {
      setTotpBusy(false);
    }
  };

  const disableTotpFlow = async () => {
    setTotpBusy(true);
    setTotpMessage(null);
    try {
      const r = await fetch('/api/auth/two-factor/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: totpDisablePassword, code: totpDisableCode.trim() }),
        credentials: 'include',
      });
      const data = await r.json();
      if (data.ok) {
        setTwoFactorEnabled(false);
        setTotpDisablePassword('');
        setTotpDisableCode('');
        setTotpMessage({ type: 'success', text: 'Two-factor authentication is turned off.' });
      } else {
        setTotpMessage({ type: 'error', text: data.message || 'Could not disable two-factor.' });
      }
    } catch {
      setTotpMessage({ type: 'error', text: 'Network error.' });
    } finally {
      setTotpBusy(false);
    }
  };

  const shouldShowStickySave =
    activeSection === 'profile' ||
    activeSection === 'language';

  const stickyDisabled =
    activeSection === 'profile'
      ? profileSaving
      : activeSection === 'language'
        ? languageSaving
        : false;

  return (
    <>
      {avatarCropSrc ? (
        <AvatarCropModal imageSrc={avatarCropSrc} onCancel={cancelAvatarCrop} onComplete={uploadAvatarBlob} />
      ) : null}
    <div className="w-full min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-72px)] min-w-0 overflow-x-hidden" style={{ backgroundColor: '#0D0D0E' }}>
      {/*
        Critical: inner 3-col (260 + main + 320) sits INSIDE shell main (already beside 260px app nav).
        At lg (~1024px) viewport, main ≈ 764px → middle track would be ~136px → “vertical” titles + overlap.
        Fix: 2 cols (nav | main) from lg until xl-screen; 3rd rail only when viewport ≥ 1400px (xl-screen).
      */}
      <div className="mobile-page-column mx-auto w-full max-w-[1600px] py-5 md:py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] xl-screen:grid-cols-[260px_minmax(0,1fr)_320px] gap-6 lg:gap-6 items-start min-w-0 isolate">
        {/* Left: fixed-width rail — aligns with app shell sidebar (260px) */}
        <aside
          className="min-w-0 w-full lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto space-y-6"
          aria-label="Settings navigation"
        >
          {SETTINGS_GROUPS.map((group) => (
            <div
              key={group.title}
              className="rounded-[20px] overflow-hidden"
              style={{
                background: 'rgba(18,22,31,0.7)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <h3 className="px-4 py-3 text-[12px] font-semibold tracking-wide text-text-muted">
                {group.title}
              </h3>
              <div className="divide-y divide-[rgba(255,255,255,0.06)]">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  if ('href' in item && item.href && !('isDestructive' in item && item.isDestructive)) {
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="flex items-center gap-3 min-h-[52px] px-4 py-3 hover:bg-white/5 active:bg-white/8 transition-colors"
                      >
                        <Icon className="w-5 h-5 shrink-0 text-text-secondary" />
                        <span className="flex-1 font-medium text-[15px] text-text-primary">{item.label}</span>
                        <IconChevronRight className="w-5 h-5 shrink-0 text-text-muted" />
                      </Link>
                    );
                  }
                  if ('isDestructive' in item && item.isDestructive && item.id === 'logout') {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 min-h-[52px] px-4 py-3 hover:bg-red-500/10 active:bg-red-500/15 transition-colors text-left"
                      >
                        <Icon className="w-5 h-5 shrink-0 text-red-400" />
                        <span className="flex-1 font-medium text-[15px] text-red-400">{item.label}</span>
                        <IconChevronRight className="w-5 h-5 shrink-0 text-red-400/70" />
                      </button>
                    );
                  }
                  const sectionId = 'sectionId' in item ? (item.sectionId as SectionId) : null;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        const label = item.label ?? 'Coming soon';
                        if ((item as { isPlannedSummary?: boolean }).isPlannedSummary) {
                          setComingSoon({
                            title: 'Planned features',
                            message: 'Time & Well-being, Family / Safe Mode, LIVE settings, Playback, Display, and Accessibility will be added in future updates.',
                          });
                          return;
                        }
                        if (NOT_AVAILABLE_WEB_ROW_IDS.has(item.id)) {
                          setComingSoon({
                            title: label,
                            message: 'This feature is not available on the web app. It applies to native mobile apps.',
                          });
                          return;
                        }
                        if (NOT_ON_WEB_ROW_IDS.has(item.id)) {
                          setComingSoon({
                            title: label,
                            message:
                              'Multiple accounts are not switchable in-app on web. Log out and sign in with another account.',
                          });
                          return;
                        }
                        if (sectionId) setActiveSection(sectionId);
                        else {
                          setComingSoon({
                            title: label,
                            message: 'This option is not available in Settings on the web app.',
                          });
                        }
                      }}
                      className="w-full flex items-center gap-3 min-h-[52px] px-4 py-3 hover:bg-white/5 active:bg-white/8 transition-colors text-left"
                    >
                      <Icon className="w-5 h-5 shrink-0 text-text-secondary" />
                      <span className="flex-1 font-medium text-[15px] text-text-primary">{item.label}</span>
                      <IconChevronRight className="w-5 h-5 shrink-0 text-text-muted" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* Center: primary — full width of 1fr cell; cap line length on ultra-wide */}
        <div className="min-w-0 w-full max-w-full flex flex-col">
          <div className="w-full max-w-[min(100%,900px)] mx-auto space-y-6 lg:space-y-8 pb-40 md:pb-24 min-w-0 px-0 lg:px-2">
            {activeSection === 'profile' && (
              <Section id="profile" title={t('settings.profile')}>
                {profileLoading ? (
                  <p className="text-[14px] text-text-muted">{t('common.loading')}</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Avatar</label>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="w-20 h-20 rounded-full bg-canvas-tertiary flex items-center justify-center text-2xl font-bold text-text-muted border-2 border-dashed border-[rgba(255,255,255,0.12)] overflow-hidden shrink-0">
                          {avatarPreviewUrl ? (
                            <Image
                              src={avatarPreviewUrl}
                              alt=""
                              width={80}
                              height={80}
                              className="avatar-image h-full w-full"
                              unoptimized
                            />
                          ) : profile?.avatarUrl ? (
                            <Image
                              src={profile.avatarUrl}
                              alt=""
                              width={80}
                              height={80}
                              className="avatar-image h-full w-full"
                              unoptimized={!!(profile.avatarUrl?.startsWith('/uploads/') || profile.avatarUrl?.includes('://'))}
                            />
                          ) : (
                            (profile?.displayName || profile?.username || '?').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleAvatarChange}
                            aria-label="Upload profile photo"
                          />
                          <button
                            type="button"
                            disabled={avatarUploading}
                            onClick={() => fileInputRef.current?.click()}
                            className="btn-secondary text-[13px] min-h-[44px]"
                          >
                            {avatarUploading ? 'Uploading…' : 'Change Photo'}
                          </button>
                          <p className={helperClass}>JPG, PNG or WebP, max 20MB</p>
                          {avatarMessage && (
                            <p className={`text-[13px] mt-1 ${avatarMessage.type === 'success' ? 'text-green-500' : 'text-red-400'}`}>
                              {avatarMessage.text}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="displayName" className={labelClass}>Display Name</label>
                      <input
                        id="displayName"
                        type="text"
                        placeholder="Your display name"
                        className={inputClass}
                        value={profile?.displayName ?? ''}
                        onChange={(e) => setProfile((p) => (p ? { ...p, displayName: e.target.value || null } : null))}
                      />
                    </div>
                    <div>
                      <label htmlFor="username" className={labelClass}>Username</label>
                      <input
                        id="username"
                        type="text"
                        placeholder="@username"
                        className={inputClass}
                        value={profile?.username ?? ''}
                        readOnly
                      />
                      <p className={helperClass}>Used in profile URL. Letters, numbers, underscores.</p>
                    </div>
                    <div>
                      <label htmlFor="bio" className={labelClass}>Bio</label>
                      <textarea
                        id="bio"
                        rows={4}
                        placeholder="Tell the world about your talent..."
                        className={`${inputClass} min-h-[100px] py-3 resize-none`}
                        value={profile?.bio ?? ''}
                        onChange={(e) => setProfile((p) => (p ? { ...p, bio: e.target.value || null } : null))}
                        maxLength={500}
                      />
                      <p className={helperClass}>Max 500 characters. {(profile?.bio ?? '').length}/500</p>
                    </div>
                    <div>
                      <label htmlFor="country" className={labelClass}>Country / Nationality</label>
                      <CountrySelect
                        id="country"
                        value={profileCountry}
                        onChange={setProfileCountry}
                        placeholder="Select country"
                        aria-label="Country / Nationality"
                      />
                      <p className={helperClass}>Controls the flag shown beside your name across the platform.</p>
                    </div>
                    {profileSaveMessage && (
                      <p className={`text-[14px] ${profileSaveMessage.type === 'success' ? 'text-green-500' : 'text-red-400'}`}>
                        {profileSaveMessage.text}
                      </p>
                    )}
                    {profile && (
                      <div>
                        <label className={labelClass}>Share Profile</label>
                        <p className={helperClass}>Copy a share link for your BETALENT profile.</p>
                        <div className="mt-3">
                          <ShareButton
                            shareUrl={`/profile/${profile.username}`}
                            preview={{
                              creatorName: profile.displayName ?? profile.username,
                              title: `Check out ${profile.displayName ?? profile.username} on BETALENT`,
                            }}
                            trackResource={{ resourceType: 'profile', resourceId: profile.username }}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className={labelClass}>Accessibility</label>
                      <p className={helperClass}>
                        System and browser accessibility settings apply. No extra playback or motion controls are stored here
                        yet.
                      </p>
                    </div>
                  </div>
                )}
              </Section>
            )}

            {activeSection === 'account' && (
              <Section id="account" title={t('settings.account')}>
                <div id="security" className="sr-only" />
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className={labelClass}>Email</label>
                    <input id="email" type="email" className={inputClass} value={accountEmail} readOnly />
                  </div>
                  <div>
                    <label className={labelClass}>Change Password</label>
                    <div className="space-y-3">
                      <input
                        id="currentPassword"
                        type="password"
                        placeholder="Current password"
                        className={inputClass}
                        value={passwordCurrent}
                        onChange={(e) => setPasswordCurrent(e.target.value)}
                        autoComplete="current-password"
                      />
                      <input
                        id="newPassword"
                        type="password"
                        placeholder="New password"
                        className={inputClass}
                        value={passwordNew}
                        onChange={(e) => setPasswordNew(e.target.value)}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="btn-primary min-h-[44px]"
                        disabled={passwordSaving}
                        onClick={() => handlePasswordChange()}
                      >
                        {passwordSaving ? 'Updating…' : 'Update Password'}
                      </button>
                      {passwordMessage && (
                        <p className={`text-[14px] ${passwordMessage.type === 'success' ? 'text-green-500' : 'text-red-400'}`}>
                          {passwordMessage.text}
                        </p>
                      )}
                      <p className={helperClass}>
                        At least 8 characters with uppercase, lowercase, a number, and a symbol. Your current password is required.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Email ownership</label>
                    <div className="flex items-center gap-3 p-4 rounded-[12px] bg-canvas-tertiary/50 border border-[rgba(255,255,255,0.08)]">
                      <IconShieldCheck className={`w-5 h-5 ${emailOwnershipVerified ? 'text-green-500' : 'text-amber-500'}`} />
                      <div>
                        <span className="text-[14px] text-text-primary block">
                          {emailOwnershipVerified
                            ? 'Email confirmed — you can receive mail at this address.'
                            : 'Email not verified yet — check your inbox or resend from the verification screen.'}
                        </span>
                        <p className="text-[12px] text-text-muted mt-1 leading-relaxed">
                          This confirms inbox access only. It is not the same as creator or legal identity verification.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Two-factor authentication (TOTP)</label>
                    <p className="text-[13px] text-text-secondary mb-2">
                      Add a second step at sign-in with an authenticator app (Google Authenticator, 1Password, etc.). Separate
                      from email verification — this protects your account if your password leaks.
                    </p>
                    {totpMessage && (
                      <p className={`text-[14px] mb-2 ${totpMessage.type === 'success' ? 'text-green-500' : 'text-red-400'}`}>
                        {totpMessage.text}
                      </p>
                    )}
                    {!emailOwnershipVerified && (
                      <p className="text-[13px] text-amber-500/90">Verify your email before you can enable two-factor.</p>
                    )}
                    {emailOwnershipVerified && !twoFactorEnabled && !totpSetupSecret && (
                      <button type="button" className="btn-secondary min-h-[44px]" disabled={totpBusy} onClick={() => startTotpSetup()}>
                        {totpBusy ? 'Preparing…' : 'Set up authenticator'}
                      </button>
                    )}
                    {emailOwnershipVerified && !twoFactorEnabled && totpSetupSecret && totpOtpauthUrl && (
                      <div className="space-y-3 mt-2 p-4 rounded-[12px] bg-canvas-tertiary/40 border border-[rgba(255,255,255,0.08)]">
                        <p className="text-[13px] text-text-secondary">
                          Scan the QR in your app, or enter this key manually (spaces optional):
                        </p>
                        <code className="block text-[12px] break-all text-accent p-2 rounded bg-black/30">{totpSetupSecret}</code>
                        <a
                          href={totpOtpauthUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[13px] text-accent hover:underline"
                        >
                          Open otpauth link
                        </a>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          placeholder="6-digit code"
                          className={inputClass}
                          value={totpEnableCode}
                          onChange={(e) => setTotpEnableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          autoComplete="one-time-code"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="btn-primary min-h-[44px]" disabled={totpBusy} onClick={() => confirmTotpEnable()}>
                            Confirm and enable
                          </button>
                          <button
                            type="button"
                            className="btn-secondary min-h-[44px]"
                            disabled={totpBusy}
                            onClick={() => {
                              setTotpSetupSecret(null);
                              setTotpOtpauthUrl(null);
                              setTotpEnableCode('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {emailOwnershipVerified && twoFactorEnabled && (
                      <div className="space-y-3 mt-2 p-4 rounded-[12px] bg-canvas-tertiary/40 border border-[rgba(255,255,255,0.08)]">
                        <p className="text-[14px] text-text-primary font-medium">Authenticator is on</p>
                        <p className="text-[12px] text-text-muted">
                          To turn it off, enter your account password and a current code from your app.
                        </p>
                        <input
                          type="password"
                          placeholder="Account password"
                          className={inputClass}
                          value={totpDisablePassword}
                          onChange={(e) => setTotpDisablePassword(e.target.value)}
                          autoComplete="current-password"
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="6-digit code"
                          className={inputClass}
                          value={totpDisableCode}
                          onChange={(e) => setTotpDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          autoComplete="one-time-code"
                        />
                        <button type="button" className="btn-secondary min-h-[44px]" disabled={totpBusy} onClick={() => disableTotpFlow()}>
                          {totpBusy ? 'Working…' : 'Turn off two-factor'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Section>
            )}

            {activeSection === 'verification' && (
              <Section id="verification" title={t('settings.verification')}>
                {verificationLoading ? (
                  <p className="text-[14px] text-text-muted">{t('common.loading')}</p>
                ) : (
                  <div className="space-y-4">
                    {verification && (
                      <div className="rounded-[12px] p-4 bg-canvas-tertiary/50 border border-[rgba(255,255,255,0.08)]">
                        <p className="text-[13px] font-semibold text-text-primary mb-1">Status</p>
                        <p className="text-[14px] text-text-secondary">
                          {verification.verificationStatus === 'APPROVED' && (
                            <>Verified · {CREATOR_VERIFICATION_LABELS[verification.verificationLevel as keyof typeof CREATOR_VERIFICATION_LABELS] ?? verification.verificationLevel}</>
                          )}
                          {verification.verificationStatus === 'PENDING' && 'Pending review. We’ll notify you once your request has been reviewed.'}
                          {verification.verificationStatus === 'REJECTED' && (verification.rejectionReason ? `Rejected: ${verification.rejectionReason}` : 'Rejected. You can submit a new request with more info below.')}
                          {verification.verificationStatus === 'REVOKED' && (verification.rejectionReason ? `Revoked: ${verification.rejectionReason}` : 'Verification was revoked.')}
                          {!['APPROVED', 'PENDING', 'REJECTED', 'REVOKED'].includes(verification.verificationStatus) && 'Request verification to get a trust badge and increased credibility.'}
                        </p>
                      </div>
                    )}
                    {(!verification || verification.verificationStatus !== 'APPROVED') && (
                      <form onSubmit={handleVerificationSubmit} className="space-y-4">
                        <p className="text-[13px] text-text-secondary">Submit links and optional notes to help us verify your identity and presence. Moderators will review your request.</p>
                        <div>
                          <label htmlFor="verification-social" className={labelClass}>Social profile links</label>
                          <textarea
                            id="verification-social"
                            rows={2}
                            placeholder="https://instagram.com/you&#10;https://twitter.com/you"
                            className={`${inputClass} min-h-[60px] py-3 resize-none`}
                            value={verificationForm.socialLinks}
                            onChange={(e) => setVerificationForm((f) => ({ ...f, socialLinks: e.target.value }))}
                          />
                          <p className={helperClass}>One URL per line. Instagram, Twitter/X, TikTok, etc.</p>
                        </div>
                        <div>
                          <label htmlFor="verification-portfolio" className={labelClass}>Portfolio or website links</label>
                          <textarea
                            id="verification-portfolio"
                            rows={2}
                            placeholder="https://yourportfolio.com"
                            className={`${inputClass} min-h-[60px] py-3 resize-none`}
                            value={verificationForm.portfolioLinks}
                            onChange={(e) => setVerificationForm((f) => ({ ...f, portfolioLinks: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label htmlFor="verification-music" className={labelClass}>Music platform links</label>
                          <textarea
                            id="verification-music"
                            rows={2}
                            placeholder="https://spotify.com/artist/you&#10;https://soundcloud.com/you"
                            className={`${inputClass} min-h-[60px] py-3 resize-none`}
                            value={verificationForm.musicPlatformLinks}
                            onChange={(e) => setVerificationForm((f) => ({ ...f, musicPlatformLinks: e.target.value }))}
                          />
                          <p className={helperClass}>Spotify, SoundCloud, Apple Music, etc.</p>
                        </div>
                        <div>
                          <label htmlFor="verification-notes" className={labelClass}>Additional notes (optional)</label>
                          <textarea
                            id="verification-notes"
                            rows={3}
                            placeholder="Anything that helps us verify your identity or presence..."
                            className={`${inputClass} min-h-[80px] py-3 resize-none`}
                            value={verificationForm.notes}
                            onChange={(e) => setVerificationForm((f) => ({ ...f, notes: e.target.value }))}
                            maxLength={2000}
                          />
                          <p className={helperClass}>Max 2,000 characters.</p>
                        </div>
                        <button type="submit" disabled={verificationSubmitLoading} className="btn-primary min-h-[44px]">
                          {verificationSubmitLoading ? 'Submitting…' : verification?.verificationStatus === 'PENDING' ? 'Update request' : 'Request verification'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </Section>
            )}

            {activeSection === 'privacy' && (
              <Section id="privacy" title={t('settings.privacy')}>
                <div className="space-y-4">
                  {preferencesMessage && (
                    <p
                      className={`text-[13px] rounded-[12px] px-3 py-2 ${
                        preferencesMessage.type === 'error'
                          ? 'bg-red-500/15 text-red-200 border border-red-500/25'
                          : 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/20'
                      }`}
                      role="status"
                    >
                      {preferencesMessage.text}
                    </p>
                  )}
                  <p className="text-[12px] text-text-muted leading-relaxed">
                    These settings are stored on your account and enforced on profile, video pages, feeds, votes, new uploads
                    (default comments), and your notification list.
                  </p>
                  <div>
                    <label className={labelClass}>Profile visibility</label>
                    <select
                      className={inputClass}
                      value={privacySettings.profileVisibility}
                      onChange={(e) => {
                        const v = e.target.value as PrivacySettings['profileVisibility'];
                        setPrivacySettings((p) => ({ ...p, profileVisibility: v }));
                        void patchPreferences({ profileVisibility: v });
                      }}
                    >
                      <option value="PUBLIC">Public — anyone signed in can open your profile</option>
                      <option value="FOLLOWERS_ONLY">Followers only — others see “not found”</option>
                      <option value="PRIVATE">Private — only you (and your videos stay off public feeds)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Default comment permission (new uploads)</label>
                    <select
                      className={inputClass}
                      value={privacySettings.defaultCommentPermission}
                      onChange={(e) => {
                        const v = e.target.value as PrivacySettings['defaultCommentPermission'];
                        setPrivacySettings((p) => ({ ...p, defaultCommentPermission: v }));
                        void patchPreferences({ defaultCommentPermission: v });
                      }}
                    >
                      <option value="EVERYONE">Everyone (signed in)</option>
                      <option value="FOLLOWERS">Followers of you only</option>
                      <option value="FOLLOWING">People you follow only</option>
                      <option value="OFF">Off</option>
                    </select>
                    <p className={helperClass}>
                      You can still change comments per video after publish (video menu).
                    </p>
                  </div>
                  <div>
                    <label className={labelClass}>Talent votes & super-votes</label>
                    <label className="flex items-center justify-between p-3 rounded-[12px] bg-canvas-tertiary/50 cursor-pointer">
                      <span className="text-[14px] text-text-primary">Allow votes on your performances</span>
                      <input
                        type="checkbox"
                        checked={privacySettings.allowVotesOnPerformances}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setPrivacySettings((p) => ({ ...p, allowVotesOnPerformances: checked }));
                          void patchPreferences({ allowVotesOnPerformances: checked });
                        }}
                        className="rounded"
                      />
                    </label>
                    <p className={helperClass}>When off, others cannot cast 1–10 talent votes or super-votes on your videos.</p>
                  </div>
                </div>
              </Section>
            )}

            {activeSection === 'notifications' && (
              <Section id="notifications" title={t('settings.notifications')}>
                <div className="space-y-4">
                  {preferencesMessage && (
                    <p
                      className={`text-[13px] rounded-[12px] px-3 py-2 ${
                        preferencesMessage.type === 'error'
                          ? 'bg-red-500/15 text-red-200 border border-red-500/25'
                          : 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/20'
                      }`}
                      role="status"
                    >
                      {preferencesMessage.text}
                    </p>
                  )}
                  <div className="rounded-[20px] p-4 bg-canvas-tertiary/35 border border-[rgba(255,255,255,0.06)]">
                    <p className="font-display text-[16px] font-semibold text-text-primary mb-1">Activity Center</p>
                    <p className="text-[12px] text-text-muted">
                      In-app notification history. Categories below filter what appears in this list (and the bell).
                    </p>

                    {notificationsLoading ? (
                      <p className="text-[14px] text-text-muted mt-4">Loading…</p>
                    ) : notificationsError ? (
                      <p className="text-[14px] text-red-400 mt-4">{notificationsError}</p>
                    ) : (
                      <div className="mt-4 space-y-3 max-h-[260px] overflow-y-auto pr-1">
                        {notifications.length === 0 ? (
                          <p className="text-[14px] text-text-muted">No notifications right now.</p>
                        ) : (
                          notifications
                            .slice(0, 20)
                            .map((n) => (
                              <a key={n.id} href={n.href} className="block p-3 rounded-[14px] hover:bg-white/5 transition-colors">
                                <p className="text-[14px] font-medium text-text-primary">{n.message}</p>
                                <p className="text-[12px] text-text-muted mt-1">{n.timestamp}</p>
                              </a>
                            ))
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {(
                      [
                        {
                          id: 'challenges' as const,
                          label: 'Challenges',
                          desc: 'Placements, star ratings on your entries, and challenge results',
                        },
                        { id: 'votes' as const, label: 'Likes', desc: 'Likes on your performances' },
                        { id: 'gifts' as const, label: 'Gifts', desc: 'Coin gifts on your performances' },
                        { id: 'followers' as const, label: 'New followers', desc: 'When someone follows you' },
                        { id: 'comments' as const, label: 'Comments', desc: 'Comments, replies, and mentions' },
                        { id: 'announcements' as const, label: 'Announcements', desc: 'Product and account announcements' },
                      ] as const
                    ).map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center justify-between p-4 rounded-[12px] bg-canvas-tertiary/50 cursor-pointer hover:bg-canvas-tertiary/70"
                      >
                        <div>
                          <span className="text-[14px] font-medium text-text-primary block">{item.label}</span>
                          <span className="text-[12px] text-text-secondary">{item.desc}</span>
                        </div>
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={notificationsPrefs[item.id]}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setNotificationsPrefs((p) => ({ ...p, [item.id]: checked }));
                            const apiKey = NOTIFY_API_KEY[item.id];
                            void patchPreferences({ [apiKey]: checked });
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </Section>
            )}

            {activeSection === 'creator' && (
              <Section id="creator" title={t('settings.creator')}>
                <div className="space-y-4">
                  <p className="text-[14px] text-text-secondary leading-relaxed">
                    Genre tags, challenge-interest filters, and discover-creators opt-in are not stored on the server in this
                    build — there are no controls here so the UI does not imply fake persistence. Use uploads and the
                    challenges arena for real creator actions.
                  </p>
                </div>
              </Section>
            )}

            {activeSection === 'language' && (
              <Section id="language" title={t('settings.languageAndRegion')}>
                <div id="playback" className="sr-only" />
                <div className="space-y-6">
                  <div className="flex flex-col gap-3">
                    <label htmlFor="lang" className={labelClass}>{t('settings.language')}</label>
                    {localeLoading ? (
                      <p className="text-[14px] text-text-muted">{t('common.loading')}</p>
                    ) : (
                      <>
                        <select
                          id="lang"
                          className="h-12 pl-4 pr-10 min-w-[160px] max-w-[220px] rounded-[12px] bg-canvas-tertiary border border-[rgba(255,255,255,0.08)] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 appearance-none cursor-pointer bg-no-repeat bg-[length:12px] bg-[right_12px_center] text-[15px]"
                          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")" }}
                          value={preferredLocale}
                          onChange={(e) => handleLocaleChange(e.target.value as SupportedLocale)}
                          aria-label={t('settings.language')}
                        >
                          {SUPPORTED_LOCALES.map((code) => (
                            <option key={code} value={code}>
                              {LOCALE_LABELS[code]}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Playback</label>
                    <p className={helperClass}>Coming soon. We will add autoplay / quality / data-saver controls.</p>
                    <button
                      type="button"
                      className="btn-secondary w-full opacity-70 cursor-not-allowed"
                      disabled
                    >
                      Not available yet
                    </button>
                  </div>

                  <div>
                    <label className={labelClass}>Display</label>
                    <p className={helperClass}>Coming soon. We will add visual options and layout preferences.</p>
                    <button
                      type="button"
                      className="btn-secondary w-full opacity-70 cursor-not-allowed"
                      disabled
                    >
                      Not available yet
                    </button>
                  </div>
                  <div>
                    <label htmlFor="region" className={labelClass}>{t('settings.regionCountry')}</label>
                    <CountrySelect
                      id="region"
                      value={regionCountry}
                      onChange={setRegionCountry}
                      placeholder="Select country"
                      aria-label={t('settings.regionCountry')}
                    />
                    <p className={helperClass}>{t('settings.regionHelper')}</p>
                    {languageSaveMessage && (
                      <p className={`text-[14px] ${languageSaveMessage.type === 'success' ? 'text-green-500' : 'text-red-400'} mt-2`}>
                        {languageSaveMessage.text}
                      </p>
                    )}
                  </div>
                </div>
              </Section>
            )}
          </div>

          {/* Sticky Save — desktop: aligns with center column (900px cap), same grid as page */}
          {shouldShowStickySave && (
            <div
              className="fixed bottom-0 left-0 right-0 z-40 hidden lg:block border-t border-[rgba(255,255,255,0.08)]"
              style={{
                background: 'rgba(13,13,14,0.95)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className="mobile-page-column mx-auto w-full max-w-[1600px] py-4 grid lg:grid-cols-[260px_minmax(0,1fr)] xl-screen:grid-cols-[260px_minmax(0,1fr)_320px] gap-6 items-center min-w-0">
                <div className="min-w-0" aria-hidden />
                <div className="min-w-0 flex justify-end">
                  <div className="w-full max-w-[min(100%,900px)] ml-auto flex justify-end">
                    <button type="button" className="btn-primary" onClick={handleSaveClick} disabled={stickyDisabled}>
                      {stickyDisabled ? 'Saving…' : t('settings.saveChanges')}
                    </button>
                  </div>
                </div>
                <div className="min-w-0 hidden xl-screen:block" aria-hidden />
              </div>
            </div>
          )}

          {/* Sticky save — tablet & mobile (< lg): full width; desktop uses grid bar above */}
          {shouldShowStickySave && (
            <div
              className="fixed left-0 right-0 z-40 py-4 px-4 lg:hidden"
              style={{
                bottom: 'calc(68px + env(safe-area-inset-bottom))',
                background: 'rgba(13,13,14,0.95)',
                backdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="mobile-page-column mx-auto w-full max-w-[min(100%,900px)] px-0">
                <button type="button" className="w-full btn-primary min-h-[48px]" onClick={handleSaveClick} disabled={stickyDisabled}>
                  {stickyDisabled ? 'Saving…' : t('settings.saveChanges')}
                </button>
              </div>
            </div>
          )}

          {comingSoon && (
            <div
              className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="coming-soon-title"
              onClick={() => setComingSoon(null)}
            >
              <div
                className="w-full max-w-[520px] rounded-[24px] border border-[rgba(255,255,255,0.08)] p-6"
                style={{ background: 'rgba(26,26,28,0.98)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 id="coming-soon-title" className="font-display text-[20px] font-semibold text-text-primary">
                      {comingSoon.title}
                    </h3>
                    <p className="text-[14px] text-text-muted mt-2">{comingSoon.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setComingSoon(null)}
                    className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-[14px] flex items-center justify-center text-text-secondary hover:bg-white/5 transition-colors"
                    aria-label="Close"
                  >
                    X
                  </button>
                </div>

                <div className="mt-6">
                  <button type="button" className="btn-primary w-full min-h-[48px]" onClick={() => setComingSoon(null)}>
                    Got it
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Version label */}
          <p className="text-[12px] text-text-muted text-center py-8 mt-4 max-w-[min(100%,900px)] mx-auto w-full">
            BETALENT v0.1.0
          </p>
        </div>

        {/* Right: tips rail — only when viewport wide enough (xl-screen 1400+); else 2-col nav|main */}
        <aside
          className="hidden xl-screen:block min-w-0 w-full max-w-[320px] justify-self-stretch opacity-[0.9] xl-screen:sticky xl-screen:top-4 xl-screen:max-h-[calc(100vh-2rem)] xl-screen:overflow-y-auto xl-screen:pl-1"
          aria-label="Settings tips and links"
        >
          <SettingsRightAside />
        </aside>
      </div>
    </div>
    </>
  );
}
