'use client';

export type RouteShellClass =
  | 'publicAuth'
  | 'publicMarketingLegal'
  | 'primaryApp'
  | 'detailSecondary'
  | 'unclassified';

type Matcher = (pathname: string) => boolean;

const exact = (value: string): Matcher => (pathname) => pathname === value;
const starts = (prefix: string): Matcher => (pathname) => pathname.startsWith(prefix);

const PUBLIC_AUTH_MATCHERS: Matcher[] = [
  exact('/welcome'),
  exact('/login'),
  exact('/register'),
  starts('/login/'),
  exact('/verify-email'),
  starts('/verify-email'),
  exact('/forgot-password'),
  starts('/forgot-password'),
  exact('/reset-password'),
  starts('/reset-password'),
];

const PUBLIC_MARKETING_LEGAL_MATCHERS: Matcher[] = [
  exact('/'),
  exact('/landing'),
  exact('/terms'),
  exact('/privacy'),
  exact('/refund'),
  exact('/contact'),
];

const PRIMARY_APP_MATCHERS: Matcher[] = [
  exact('/feed'),
  starts('/feed/'),
  exact('/foryou'),
  starts('/foryou/'),
  exact('/explore'),
  starts('/explore/'),
  exact('/challenges'),
  starts('/challenges/'),
  exact('/leaderboard'),
  starts('/leaderboard/'),
  exact('/profile'),
  starts('/profile/'),
  exact('/inbox'),
  starts('/inbox/'),
  exact('/messages'),
  starts('/messages/'),
  exact('/wallet'),
  exact('/following'),
  starts('/following/'),
  exact('/creator'),
  starts('/creator/'),
  exact('/dashboard'),
  starts('/dashboard/'),
  exact('/my-videos'),
  starts('/my-videos/'),
  exact('/notifications'),
  starts('/notifications/'),
];

const DETAIL_SECONDARY_MATCHERS: Matcher[] = [
  exact('/settings'),
  starts('/settings/'),
  exact('/upload'),
  starts('/wallet/'),
  starts('/upload/'),
  exact('/studio'),
  starts('/studio/'),
  exact('/profile/edit'),
  starts('/profile/edit/'),
];

function anyMatch(pathname: string, matchers: Matcher[]): boolean {
  return matchers.some((m) => m(pathname));
}

export function classifyRouteShell(pathname: string | null): RouteShellClass {
  const path = pathname ?? '';
  if (anyMatch(path, PUBLIC_AUTH_MATCHERS)) return 'publicAuth';
  if (anyMatch(path, PUBLIC_MARKETING_LEGAL_MATCHERS)) return 'publicMarketingLegal';
  if (anyMatch(path, DETAIL_SECONDARY_MATCHERS)) return 'detailSecondary';
  if (anyMatch(path, PRIMARY_APP_MATCHERS)) return 'primaryApp';
  return 'unclassified';
}

export function isAuthenticatedRouteClass(routeClass: RouteShellClass): boolean {
  return routeClass === 'primaryApp' || routeClass === 'detailSecondary';
}

