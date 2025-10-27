"use client";

export function ThemeLogo({ className }: { className?: string }) {
  return (
    <>
      {/* White logo for light mode */}
      <img
        src="/logo-white.svg"
        alt="GMB City Logo"
        className={`${className} dark:hidden`}
      />
      {/* Dark logo for dark mode */}
      <img
        src="/logo.svg"
        alt="GMB City Logo"
        className={`${className} hidden dark:block`}
      />
    </>
  );
}
