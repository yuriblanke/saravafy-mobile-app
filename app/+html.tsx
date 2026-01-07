import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* 
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. 
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        <style dangerouslySetInnerHTML={{ __html: markdownStyles }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #fff;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}`;

const markdownStyles = `
.privacy-page {
  width: 100%;
}

.privacy-container {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 16px 56px;
}

.privacy-header {
  margin: 8px 0 24px;
}

.privacy-title {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
  font-weight: 700;
}

.privacy-updated {
  margin: 12px 0 0;
  line-height: 1.5;
}

.markdown {
  font-size: 16px;
  line-height: 1.7;
}

.markdown p {
  margin: 0 0 14px;
}

.markdown a {
  text-decoration: underline;
}

.markdown ul,
.markdown ol {
  padding-left: 22px;
  margin: 0 0 14px;
}

.markdown li {
  margin: 6px 0;
}

.markdown hr {
  margin: 24px 0;
}

.markdown blockquote {
  margin: 16px 0;
  padding-left: 14px;
  border-left: 3px solid currentColor;
}

.md-h1 {
  margin: 24px 0 12px;
  font-size: 22px;
  line-height: 1.25;
  font-weight: 700;
}

.md-h2 {
  margin: 20px 0 10px;
  font-size: 18px;
  line-height: 1.3;
  font-weight: 700;
}

.md-h3 {
  margin: 16px 0 8px;
  font-size: 16px;
  line-height: 1.35;
  font-weight: 700;
}

@media (max-width: 480px) {
  .privacy-container {
    padding: 20px 14px 48px;
  }
  .privacy-title {
    font-size: 24px;
  }
}
`;
