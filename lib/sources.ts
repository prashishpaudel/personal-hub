export type Category = "Tech" | "Politics" | "Ideas" | "Science" | "Other";

export interface RSSSource {
  name: string;
  url: string;
  category: Category;
}

// Add or remove feeds here.
export const sources: RSSSource[] = [
  {
    name: "LessWrong Frontpage",
    url: "https://www.lesswrong.com/feed.xml?view=frontpage",
    category: "Ideas",
  },
  {
    name: "LessWrong Curated",
    url: "https://www.lesswrong.com/feed.xml?view=curated",
    category: "Ideas",
  },
  { name: "Hacker News", url: "https://news.ycombinator.com/rss", category: "Tech" },
  { name: "Juejin", url: "https://juejin.cn/rss", category: "Tech" },
  {
    name: "Escalation Trap",
    url: "https://escalationtrap.substack.com/feed",
    category: "Politics",
  },
  { name: "ByteByteGo", url: "https://blog.bytebytego.com/feed", category: "Tech" },
  { name: "Latent Space", url: "https://www.latent.space/feed", category: "Tech" },
  { name: "Mikhail Shilkov", url: "https://mikhail.io/feed/", category: "Tech" },
  {
    name: "Jay Alammar",
    url: "https://newsletter.languagemodels.co/feed",
    category: "Tech",
  },
  {
    name: "Ahead of AI",
    url: "https://magazine.sebastianraschka.com/feed",
    category: "Tech",
  },
  {
    name: "The Pragmatic Engineer",
    url: "https://newsletter.pragmaticengineer.com/feed",
    category: "Tech",
  },
  {
    name: "Daily Dose of Data Science",
    url: "https://blog.dailydoseofds.com/feed",
    category: "Tech",
  },
  { name: "Lil's blog", url: "https://lilianweng.github.io/index.xml", category: "Tech" },
  { name: "AI News", url: "https://news.smol.ai/rss.xml", category: "Tech" },
  { name: "Space.com", url: "https://www.space.com/feeds/all", category: "Science" },
  { name: "MIT News", url: "https://news.mit.edu/rss/feed", category: "Science" },
  { name: "Nature", url: "https://www.nature.com/nature.rss", category: "Science" },
  {
    name: "Quanta Magazine",
    url: "https://www.quantamagazine.org/feed/",
    category: "Science",
  },
  {
    name: "Science News",
    url: "https://www.sciencenews.org/feed",
    category: "Science",
  },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "Tech" },
  { name: "NPR Science", url: "https://feeds.npr.org/1007/rss.xml", category: "Science" },
  { name: "Phys.org", url: "https://phys.org/rss-feed/", category: "Science" },
];

export const categories: Category[] = [
  "Tech",
  "Ideas",
  "Science",
  "Politics",
  "Other",
];
