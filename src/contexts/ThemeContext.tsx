import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Mode = "light" | "dark";
export type ColorTheme =
  | "dark-academy"
  | "midnight-violet"
  | "neon-focus"
  | "soft-pastel"
  | "prestige-gold"
  | "minimal-clean";

export const COLOR_THEMES: { id: ColorTheme; label: string; emoji: string; mode: Mode }[] = [
  { id: "dark-academy", label: "آکادمی تاریک", emoji: "🪐", mode: "dark" },
  { id: "midnight-violet", label: "بنفش نیمه‌شب", emoji: "🌌", mode: "dark" },
  { id: "neon-focus", label: "نئون فوکوس", emoji: "⚡", mode: "dark" },
  { id: "prestige-gold", label: "طلایی پرستیژ", emoji: "👑", mode: "dark" },
  { id: "soft-pastel", label: "پاستل آرام", emoji: "🌸", mode: "light" },
  { id: "minimal-clean", label: "مینیمال روشن", emoji: "☀️", mode: "light" },
];

interface ThemeContextType {
  theme: Mode;
  colorTheme: ColorTheme;
  setColorTheme: (t: ColorTheme) => void;
  toggleTheme: () => void;
}

const DEFAULT_THEME: ColorTheme = "dark-academy";

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  colorTheme: DEFAULT_THEME,
  setColorTheme: () => {},
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function modeOf(t: ColorTheme): Mode {
  return COLOR_THEMES.find((c) => c.id === t)?.mode ?? "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const stored = localStorage.getItem("color-theme") as ColorTheme | null;
    if (stored && COLOR_THEMES.some((c) => c.id === stored)) return stored;
    // backward compat with old "theme" key
    const legacy = localStorage.getItem("theme");
    if (legacy === "light") return "minimal-clean";
    return DEFAULT_THEME;
  });

  const theme = modeOf(colorTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", colorTheme);
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("color-theme", colorTheme);
    localStorage.setItem("theme", theme);
  }, [colorTheme, theme]);

  const setColorTheme = (t: ColorTheme) => setColorThemeState(t);

  const toggleTheme = () => {
    // Toggle between user's last dark and last light theme
    if (theme === "dark") setColorThemeState("minimal-clean");
    else setColorThemeState("dark-academy");
  };

  return (
    <ThemeContext.Provider value={{ theme, colorTheme, setColorTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
