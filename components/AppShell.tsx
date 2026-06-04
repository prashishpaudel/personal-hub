"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { navItems } from "@/lib/nav";

const themeKey = "personal-hub:theme";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(themeKey) as
      | "light"
      | "dark"
      | null;
    if (saved) {
      setTheme(saved);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (mounted) window.localStorage.setItem(themeKey, theme);
  }, [theme, mounted]);

  return (
    <div className="min-h-dvh">
      {/* Desktop side rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[68px] flex-col items-center border-r border-border bg-bg-elevated py-5 md:flex lg:w-60 lg:items-stretch lg:px-3">
        <Link
          href="/"
          className="mb-6 flex items-center gap-2.5 px-0 lg:px-2.5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-[15px] font-semibold text-white">
            ph
          </span>
          <span className="hidden text-[15px] font-semibold tracking-tight lg:inline">
            Personal Hub
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`group flex items-center gap-3 rounded-xl px-0 py-2.5 transition-colors lg:px-3 ${
                  active
                    ? "bg-accent-soft text-accent-text"
                    : "text-text-muted hover:bg-bg-sunken hover:text-text"
                }`}
              >
                <span className="flex w-full items-center justify-center lg:w-auto lg:justify-start">
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="hidden text-sm font-medium lg:inline">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label="Toggle theme"
          className="mt-2 flex items-center justify-center gap-3 rounded-xl py-2.5 text-text-muted transition-colors hover:bg-bg-sunken hover:text-text lg:justify-start lg:px-3"
        >
          {mounted && theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          <span className="hidden text-sm font-medium lg:inline">
            {theme === "light" ? "Dark" : "Light"}
          </span>
        </button>
      </aside>

      {/* Main column */}
      <div className="md:pl-[68px] lg:pl-60">
        <main className="mx-auto min-h-dvh w-full max-w-5xl px-5 pb-24 pt-6 md:px-8 md:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar — the super-app signature */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-bg-elevated/95 backdrop-blur md:hidden">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-accent-text" : "text-text-faint"
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
