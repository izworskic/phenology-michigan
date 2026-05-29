import Head from "next/head";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Newsreader:ital,opsz@0,6..72;1,6..72&display=swap" rel="stylesheet" />
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
      `}</style>
      <Component {...pageProps} />
    </>
  );
}
