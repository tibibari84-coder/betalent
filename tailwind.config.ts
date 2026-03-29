import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        tablet: '768px',
        'col-2': '900px',
        laptop: '1000px',
        desktop: '1200px', /* shell/nav horizontal gap widens (see RootShell lg:gap-x-6 desktop:gap-x-8) */
        'xl-screen': '1400px',
        ultrawide: '1800px', /* 21:9 / 1440p+ content width */
        '5k': '2400px',      /* ultra-wide / 5K: extra columns so cards don’t over-scale */
      },
      colors: {
        canvas: {
          page: '#070707',
          secondary: '#120909',
          tertiary: '#1a0b0b',
          quaternary: '#220e0e',
        },
        glass: 'rgba(15,15,15,0.6)',
        border: 'rgba(255,255,255,0.06)',
        accent: {
          DEFAULT: '#c4122f',
          secondary: '#a00f26',
          hover: '#e11d48',
          glow: 'rgba(196,18,47,0.2)',
        },
        gold: '#d4af37',
        text: {
          primary: '#f5f5f5',
          secondary: '#9ca3af',
          muted: '#6b7280',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-playfair-display)', 'var(--font-playfair)', 'serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'hero-title': ['2rem', { lineHeight: '1.2', fontWeight: '700' }],
        'page-title': ['clamp(1.75rem, 2vw, 2.25rem)', { lineHeight: '1.22', fontWeight: '700' }],
        'section-title': ['clamp(1.25rem, 1.6vw, 1.875rem)', { lineHeight: '1.2', fontWeight: '600' }],
        'card-title': ['clamp(1rem, 1.1vw, 1.125rem)', { lineHeight: '1.44', fontWeight: '600' }],
        'card-title-lg': ['1.125rem', { lineHeight: '1.44', fontWeight: '600' }],
        body: ['0.9375rem', { lineHeight: '1.5', fontWeight: '400' }],
        meta: ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
        'btn-text': ['0.875rem', { lineHeight: '1.4', fontWeight: '600' }],
      },
      spacing: {
        '18': '18px',
        '26': '26px',
        'shell-pad-sm': '16px',
        'shell-pad-md': '20px',
        'shell-pad-lg': '24px',
        'shell-pad-xl': '32px',
      },
      maxWidth: {
        /* Align with globals.css --shell-max-width (sidebar + main + right rail cap) */
        shell: 'min(100%, 1950px)',
        'layout-content': '1360px',
      },
      width: {
        'sidebar-laptop': '208px',
        'sidebar-desktop': '216px',
        'sidebar-xl': '232px',
        'rail': '280px',
        'rail-xl': '300px',
      },
      minHeight: {
        nav: '64px',
        'nav-desktop': '68px',
        'nav-xl': '72px',
        'nav-mobile': '60px',
        'btn-primary': '42px',
        'btn-primary-lg': '44px',
        'btn-secondary': '38px',
        'btn-secondary-lg': '40px',
        'icon-btn': '40px',
      },
      boxShadow: {
        glass: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(196,18,47,0.05)',
        'glass-sm': '0 20px 50px rgba(0,0,0,0.6)',
        'btn-primary': '0 10px 30px rgba(196,18,47,0.5)',
        'card-hover': '0 20px 60px rgba(0,0,0,0.6)',
      },
      borderRadius: {
        panel: '24px',
        card: '18px',
        'btn-primary': '12px',
        'btn-secondary': '10px',
        'icon-btn': '10px',
      },
      minWidth: {
        'btn-primary': '132px',
        'btn-secondary': '110px',
        'card-discovery': '220px',
        'card-premium': '240px',
      },
      keyframes: {
        'studio-enter': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'studio-pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'studio-curtain': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'studio-breathe': {
          '0%, 100%': { opacity: '0.35', transform: 'translateY(0)' },
          '50%': { opacity: '0.65', transform: 'translateY(-4px)' },
        },
      },
      animation: {
        'studio-enter': 'studio-enter 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'studio-pulse-dot': 'studio-pulse-dot 1.6s ease-in-out infinite',
        'studio-curtain': 'studio-curtain 0.55s ease-out both',
        'studio-breathe': 'studio-breathe 2.8s ease-in-out infinite',
      },
      gridTemplateColumns: {
        'card-discovery': 'repeat(1, minmax(0, 1fr))',
        'card-discovery-md': 'repeat(2, minmax(0, 1fr))',
        'card-discovery-laptop': 'repeat(3, minmax(0, 1fr))',
        'card-discovery-desktop': 'repeat(4, minmax(0, 1fr))',
        'card-discovery-xl': 'repeat(4, minmax(0, 1fr))',
        'card-discovery-ultrawide': 'repeat(5, minmax(0, 1fr))',
        'card-discovery-5k': 'repeat(6, minmax(0, 1fr))',
        'card-featured': 'repeat(1, minmax(0, 1fr))',
        'card-featured-md': 'repeat(2, minmax(0, 1fr))',
        'card-featured-laptop': 'repeat(3, minmax(0, 1fr))',
        'card-featured-desktop': 'repeat(4, minmax(0, 1fr))',
        'card-featured-xl': 'repeat(4, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
};

export default config;
