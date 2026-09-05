import { Html, Head, Main, NextScript } from 'next/document';

const MEASUREMENT_ID = 'G-Y5D2V2W7HN';
const ADSENSE_PUBLISHER_ID = 'ca-pub-8222782620788075';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="google-adsense-account" content={ADSENSE_PUBLISHER_ID} />
        {/* Google tag (gtag.js) */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`} />
        <script dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${MEASUREMENT_ID}');
        ` }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
