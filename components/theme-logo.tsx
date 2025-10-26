"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeLogo({ className }: { className?: string }) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR or before hydration, show dark logo (default)
  if (!mounted) {
    return <img src="/logo.svg" alt="GMB City Logo" className={className} />;
  }

  // Use resolvedTheme to handle 'system' preference
  const currentTheme = resolvedTheme || theme;
  const logoSrc = currentTheme === "light" ? "/logo-white.svg" : "/logo.svg";

  return <img src={logoSrc} alt="GMB City Logo" className={className} />;
}
