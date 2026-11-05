import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";
import "./light-theme.css";

// ---------------------------------------------------------------
// Tiny global theme store: "dark" (default) or "light".
// The choice is saved in localStorage and applied as
// <html data-theme="...">. light-theme.css restyles the whole app
// when data-theme="light", so no other component needs changing.
// ---------------------------------------------------------------

const KEY = "loopmit-theme";
const listeners = new Set();

function readSaved() {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

let theme = readSaved();

function apply() {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
}
apply();

export function setTheme(next) {
  theme = next === "light" ? "light" : "dark";
  apply();
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* storage unavailable: theme still works for this session */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useTheme() {
  return useSyncExternalStore(subscribe, () => theme, () => "dark");
}

export default function ThemeToggle() {
  const current = useTheme();
  const isLight = current === "light";

  return (
    <button
      onClick={() => setTheme(isLight ? "dark" : "light")}
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border-2 border-slate-600 text-slate-100 text-sm font-mono font-bold cursor-pointer hover:border-cyan-400"
    >
      {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      {isLight ? "DARK" : "LIGHT"}
    </button>
  );
}