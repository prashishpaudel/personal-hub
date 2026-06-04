import DOMPurify from "isomorphic-dompurify";

// Single source of truth for cleaning untrusted feed/article HTML before it
// is rendered with dangerouslySetInnerHTML. DOMPurify parses a real DOM and
// strips scripts, event handlers, javascript: URLs, and dangerous tags —
// unlike the old regex approach, which was bypassable.
export function sanitizeHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["style", "srcset"],
    ALLOW_DATA_ATTR: false,
  });

  // Force external links to open safely in a new tab.
  return clean.replace(/<a\s/gi, '<a target="_blank" rel="noopener noreferrer" ');
}
