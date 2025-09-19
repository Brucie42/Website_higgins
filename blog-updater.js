// blog-updater.js
// Node.js script to auto-update posts.json and rss.xml when new posts are added.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const BLOG_DIR = path.join(__dirname, "blog");
const POSTS_JSON = path.join(BLOG_DIR, "posts.json");
const RSS_XML = path.join(BLOG_DIR, "rss.xml");
const SITE_URL = "https://brucebyte.com";

// Helper: format date to RSS pubDate
function formatRssDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toUTCString();
}

// Step 1. Load current posts.json
let posts = [];
if (fs.existsSync(POSTS_JSON)) {
  posts = JSON.parse(fs.readFileSync(POSTS_JSON, "utf-8"));
}

// Step 2. Scan /blog for *.html files (ignore index.html, rss.xml)
const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith(".html") && !["index.html"].includes(f));

files.forEach(file => {
  const filePath = path.join(BLOG_DIR, file);
  const html = fs.readFileSync(filePath, "utf-8");

  // Try to extract <title> and <meta name="description">
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const descMatch = html.match(/<meta name="description" content="(.*?)"/i);

  const title = titleMatch ? titleMatch[1].replace(/ — BruceByte Blog/, "") : file;
  const excerpt = descMatch ? descMatch[1] : "";

  // Expect filename like YYYY-MM-DD-title.html
  const base = path.basename(file, ".html");
  const [yyyy, mm, dd] = base.split("-");
  const date = `${yyyy}-${mm}-${dd}`;

  const url = `/blog/${file}`;

  // If not already in posts.json, add it
  if (!posts.some(p => p.url === url)) {
    posts.push({ title, date, url, excerpt, tags: [] });
  }
});

// Step 3. Sort posts (newest first)
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

// Step 4. Write posts.json
fs.writeFileSync(POSTS_JSON, JSON.stringify(posts, null, 2));
console.log("Updated posts.json");

// Step 5. Generate rss.xml
const rssItems = posts.map(p => `
    <item>
      <title>${p.title}</title>
      <link>${SITE_URL}${p.url}</link>
      <guid>${SITE_URL}${p.url}</guid>
      <pubDate>${formatRssDate(p.date)}</pubDate>
      <description><![CDATA[${p.excerpt}]]></description>
    </item>`).join("\n");

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>BruceByte Weekly Blog</title>
    <link>${SITE_URL}/blog/</link>
    <description>Weekly posts from BruceByte</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${rssItems}
  </channel>
</rss>`;

fs.writeFileSync(RSS_XML, rss);
console.log("Updated rss.xml");
