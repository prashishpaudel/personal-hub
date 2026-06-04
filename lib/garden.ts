import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";

const CONTENT_DIR = join(process.cwd(), "content");
const IMAGE_RE = /\.(jpe?g|png|gif|webp|svg|avif)$/i;

export type NoteMeta = {
  slug: string;
  title: string;
  tags: string[];
  date: string | null;
  excerpt: string;
};

export type Note = NoteMeta & {
  html: string;
  backlinks: NoteMeta[];
};

type RawNote = {
  slug: string;
  name: string; // filename without extension
  title: string;
  tags: string[];
  date: string | null;
  body: string; // markdown without frontmatter
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\.md$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function plainExcerpt(md: string, len = 160): string {
  const text = md
    .replace(/^#.*$/gm, "")
    .replace(/!?\[\[[^\]]*\]\]/g, "")
    .replace(/[#*_>`~-]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > len ? `${text.slice(0, len).trim()}…` : text;
}

let cache: RawNote[] | null = null;

function readAll(): RawNote[] {
  if (cache) return cache;

  let files: string[] = [];
  try {
    files = readdirSync(CONTENT_DIR, { recursive: true }) as string[];
  } catch {
    cache = [];
    return cache;
  }

  const notes: RawNote[] = [];
  for (const rel of files) {
    if (!rel.endsWith(".md")) continue;
    if (rel.includes(".obsidian")) continue;

    const raw = readFileSync(join(CONTENT_DIR, rel), "utf8");
    const { data, content } = matter(raw);
    const name = rel.replace(/\.md$/, "").split("/").pop() ?? rel;
    const h1 = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
    const title = (data.title as string) || h1 || name;

    notes.push({
      slug: slugify(name),
      name,
      title,
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      date: data.date ? String(data.date) : null,
      body: content,
    });
  }

  cache = notes;
  return cache;
}

// Map every note name + title (lowercased) to its slug, for wikilink resolution.
function nameIndex(notes: RawNote[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const n of notes) {
    map.set(n.name.toLowerCase(), n.slug);
    map.set(n.title.toLowerCase(), n.slug);
  }
  return map;
}

// Slugs this note links out to (via [[wikilinks]], excluding ![[embeds]]).
function outgoingSlugs(body: string, index: Map<string, string>): Set<string> {
  const out = new Set<string>();
  const re = /(!?)\[\[([^\]]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    if (m[1] === "!") continue; // embed, not a link
    const target = m[2].split("|")[0].split("#")[0].trim();
    const slug = index.get(target.toLowerCase()) ?? slugify(target);
    out.add(slug);
  }
  return out;
}

// Convert Obsidian wikilinks/embeds to standard Markdown before remark runs.
function preprocess(body: string, index: Map<string, string>): string {
  return body
    .replace(/!\[\[([^\]]+)\]\]/g, (_full, inner: string) => {
      const file = inner.split("|")[0].trim();
      if (IMAGE_RE.test(file)) {
        const alt = inner.split("|")[1]?.trim() || file;
        return `![${alt}](/garden-assets/${encodeURIComponent(file)})`;
      }
      return ""; // skip note transclusion
    })
    .replace(/\[\[([^\]]+)\]\]/g, (_full, inner: string) => {
      const [rawTarget, alias] = inner.split("|");
      const target = rawTarget.split("#")[0].trim();
      const label = (alias ?? rawTarget).trim();
      const slug = index.get(target.toLowerCase()) ?? slugify(target);
      return `[${label}](/garden/${slug})`;
    });
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeStringify);

function toMeta(n: RawNote): NoteMeta {
  return {
    slug: n.slug,
    title: n.title,
    tags: n.tags,
    date: n.date,
    excerpt: plainExcerpt(n.body),
  };
}

export function getAllNotes(): NoteMeta[] {
  return readAll()
    .map(toMeta)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getAllSlugs(): string[] {
  return readAll().map((n) => n.slug);
}

export async function getNote(slug: string): Promise<Note | null> {
  const notes = readAll();
  const note = notes.find((n) => n.slug === slug);
  if (!note) return null;

  const index = nameIndex(notes);
  const html = String(await processor.process(preprocess(note.body, index)));

  // Backlinks: every other note whose outgoing links include this slug.
  const backlinks = notes
    .filter((n) => n.slug !== slug && outgoingSlugs(n.body, index).has(slug))
    .map(toMeta)
    .sort((a, b) => a.title.localeCompare(b.title));

  return { ...toMeta(note), html, backlinks };
}
