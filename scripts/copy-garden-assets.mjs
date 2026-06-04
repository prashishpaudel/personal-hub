// Copies non-markdown assets (images) from the Obsidian vault in content/
// into public/garden-assets/ so the garden can serve embedded files.
// Runs automatically before `dev` and `build` (npm pre-scripts).
import { mkdir, readdir, copyFile, rm } from "node:fs/promises";
import { join, extname } from "node:path";

const SRC = "content";
const OUT = join("public", "garden-assets");
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"]);

async function run() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  let entries;
  try {
    entries = await readdir(SRC, { recursive: true, withFileTypes: true });
  } catch {
    return; // no content/ yet
  }

  let count = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.parentPath?.includes(".obsidian")) continue;
    if (!IMAGE_EXT.has(extname(entry.name).toLowerCase())) continue;
    await copyFile(join(entry.parentPath, entry.name), join(OUT, entry.name));
    count++;
  }
  console.log(`[garden] copied ${count} asset(s) to ${OUT}`);
}

run().catch((err) => {
  console.error("[garden] asset copy failed:", err);
});
