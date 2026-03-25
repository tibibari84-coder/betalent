import { SVGProps } from 'react';

/** Strip size overrides that would make icons full-screen; then apply default size so icons never blow up (avoids "big blue icon" in layout). */
function iconClassName(className: string = '', defaultSize: string = 'w-5 h-5'): string {
  const stripped = className
    .replace(/\b(w-full|h-full|w-screen|h-screen|min-w-full|min-h-full)\b/g, '')
    .trim();
  return `${defaultSize} shrink-0 max-w-[72px] max-h-[72px] ${stripped}`.trim();
}

export function IconMenu({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

export function IconSearch({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className, 'w-4 h-4')} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

export function IconBell({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

export function IconCoins({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75m15.75 0h.75.75a.75.75 0 00.75-.75V15m-1.5 1.5v.75a.75.75 0 01-.75.75h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

export function IconUser({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

export function IconCompass({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

export function IconTrendingUp({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}

export function IconTrendingDown({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
    </svg>
  );
}

export function IconUpload({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

export function IconLayoutGrid({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

export function IconRadio({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
    </svg>
  );
}

export function IconAward({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
    </svg>
  );
}

export function IconUsers({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}

export function IconSettings({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export function IconTrophy({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className, 'w-6 h-6')} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
    </svg>
  );
}

/** Premium gift box with bow — feltűnőbb, támogatást jelképező ikon */
export function IconGift({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className, 'w-6 h-6')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* Box */}
      <rect x="3" y="9" width="18" height="12" rx="1.5" />
      {/* Vertical ribbon */}
      <path d="M12 9v12" />
      {/* Horizontal ribbon */}
      <path d="M3 14.5h18" />
      {/* Bow — left loop */}
      <path d="M12 9c-1.5 0-3 1.2-3 2.8 0 1 .8 1.7 2 2.2" />
      {/* Bow — right loop */}
      <path d="M12 9c1.5 0 3 1.2 3 2.8 0 1-.8 1.7-2 2.2" />
      {/* Bow center — filled dot for emphasis */}
      <circle cx="12" cy="6.8" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconMic2({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className, 'w-6 h-6')} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  );
}

export function IconHeart({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

export function IconEye({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export function IconEyeOff({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  );
}

export function IconComment({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
    </svg>
  );
}

export function IconStar({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

export function IconShare({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  );
}

export function IconPlus({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

export function IconPlay({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="currentColor" viewBox="0 0 24 24" strokeWidth={0} {...props}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function IconSparkles({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

export function IconShieldCheck({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

export function IconX({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function IconPaperAirplane({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

export function IconDotsVertical({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  );
}

export function IconClipboard({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  );
}

export function IconCheck({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function IconPause({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );
}

export function IconVolumeUp({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  );
}

export function IconVolumeMute({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
  );
}

export function IconArrowsExpand({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
  );
}

export function IconChevronRight({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className, 'w-5 h-5')} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

export function IconArrowLeft({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

export function IconInbox({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.424l.256 1.912a2.25 2.25 0 002.013 1.424h3.218a2.25 2.25 0 002.013-1.424l.256-1.912a2.25 2.25 0 012.013-1.424h3.86m-19.5 0V2.25m0 13.5V19.5m0-13.5h-3.86a2.25 2.25 0 00-2.013 1.424l-.256 1.912a2.25 2.25 0 01-2.013 1.424H2.25m6.318 0V2.25m0 13.5V19.5m0 0v-6.75m0 6.75h-3.86a2.25 2.25 0 01-2.013-1.424L2.25 14.076a2.25 2.25 0 00-2.013-1.424H2.25" />
    </svg>
  );
}

/** Direct messages — refined message-square outline (matches bell / trophy stroke weight). */
export function IconChat({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 8.25h9M7.5 12h5.25M6.75 4.75h10.5a2 2 0 012 2v6.5a2 2 0 01-2 2h-3.19l-3.56 2.25V17.25H6.75a2 2 0 01-2-2v-6.5a2 2 0 012-2z"
      />
    </svg>
  );
}

export function IconQuestionMarkCircle({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  );
}

export function IconDocumentText({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.25a3.75 3.75 0 00-3.75-3.75h-1.5A1.5 1.5 0 0113.5 9v-1.5a3.75 3.75 0 00-3.75-3.75H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

export function IconArrowPath({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

export function IconFlag({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={iconClassName(className)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm0 0h7a2 2 0 002-2v-4" />
    </svg>
  );
}
