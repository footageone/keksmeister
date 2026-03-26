/**
 * Build script: converts docs/*.md → _site/docs/*.html
 *
 * Usage: bun run scripts/build-docs.ts
 *
 * Reads all Markdown files from docs/, converts to HTML via `marked`,
 * wraps them in a shared layout with navigation, and writes to _site/docs/.
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { marked } from 'marked';

const DOCS_DIR = join(import.meta.dirname, '..', 'docs');
const OUT_DIR = join(import.meta.dirname, '..', '_site', 'docs');

interface DocPage {
  slug: string;
  title: string;
  filename: string;
  html: string;
}

/** Extract the first # heading from markdown as the page title. */
function extractTitle(md: string): string {
  const match = md.match(/^#\s+(.+)$/m);
  return match ? match[1] : 'Documentation';
}

/** Define the order and grouping of nav items. */
const NAV_ORDER = [
  { slug: 'integration-guide', group: 'Guide' },
  { slug: 'lifecycle', group: 'Guide' },
  { slug: 'framework-vanilla', group: 'Frameworks' },
  { slug: 'framework-angular', group: 'Frameworks' },
  { slug: 'framework-react', group: 'Frameworks' },
  { slug: 'framework-vue', group: 'Frameworks' },
];

function buildNav(pages: DocPage[], currentSlug: string): string {
  let html = '<nav class="docs-nav">\n';
  html += '  <a href="../index.html" class="docs-nav__home">Keksmeister</a>\n';

  let currentGroup = '';
  for (const entry of NAV_ORDER) {
    const page = pages.find((p) => p.slug === entry.slug);
    if (!page) continue;

    if (entry.group !== currentGroup) {
      if (currentGroup) html += '  </div>\n';
      currentGroup = entry.group;
      html += `  <div class="docs-nav__group">\n`;
      html += `    <span class="docs-nav__group-label">${currentGroup}</span>\n`;
    }

    const active = page.slug === currentSlug ? ' class="active"' : '';
    html += `    <a href="${page.slug}.html"${active}>${page.title}</a>\n`;
  }
  if (currentGroup) html += '  </div>\n';

  html += '  <div class="docs-nav__group">\n';
  html += '    <span class="docs-nav__group-label">Links</span>\n';
  html += '    <a href="https://github.com/footageone/keksmeister">GitHub</a>\n';
  html += '    <a href="https://www.npmjs.com/package/keksmeister">npm</a>\n';
  html += '    <a href="https://www.jsdelivr.com/package/npm/keksmeister">jsDelivr</a>\n';
  html += '  </div>\n';

  html += '</nav>';
  return html;
}

function layout(page: DocPage, nav: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${page.title} — Keksmeister Docs</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: system-ui, -apple-system, sans-serif;
      color: #1a1a1a;
      line-height: 1.6;
      display: flex;
      min-height: 100vh;
    }

    /* Sidebar nav */
    .docs-nav {
      width: 260px;
      min-width: 260px;
      padding: 24px 16px;
      background: #f8f9fa;
      border-right: 1px solid #e5e7eb;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .docs-nav__home {
      font-weight: 700;
      font-size: 16px;
      color: #1a1a1a;
      text-decoration: none;
      padding: 8px 12px;
      margin-bottom: 12px;
    }
    .docs-nav__home::before { content: '\\1F36A '; }
    .docs-nav__group {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-bottom: 8px;
    }
    .docs-nav__group-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      padding: 8px 12px 4px;
    }
    .docs-nav a:not(.docs-nav__home) {
      display: block;
      padding: 6px 12px;
      border-radius: 6px;
      color: #374151;
      text-decoration: none;
      font-size: 14px;
    }
    .docs-nav a:not(.docs-nav__home):hover { background: #e5e7eb; }
    .docs-nav a.active {
      background: #1a1a1a;
      color: #fff;
    }

    /* Main content */
    .docs-content {
      flex: 1;
      max-width: 800px;
      padding: 40px 48px;
    }

    /* Typography */
    .docs-content h1 {
      font-size: 2em;
      margin-bottom: 8px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .docs-content h2 {
      font-size: 1.4em;
      margin-top: 40px;
      margin-bottom: 12px;
    }
    .docs-content h3 {
      font-size: 1.15em;
      margin-top: 28px;
      margin-bottom: 8px;
    }
    .docs-content h4 {
      font-size: 1em;
      margin-top: 20px;
      margin-bottom: 8px;
    }
    .docs-content p { margin-bottom: 16px; }
    .docs-content ul, .docs-content ol {
      margin-bottom: 16px;
      padding-left: 24px;
    }
    .docs-content li { margin-bottom: 4px; }
    .docs-content blockquote {
      border-left: 3px solid #2563eb;
      padding: 12px 16px;
      margin-bottom: 16px;
      background: #eff6ff;
      border-radius: 0 6px 6px 0;
      color: #1e40af;
    }
    .docs-content blockquote p { margin-bottom: 0; }

    /* Code */
    .docs-content code {
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 0.875em;
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .docs-content pre {
      background: #1e1e2e;
      color: #cdd6f4;
      padding: 16px 20px;
      border-radius: 8px;
      overflow-x: auto;
      margin-bottom: 16px;
      line-height: 1.5;
    }
    .docs-content pre code {
      background: none;
      padding: 0;
      font-size: 13px;
      color: inherit;
    }

    /* Tables */
    .docs-content table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .docs-content th, .docs-content td {
      padding: 8px 12px;
      border: 1px solid #e5e7eb;
      text-align: left;
    }
    .docs-content th {
      background: #f8f9fa;
      font-weight: 600;
    }

    /* Responsive */
    @media (max-width: 768px) {
      body { flex-direction: column; }
      .docs-nav {
        width: 100%;
        min-width: 100%;
        height: auto;
        position: static;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 0;
        padding: 12px;
        border-right: none;
        border-bottom: 1px solid #e5e7eb;
      }
      .docs-nav__group {
        flex-direction: row;
        flex-wrap: wrap;
        gap: 4px;
        margin-bottom: 0;
      }
      .docs-nav__group-label { display: none; }
      .docs-content { padding: 24px 16px; }
    }
  </style>
</head>
<body>
  ${nav}
  <main class="docs-content">
    ${page.html}
  </main>
</body>
</html>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const files = (await readdir(DOCS_DIR)).filter((f) => f.endsWith('.md')).sort();

  const pages: DocPage[] = [];
  for (const file of files) {
    const md = await readFile(join(DOCS_DIR, file), 'utf-8');
    const html = await marked(md);
    const slug = basename(file, '.md');
    const title = extractTitle(md);
    pages.push({ slug, title, filename: file, html });
  }

  for (const page of pages) {
    const nav = buildNav(pages, page.slug);
    const html = layout(page, nav);
    await writeFile(join(OUT_DIR, `${page.slug}.html`), html);
    console.log(`  ${page.slug}.html`);
  }

  // Generate index that redirects to integration guide
  const indexHtml = `<!DOCTYPE html>
<html><head><meta http-equiv="refresh" content="0;url=integration-guide.html" /></head></html>`;
  await writeFile(join(OUT_DIR, 'index.html'), indexHtml);

  console.log(`\n${pages.length} docs pages generated in _site/docs/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
