export type Category =
  | "Tech"
  | "World"
  | "Ideas"
  | "Science"
  | "Finance"
  | "Other";

export interface RSSSource {
  name: string;
  url: string;
  category: Category;
}

// Add or remove feeds here. Grouped by category for readability.
export const sources: RSSSource[] = [
  // Tech
  { name: "Hacker News", url: "https://news.ycombinator.com/rss", category: "Tech" },
  { name: "Juejin", url: "https://juejin.cn/rss", category: "Tech" },
  { name: "ByteByteGo", url: "https://blog.bytebytego.com/feed", category: "Tech" },
  { name: "Techmeme", url: "https://www.techmeme.com/feed.xml", category: "Tech" },
  {
    name: "MIT Technology Review",
    url: "https://www.technologyreview.com/feed",
    category: "Tech",
  },
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
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "Tech" },

  // Finance
  {
    name: "CNBC Finance",
    url: "https://www.cnbc.com/id/10000664/device/rss/rss.html",
    category: "Finance",
  },
  {
    name: "MarketWatch Top Stories",
    url: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
    category: "Finance",
  },
  {
    name: "Yahoo Finance",
    url: "https://finance.yahoo.com/news/rssindex",
    category: "Finance",
  },
  {
    name: "Investing.com News",
    url: "https://www.investing.com/rss/news.rss",
    category: "Finance",
  },
  {
    name: "A Wealth of Common Sense",
    url: "https://awealthofcommonsense.com/feed/",
    category: "Finance",
  },
  {
    name: "Of Dollars and Data",
    url: "https://ofdollarsanddata.com/feed/",
    category: "Finance",
  },
  {
    name: "The Big Picture",
    url: "https://ritholtz.com/feed/",
    category: "Finance",
  },
  {
    name: "Calculated Risk",
    url: "https://www.calculatedriskblog.com/feeds/posts/default",
    category: "Finance",
  },

  // Ideas
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
  { name: "Aeon", url: "https://aeon.co/feed.rss", category: "Ideas" },

  // Science
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
  { name: "NPR Science", url: "https://feeds.npr.org/1007/rss.xml", category: "Science" },
  { name: "Phys.org", url: "https://phys.org/rss-feed/", category: "Science" },

  // World
  {
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/rss.xml",
    category: "World",
  },
  {
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    category: "World",
  },
  {
    name: "Guardian World",
    url: "https://www.theguardian.com/world/rss",
    category: "World",
  },
  {
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    category: "World",
  },

];

export const categories: Category[] = [
  "Tech",
  "World",
  "Ideas",
  "Science",
  "Finance",
  "Other",
];
