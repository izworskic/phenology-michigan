const SITE = "https://phenology.chrisizworski.com";
function xml() {
  const today = new Date().toISOString().split("T")[0];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
</urlset>`;
}
export async function getServerSideProps({ res }) {
  res.setHeader("Content-Type", "text/xml");
  res.write(xml());
  res.end();
  return { props: {} };
}
export default function Sitemap() { return null; }
