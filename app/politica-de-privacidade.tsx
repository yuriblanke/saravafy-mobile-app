import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Platform } from "react-native";
import remarkGfm from "remark-gfm";

import privacyMd from "../web-landing/politica-de-privacidade.md";

function stripLeadingTitle(markdown: string): string {
  return String(markdown || "").replace(/^#\s+.*(?:\r?\n){1,2}/, "");
}

function extractLastUpdated(markdown: string): string | null {
  const lines = String(markdown || "").split(/\r?\n/);
  const line = lines.find((l) =>
    /\b(Última atualização|Ultima atualizacao)\b\s*:/i.test(l)
  );
  return line ? line.trim() : null;
}

export default function PrivacyPolicyRoute() {
  const lastUpdated = useMemo(() => extractLastUpdated(privacyMd), [privacyMd]);
  const bodyMd = useMemo(() => stripLeadingTitle(privacyMd), [privacyMd]);

  if (Platform.OS !== "web") {
    return null;
  }

  return (
    <main className="privacy-page">
      <div className="privacy-container">
        <header className="privacy-header">
          <h1 className="privacy-title">Política de Privacidade — Saravafy</h1>
          {lastUpdated ? (
            <p className="privacy-updated">{lastUpdated}</p>
          ) : null}
        </header>

        <article className="markdown">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            skipHtml
            components={{
              a: ({ href, children, ...props }) => (
                <a
                  {...props}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {children}
                </a>
              ),
              h1: ({ children, ...props }) => (
                <h2 {...props} className="md-h1">
                  {children}
                </h2>
              ),
              h2: ({ children, ...props }) => (
                <h3 {...props} className="md-h2">
                  {children}
                </h3>
              ),
              h3: ({ children, ...props }) => (
                <h4 {...props} className="md-h3">
                  {children}
                </h4>
              ),
            }}
          >
            {bodyMd}
          </ReactMarkdown>
        </article>
      </div>
    </main>
  );
}
