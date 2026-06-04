"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LogOut,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { navItems } from "@/lib/nav";

const themeKey = "personal-hub:theme";
const railKey = "personal-hub:rail-collapsed";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail?: string | null;
}) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

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
    setCollapsed(window.localStorage.getItem(railKey) !== "0");
    setMounted(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (mounted) window.localStorage.setItem(themeKey, theme);
  }, [theme, mounted]);

  function toggleRail() {
    setCollapsed((c) => {
      const next = !c;
      window.localStorage.setItem(railKey, next ? "1" : "0");
      return next;
    });
  }

  // Shared classes for the footer action buttons (theme / sign out / toggle).
  const actionBtn = `flex items-center gap-3 rounded-xl py-2.5 text-text-muted transition-colors hover:bg-bg-sunken hover:text-text ${
    collapsed ? "justify-center" : "justify-start px-3"
  }`;
  const label = collapsed ? "hidden" : "inline";

  return (
    <div className="min-h-dvh">
      {/* Desktop side rail */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-bg-elevated py-5 md:flex ${
          collapsed ? "w-[68px] items-center" : "w-60 items-stretch px-3"
        }`}
      >
        <Link
          href="/"
          className={`mb-6 flex items-center gap-2.5 ${collapsed ? "" : "px-2.5"}`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-[15px] font-semibold text-white">
            ph
          </span>
          <span className={`text-[15px] font-semibold tracking-tight ${label}`}>
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
                className={`group flex items-center gap-3 rounded-xl py-2.5 transition-colors ${
                  collapsed ? "px-0" : "px-3"
                } ${
                  active
                    ? "bg-accent-soft text-accent-text"
                    : "text-text-muted hover:bg-bg-sunken hover:text-text"
                }`}
              >
                <span
                  className={`flex items-center ${
                    collapsed ? "w-full justify-center" : "w-auto justify-start"
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className={`text-sm font-medium ${label}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <button onClick={toggleRail} aria-label="Toggle sidebar" className={actionBtn}>
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          <span className={`text-sm font-medium ${label}`}>Collapse</span>
        </button>

        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label="Toggle theme"
          className={actionBtn}
        >
          {mounted && theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          <span className={`text-sm font-medium ${label}`}>
            {theme === "light" ? "Dark" : "Light"}
          </span>
        </button>

        {userEmail && (
          <form action="/auth/signout" method="post" className="contents">
            <button
              type="submit"
              aria-label="Sign out"
              title={`Sign out (${userEmail})`}
              className={actionBtn}
            >
              <LogOut size={20} />
              <span className={`truncate text-sm font-medium ${label}`}>
                Sign out
              </span>
            </button>
          </form>
        )}
      </aside>

      {/* Main column */}
      <div className={collapsed ? "md:pl-[68px]" : "md:pl-60"}>
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
