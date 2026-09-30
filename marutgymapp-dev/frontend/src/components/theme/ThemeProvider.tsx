"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface TenantBranding {
  businessName: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  address?: string | null;
  loginWelcomeText?: string | null;
  footerText?: string | null;
}

interface ThemeContextType {
  branding: TenantBranding | null;
  setBranding: (branding: TenantBranding | null) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  branding: null,
  setBranding: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<TenantBranding | null>(null);

  useEffect(() => {
    if (branding?.primaryColor) {
      document.documentElement.style.setProperty("--tenant-primary", branding.primaryColor);
      document.documentElement.style.setProperty("--tenant-primary-hover", adjustColor(branding.primaryColor, -20));
    } else {
      document.documentElement.style.setProperty("--tenant-primary", "#1e40af");
      document.documentElement.style.setProperty("--tenant-primary-hover", "#1d4ed8");
    }

    if (branding?.secondaryColor) {
      document.documentElement.style.setProperty("--tenant-secondary", branding.secondaryColor);
    } else {
      document.documentElement.style.setProperty("--tenant-secondary", "#0f172a");
    }

    if (branding?.faviconUrl) {
      const link = document.querySelector("link[rel*='icon']") || document.createElement("link");
      (link as HTMLLinkElement).type = "image/x-icon";
      (link as HTMLLinkElement).rel = "shortcut icon";
      (link as HTMLLinkElement).href = branding.faviconUrl;
      document.getElementsByTagName("head")[0].appendChild(link);
    }
  }, [branding]);

  return (
    <ThemeContext.Provider value={{ branding, setBranding }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Utility to lighten or darken color hex
function adjustColor(hex: string, percent: number) {
  let num = parseInt(hex.replace("#", ""), 16);
  let amt = Math.round(2.55 * percent);
  let R = (num >> 16) + amt;
  let G = ((num >> 8) & 0x00ff) + amt;
  let B = (num & 0x0000ff) + amt;
  return (
    "#" +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}
