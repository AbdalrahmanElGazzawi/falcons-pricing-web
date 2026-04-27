import './globals.css';
import type { Metadata } from 'next';
import { ToastProvider } from '@/components/Toast';
import { LocaleProvider } from '@/lib/i18n/Locale';
import { ThemeProvider, type Theme } from '@/lib/theme/Theme';
import { CurrencyProvider, type DisplayCurrency } from '@/lib/currency/Currency';
import { cookies } from 'next/headers';
import type { Locale } from '@/lib/i18n/dict';

export const metadata: Metadata = {
  title: 'Team Falcons — Pricing OS',
  description: 'Internal talent pricing engine',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B2340',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Read cookie on the server so the first paint matches the user's choice
  const initialLocale: Locale =
    (cookies().get('falcons_locale')?.value as Locale) === 'ar' ? 'ar' : 'en';
  const dir: 'ltr' | 'rtl' = initialLocale === 'ar' ? 'rtl' : 'ltr';
  const initialTheme: Theme =
    (cookies().get('falcons_theme')?.value as Theme) === 'dark' ? 'dark' : 'light';

  // Currency cookie — read so SSR matches client choice
  const ccyCookie = cookies().get('falcons_ccy')?.value;
  const initialCurrency: DisplayCurrency = ccyCookie === 'USD' ? 'USD' : 'SAR';

  return (
    <html lang={initialLocale} dir={dir} data-theme={initialTheme}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg text-ink antialiased">
        <ThemeProvider initial={initialTheme}>
          <LocaleProvider initial={initialLocale}>
            <CurrencyProvider initialCurrency={initialCurrency}>
              <ToastProvider>{children}</ToastProvider>
            </CurrencyProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
