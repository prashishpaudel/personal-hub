"use client";

import { useEffect, useRef, useState } from "react";
import { List } from "lucide-react";
import type { Heading } from "@/lib/garden";

// "On this page" outline for the note being read. Sits opposite the explorer,
// so it only appears once the viewport is wide enough for a third column.
export default function GardenToc({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>("");
  // Set while a click-scroll is in flight: the intermediate headings the page
  // flies past would otherwise steal the highlight before we land.
  const lockedRef = useRef(false);

  useEffect(() => {
    if (headings.length === 0) return;

    const nodes = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (nodes.length === 0) return;

    // Highlight the last heading that has crossed the top of the viewport, so
    // the marker tracks the section you are reading rather than the one
    // scrolling into view at the bottom.
    const onScroll = () => {
      if (lockedRef.current) return;
      const line = 96;
      let current = nodes[0];
      for (const el of nodes) {
        if (el.getBoundingClientRect().top <= line) current = el;
        else break;
      }
      // Bottom of the page: the last heading wins even if it never reaches the
      // line, otherwise a short final section can never be highlighted.
      const atEnd =
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 4;
      setActiveId(atEnd ? nodes[nodes.length - 1].id : current.id);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [headings]);

  if (headings.length < 2) return null;

  function go(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    const el = document.getElementById(id);
    if (!el) return; // no target — let the browser follow the anchor
    e.preventDefault();
    lockedRef.current = true;
    setActiveId(id);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    window.setTimeout(() => {
      lockedRef.current = false;
    }, 600);
  }

  return (
    <aside className="sticky top-14 ml-auto mt-14 hidden max-h-[calc(100dvh-5rem)] w-48 shrink-0 flex-col gap-3 self-start lg:flex xl:w-56">
      <p className="flex items-center gap-1.5 px-2.5 text-xs font-semibold uppercase tracking-wide text-text-faint">
        <List size={13} /> On this page
      </p>

      <nav className="-mr-1 flex flex-col gap-0.5 overflow-y-auto pr-1">
        {headings.map((h) => {
          const active = activeId === h.id;
          return (
            <a
              key={h.id}
              href={`#${h.id}`}
              onClick={(e) => go(e, h.id)}
              className={`block rounded-lg py-1.5 pr-2 text-sm leading-snug transition-colors ${
                h.level === 3 ? "pl-6" : "pl-2.5"
              } ${
                active
                  ? "bg-accent-soft font-medium text-accent-text"
                  : "text-text-muted hover:bg-bg-sunken hover:text-text"
              }`}
            >
              {h.text}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
