const SITE = "https://phenology.chrisizworski.com";
function xml() {
  const today = new Date().toISOString().split("T")[0];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url><loc>${SITE}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url>
    <loc>${SITE}/bloom-tracker</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <image:image><image:loc>${SITE}/bloom-tracker-social.png</image:loc></image:image>
  </url>
</urlset>`;
}
export async function getServerSideProps({ res }) {
  res.setHeader("Content-Type", "text/xml");
  res.write(xml());
  res.end();
  return { props: {} };
}
export default function Sitemap() { return null; }
