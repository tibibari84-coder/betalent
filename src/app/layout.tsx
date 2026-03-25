import type { Metadata } from 'next';
import { headers, cookies } from 'next/headers';
import { Playfair_Display } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
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
  /** Full app chrome: signed in + email verified + not mid–2FA. Unverified users keep public shell until they confirm email. */
  const isAppMember = Boolean(
    session?.user && !session.pending2FAUserId && session.user.emailVerified
  );
  const headersList = await headers();
  const cookieStore = await cookies();
  const acceptLanguage = headersList.get('accept-language');
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value ?? null;
  // Priority: 1. user saved preferredLanguage  2. browser (cookie / Accept-Language)  3. English
  const locale: SupportedLocale = resolveLocale(session?.user?.locale, acceptLanguage, cookieLocale);

  return (
    <html lang={locale}>
      <body className={`${playfair.variable} min-h-screen flex flex-col bg-[#070707] text-[#f5f5f5] antialiased font-sans`}>
        <I18nLayoutWrapper initialLocale={locale} allMessages={allMessages}>
          <AuthAwareShell isAppMember={isAppMember}>{children}</AuthAwareShell>
        </I18nLayoutWrapper>
      </body>
    </html>
  );
}
