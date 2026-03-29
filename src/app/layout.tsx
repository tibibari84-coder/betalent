import type { Metadata, Viewport } from 'next';
import { headers, cookies } from 'next/headers';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});
import { AuthAwareShell } from '@/components/layout/AuthAwareShell';
import { I18nLayoutWrapper } from '@/components/layout/I18nLayoutWrapper';
import { getSession } from '@/lib/session';
import { resolveLocale, LOCALE_COOKIE_NAME } from '@/lib/locale';
import type { SupportedLocale } from '@/lib/validations';
import en from '@/i18n/translations/en.json';
import es from '@/i18n/translations/es.json';
import fr from '@/i18n/translations/fr.json';
import hu from '@/i18n/translations/hu.json';

export const metadata: Metadata = {
  title: 'BETALENT – Show the World Your Talent',
  description: 'Global digital talent stage',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const allMessages = {
  en: en as Record<string, string>,
  es: es as Record<string, string>,
  fr: fr as Record<string, string>,
  hu: hu as Record<string, string>,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let session: Awaited<ReturnType<typeof getSession>> | null = null;
  try {
    session = await getSession();
  } catch (err) {
    console.error('[RootLayout] getSession failed:', err instanceof Error ? err.message : err);
  }
  /** Full app chrome: signed in and not mid–2FA. */
  const isAppMember = Boolean(
    session?.user && !session.pending2FAUserId
  );
  const authUser = session?.user
    ? {
        username: session.user.username,
        email: session.user.email,
      }
    : null;
  const headersList = await headers();
  const cookieStore = await cookies();
  const acceptLanguage = headersList.get('accept-language');
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value ?? null;
  // Priority: 1. user saved preferredLanguage  2. browser (cookie / Accept-Language)  3. English
  const locale: SupportedLocale = resolveLocale(session?.user?.locale, acceptLanguage, cookieLocale);

  return (
    <html lang={locale}>
      <body
        className={`${playfair.variable} ${inter.variable} min-h-screen flex flex-col bg-[#070707] text-[#f5f5f5] antialiased font-sans`}
      >
        <I18nLayoutWrapper initialLocale={locale} allMessages={allMessages}>
          <AuthAwareShell isAppMember={isAppMember} authUser={authUser}>
            {children}
          </AuthAwareShell>
        </I18nLayoutWrapper>
      </body>
    </html>
  );
}
