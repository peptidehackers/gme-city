"use client";

export function ThemeLogo({ className }: { className?: string }) {
  return (
    <>
      {/* Dark logo for light mode */}
      <img
        src="/logo.svg"
        alt="GMB City Logo"
        className={`${className} dark:hidden`}
      />
      {/* White logo for dark mode */}
      <img
        src="/logo-white.svg"
        alt="GMB City Logo"
        className={`${className} hidden dark:block`}
      />
    </>
  );
}
