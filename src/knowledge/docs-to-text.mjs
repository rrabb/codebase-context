// Converts a folder of offline HTML docs (<slug>/index.html) into plain-text Markdown files that grep can search.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const entities = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#x27': "'", '#39': "'" };

const decode = (text) => text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
  if (entities[e.toLowerCase()] !== undefined)
    return entities[e.toLowerCase()];
  if (e[0] === '#')
    return String.fromCodePoint(e[1].toLowerCase() === 'x' ? Number.parseInt(e.slice(2), 16) : Number.parseInt(e.slice(1), 10));
  return m;
});

// Code viewers render a 1..N line-number gutter before the code; drop it.
const stripGutter = (code) => {
  const lines = code.split('\n');
  let n = 0;
  while (n < lines.length && lines[n].trim() === String(n + 1))
    n++;
  return lines.slice(n).join('\n');
};

export function htmlToText (html, select = 'main', dropLines = []) {
  const body = html.match(new RegExp(`<${select}[\\s>][\\s\\S]*?</${select}>`, 'i'))?.[0] ?? html;
  const blocks = [];
  const withPlaceholders = body.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (m, inner) => {
    const code = stripGutter(decode(inner.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/^\n+|\s+$/g, ''));
    blocks.push(code);
    return `\n@@CODE${blocks.length - 1}@@\n`;
  });
  let text = decode(withPlaceholders
    .replace(/<(script|style|svg|button|nav)[\s\S]*?<\/\1>/gi, '')
    .replace(/<h([1-6])[^>]*>/gi, (m, level) => `\n\n${'#'.repeat(Number(level))} `)
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<(p|tr|br|div|table)[^>]*>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+/g, ' ')
    .replace(/^ +/gm, '');
  for (const line of dropLines)
    text = text.split('\n').filter((l) => l.trim() !== line).join('\n');
  text = text
    .replace(/@@CODE(\d+)@@/g, (m, i) => `\n\`\`\`\n${blocks[Number(i)]}\n\`\`\`\n`)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim() || (text.match(/^#+ (.+)$/m)?.[1] ?? '');
  return { title, text };
}

const findPages = (root, rel = '', found = []) => {
  const dir = path.join(root, rel);
  existsSync(path.join(dir, 'index.html')) && rel && found.push(rel.replace(/\\/g, '/'));
  for (const name of readdirSync(dir)) {
    const child = path.join(dir, name);
    statSync(child).isDirectory() && findPages(root, path.join(rel, name), found);
  }
  return found;
};

// Writes <outDir>/<slug>.md for each page and <outDir>/index.tsv. Clears outDir first.
export function convertDocs ({ sourceDir, outDir, select = 'main', onlineBase = '', dropLines = [], relativeTo = process.cwd(), minChars = 200 }) {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const rows = [['slug', 'title', 'chars', 'local_path', 'online_url'].join('\t')];
  let written = 0;
  for (const slug of findPages(sourceDir).sort()) {
    const source = path.join(sourceDir, slug, 'index.html');
    const local = path.relative(relativeTo, source).replace(/\\/g, '/');
    const { title, text } = htmlToText(readFileSync(source, 'utf8'), select, dropLines);
    // Short pages are redirects or empty stubs.
    if (text.length < minChars)
      continue;
    const out = path.join(outDir, `${slug}.md`);
    mkdirSync(path.dirname(out), { recursive: true });
    const online = onlineBase ? `${onlineBase}${slug}/` : '';
    writeFileSync(out, `<!-- source: ${local}${online ? ` | online: ${online}` : ''} -->\n\n${text}\n`);
    rows.push([slug, title.replace(/\t/g, ' '), text.length, local, online].join('\t'));
    written++;
  }
  writeFileSync(path.join(outDir, 'index.tsv'), rows.join('\n') + '\n');
  return { written };
}
