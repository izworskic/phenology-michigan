# Bloom Tracker social card

The public metadata URL remains `/bloom-tracker-social.png` so Open Graph, X/Twitter, structured data, and the image sitemap keep one stable preferred-image URL.

A `beforeFiles` rewrite now serves the restrained flower visual from `/api/bloom-tracker-social.png` ahead of the legacy static asset. This lets the social card change without fragmenting the indexed/share URL.

The card is 1200×630 PNG and intentionally uses restrained flower imagery rather than a decorative tourism-style graphic.
