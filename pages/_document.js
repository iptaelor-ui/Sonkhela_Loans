import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="manifest" href="/api/manifest" />
        <meta name="theme-color" content="#145f39" />
        <link rel="icon" href="/api/app-icon?v=2&size=64" type="image/png" />
        <link rel="apple-touch-icon" href="/api/app-icon?v=2&size=180" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
