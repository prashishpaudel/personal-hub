import {
  LayoutDashboard,
  NotebookPen,
  StickyNote,
  Sprout,
  PenLine,
  Rss,
  Play,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // Short tagline shown on dashboard cards
  blurb: string;
};

export const navItems: NavItem[] = [
  {
    href: "/",
    label: "Home",
    icon: LayoutDashboard,
    blurb: "Everything at a glance",
  },
  {
    href: "/notes",
    label: "Notes",
    icon: NotebookPen,
    blurb: "Quick thoughts and scratch",
  },
  {
    href: "/stickies",
    label: "Stickies",
    icon: StickyNote,
    blurb: "Fast capture, throwaway",
  },
  {
    href: "/garden",
    label: "Garden",
    icon: Sprout,
    blurb: "Knowledge base and notes",
  },
  {
    href: "/blog",
    label: "Blog",
    icon: PenLine,
    blurb: "Long-form writing",
  },
  {
    href: "/feed",
    label: "Feed",
    icon: Rss,
    blurb: "News from your sources",
  },
  {
    href: "/media",
    label: "Media",
    icon: Play,
    blurb: "Videos and podcasts",
  },
];

// Sections shown as launcher cards (everything except Home)
export const sectionItems = navItems.filter((item) => item.href !== "/");
