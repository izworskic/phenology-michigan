import Head from "next/head";
import Script from "next/script";
import { useRouter } from "next/router";

const BLOOM_URL = "https://phenology.chrisizworski.com/bloom-tracker";
const BLOOM_IMAGE = "https://phenology.chrisizworski.com/bloom-tracker-social.png";
const BLOOM_TITLE = "Michigan Bloom Tracker — What’s Blooming & When to Go";
const BLOOM_DESCRIPTION = "Track Michigan flower season from April into September: cherries, tulips, peonies, lilacs, lavender and major sunflower fields, with live trip calls, weekend outlooks and clear seasonal timing.";
const CHRIS_PERSON = "https://chrisizworski.com/#person";

const bloomStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://phenology.chrisizworski.com/#website",
      name: "Michigan Phenology",
      url: "https://phenology.chrisizworski.com/",
      author: { "@id": CHRIS_PERSON },
      creator: { "@id": CHRIS_PERSON },
      inLanguage: "en-US",
    },
    {
      "@type": "ImageObject",
      "@id": `${BLOOM_URL}#primaryimage`,
      url: BLOOM_IMAGE,
      contentUrl: BLOOM_IMAGE,
      width: 1200,
      height: 630,
      caption: "Michigan Bloom Tracker — live flower-season trip decisions and seasonal timing",
      representativeOfPage: true,
      creator: { "@id": CHRIS_PERSON },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${BLOOM_URL}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Michigan Phenology", item: "https://phenology.chrisizworski.com/" },
        { "@type": "ListItem", position: 2, name: "Michigan Bloom Tracker", item: BLOOM_URL },
      ],
    },
    {
      "@type": "WebApplication",
      "@id": `${BLOOM_URL}#app`,
      name: "Michigan Bloom Tracker",
      url: BLOOM_URL,
      description: BLOOM_DESCRIPTION,
      applicationCategory: "TravelApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      image: { "@id": `${BLOOM_URL}#primaryimage` },
      author: { "@id": CHRIS_PERSON },
      creator: { "@id": CHRIS_PERSON },
      isPartOf: { "@id": "https://phenology.chrisizworski.com/#website" },
      inLanguage: "en-US",
      featureList: [
        "Live Michigan flower bloom trip decisions",
        "Weekend bloom outlooks",
        "Seasonal timing from April into September",
        "Interpretive Michigan bloom map",
        "Official-source bloom evidence and provenance",
      ],
    },
    {
      "@type": "WebPage",
      "@id": `${BLOOM_URL}#webpage`,
      url: BLOOM_URL,
      name: BLOOM_TITLE,
      description: BLOOM_DESCRIPTION,
      isPartOf: { "@id": "https://phenology.chrisizworski.com/#website" },
      mainEntity: { "@id": `${BLOOM_URL}#app` },
      primaryImageOfPage: { "@id": `${BLOOM_URL}#primaryimage` },
      breadcrumb: { "@id": `${BLOOM_URL}#breadcrumb` },
      author: { "@id": CHRIS_PERSON },
      creator: { "@id": CHRIS_PERSON },
      inLanguage: "en-US",
    },
  ],
};

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isBloomTracker = router.pathname === "/bloom-tracker";
  const isHome = router.pathname === "/";

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="author" href="https://chrisizworski.com/chris-izworski/" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Newsreader:ital,opsz@0,6..72;1,6..72&display=swap" rel="stylesheet" />
        {isBloomTracker && <link rel="stylesheet" href="/bloom-tracker-redesign.css" />}
        {isBloomTracker && <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />}
        {isBloomTracker && <link rel="stylesheet" href="/bloom-map-v2.css" />}
        {isBloomTracker && <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />}
        {isBloomTracker && <meta name="author" content="Chris Izworski" />}
        {isBloomTracker && <link rel="image_src" href={BLOOM_IMAGE} />}
        {isBloomTracker && <meta name="thumbnail" content={BLOOM_IMAGE} />}
        {isBloomTracker && <meta itemProp="image" content={BLOOM_IMAGE} />}
        {isBloomTracker && <meta property="og:site_name" content="Michigan Phenology" />}
        {isBloomTracker && <meta property="og:locale" content="en_US" />}
        {isBloomTracker && <meta property="og:image" content={BLOOM_IMAGE} />}
        {isBloomTracker && <meta property="og:image:secure_url" content={BLOOM_IMAGE} />}
        {isBloomTracker && <meta property="og:image:type" content="image/png" />}
        {isBloomTracker && <meta property="og:image:width" content="1200" />}
        {isBloomTracker && <meta property="og:image:height" content="630" />}
        {isBloomTracker && <meta property="og:image:alt" content="Michigan Bloom Tracker preview for live bloom conditions and seasonal flower timing" />}
        {isBloomTracker && <meta name="twitter:title" content={BLOOM_TITLE} />}
        {isBloomTracker && <meta name="twitter:description" content="See what’s blooming in Michigan, what is worth the drive this weekend, and when cherries, tulips, peonies, lilacs, lavender and sunflowers typically peak." />}
        {isBloomTracker && <meta name="twitter:image" content={BLOOM_IMAGE} />}
        {isBloomTracker && <meta name="twitter:image:alt" content="Michigan Bloom Tracker preview for live bloom conditions and seasonal flower timing" />}
        {isBloomTracker && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(bloomStructuredData) }} />}
      </Head>
      <style jsx global>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        html { overflow-x: hidden; }
        body { font-family: 'Newsreader', Georgia, 'Iowan Old Style', serif; background: #efe7d3; color: #2b2a1f; }
        h1, h2 { font-family: 'Fraunces', Georgia, serif; }
        a { color: inherit; }
        .pheno-2col { display: grid; grid-template-columns: 1fr; gap: 28px; align-items: start; }
        .pheno-2col-b { display: grid; grid-template-columns: 1fr; gap: 28px; align-items: start; }
        @media (min-width: 780px) {
          .pheno-2col { grid-template-columns: minmax(280px,1fr) minmax(300px,1.05fr); }
          .pheno-2col-b { grid-template-columns: 1.2fr 1fr; }
        }
        .pheno-pill { cursor: pointer; border: 1px solid #d8caa9; background: rgba(255,255,255,0.5); color: #7a7058; font-family: Georgia, serif; font-size: 12.5px; padding: 4px 12px; border-radius: 999px; }
        .pheno-pill[data-on="1"] { background: #5a8a4a; color: #fff; border-color: #5a8a4a; }
        .bloom-authority-link { max-width: 1040px; margin: 16px auto 28px; padding: 0 20px; font-family: Georgia, serif; font-size: 13px; color: #766d59; }
        .bloom-authority-link a { color: #365e3d; font-weight: 700; text-decoration: none; }
        .bloom-authority-link a:hover { text-decoration: underline; }
      `}</style>
      <Component {...pageProps} />
      {isHome && (
        <nav className="bloom-authority-link" aria-label="Featured seasonal tool">
          Flower-season planning: <a href="/bloom-tracker">Michigan Bloom Tracker — what’s blooming and when to go</a>
        </nav>
      )}
      {isBloomTracker && <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="afterInteractive" />}
      {isBloomTracker && <Script src="/bloom-map-v2.js" strategy="afterInteractive" />}
      {isBloomTracker && <Script src="/bloom-map-label-declutter.js" strategy="afterInteractive" />}
      <script defer src="https://chrisizworski.com/assets/network-ads-v1.js"></script>
    </>
  );
}
