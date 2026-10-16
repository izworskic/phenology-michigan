const SITE = "https://phenology.chrisizworski.com";
function xml() {
  // Bump lastmod only on actual content edits; do not claim every request changed every page.
  const HOME_LASTMOD='2026-10-14';
  const MICHIGAN_LASTMOD='2026-10-14';
  const WISCONSIN_LASTMOD='2026-10-14';
  const FIREFLY_LASTMOD='2026-10-15';
  const SALAMANDER_LASTMOD='2026-10-16';
  const HUMMINGBIRD_LASTMOD='2026-10-15';
  const TRILLIUM_LASTMOD='2026-10-15';
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url><loc>${SITE}/</loc><lastmod>${HOME_LASTMOD}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url>
    <loc>${SITE}/bloom-tracker</loc>
    <lastmod>${MICHIGAN_LASTMOD}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <image:image><image:loc>${SITE}/bloom-tracker-social.png</image:loc></image:image>
  </url>
  <url><loc>${SITE}/michigan-trillium</loc><lastmod>${TRILLIUM_LASTMOD}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>${SITE}/hummingbird-tracker</loc><lastmod>${HUMMINGBIRD_LASTMOD}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>${SITE}/firefly-tracker</loc><lastmod>${FIREFLY_LASTMOD}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>${SITE}/salamander-migration</loc><lastmod>${SALAMANDER_LASTMOD}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>${SITE}/wisconsin-bloom-tracker</loc><lastmod>${WISCONSIN_LASTMOD}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>${SITE}/wisconsin-bloom-tracker/door-county-cherries</loc><lastmod>${WISCONSIN_LASTMOD}</lastmod><changefreq>weekly</changefreq><priority>0.85</priority></url>
  <url><loc>${SITE}/wisconsin-bloom-tracker/uw-arboretum</loc><lastmod>${WISCONSIN_LASTMOD}</lastmod><changefreq>weekly</changefreq><priority>0.85</priority></url>
</urlset>`;
}
export async function getServerSideProps({ res }) {
  res.setHeader("Content-Type", "text/xml");
  res.write(xml());
  res.end();
  return { props: {} };
}
export default function Sitemap() { return null; }
