"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LogOut,
  Moon,
  MoreHorizontal,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { navItems } from "@/lib/nav";

// Mobile tab bar shows these five; the rest live under "More".
const mobilePrimary = ["/", "/stickies", "/feed", "/garden", "/media"];

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
  const [moreOpen, setMoreOpen] = useState(false);

  // Close the More sheet on navigation.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

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
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
            <svg
              width="20"
              height="20"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
            >
              <g stroke="currentColor" strokeWidth="2">
                <line x1="16" y1="16" x2="16" y2="6" />
                <line x1="16" y1="16" x2="26" y2="16" />
                <line x1="16" y1="16" x2="16" y2="26" />
                <line x1="16" y1="16" x2="6" y2="16" />
              </g>
              <g fill="currentColor">
                <circle cx="16" cy="6" r="3" />
                <circle cx="26" cy="16" r="3" />
                <circle cx="16" cy="26" r="3" />
                <circle cx="6" cy="16" r="3" />
              </g>
              <circle cx="16" cy="16" r="4.5" fill="currentColor" />
              <circle cx="16" cy="16" r="2" className="fill-accent" />
            </svg>
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

      {/* Main column — content is left-aligned so it sits next to the rail
          (slack goes to the right) instead of centering with a left gap. */}
      <div className={collapsed ? "md:pl-[68px]" : "md:pl-60"}>
        <main className="min-h-dvh w-full max-w-5xl px-5 pb-24 pt-6 md:px-6 md:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar — five primary tabs, the rest under More */}
      {(() => {
        const primary = navItems
          .filter((i) => mobilePrimary.includes(i.href))
          .sort(
            (a, b) =>
              mobilePrimary.indexOf(a.href) - mobilePrimary.indexOf(b.href)
          );
        const overflow = navItems.filter(
          (i) => !mobilePrimary.includes(i.href)
        );
        const moreActive = overflow.some((i) => isActive(pathname, i.href));
        return (
          <>
            {moreOpen && (
              <div className="fixed inset-0 z-30 md:hidden">
                <button
                  aria-label="Close"
                  onClick={() => setMoreOpen(false)}
                  className="absolute inset-0 bg-black/30"
                />
                <div className="absolute bottom-20 right-3 w-44 overflow-hidden rounded-2xl border border-border bg-bg-elevated shadow-xl">
                  {overflow.map((item) => {
                    const active = isActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                          active
                            ? "bg-accent-soft text-accent-text"
                            : "text-text-muted hover:bg-bg-sunken"
                        }`}
                      >
                        <Icon size={18} />
                        {item.label}
                      </Link>
                    );
                  })}
                  <button
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-sm font-medium text-text-muted transition-colors hover:bg-bg-sunken"
                  >
                    {mounted && theme === "light" ? (
                      <Moon size={18} />
                    ) : (
                      <Sun size={18} />
                    )}
                    {theme === "light" ? "Dark mode" : "Light mode"}
                  </button>
                </div>
              </div>
            )}
            <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-bg-elevated/95 backdrop-blur md:hidden">
              {primary.map((item) => {
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
              <button
                onClick={() => setMoreOpen((v) => !v)}
                aria-label="More sections"
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  moreActive ? "text-accent-text" : "text-text-faint"
                }`}
              >
                <MoreHorizontal size={21} strokeWidth={moreActive ? 2.4 : 2} />
                More
              </button>
            </nav>
          </>
        );
      })()}
    </div>
  );
}
