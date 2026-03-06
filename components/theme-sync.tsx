"use client";

import { useEffect } from "react";

/**
 * Reads the portfolio shell's theme preference from localStorage
 * and applies the matching class to <html>. Falls back to
 * prefers-color-scheme, then dark.
 */
export function ThemeSync() {
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light") {
      document.documentElement.classList.remove("dark");
    } else if (stored === "dark") {
      document.documentElement.classList.add("dark");
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      document.documentElement.classList.remove("dark");
    }

    // Listen for changes from the portfolio shell (same-origin localStorage)
    function onStorage(e: StorageEvent) {
      if (e.key === "theme") {
        if (e.newValue === "light") {
          document.documentElement.classList.remove("dark");
        } else {
          document.documentElement.classList.add("dark");
        }
      }
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}
