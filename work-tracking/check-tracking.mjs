import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
if (args.length > 1) {
  console.error("Usage: node check-tracking.mjs [tracking-directory]");
  process.exit(2);
}

const trackingDir = args[0]
  ? path.resolve(args[0])
  : path.dirname(fileURLToPath(import.meta.url));
const dashboardPath = path.join(trackingDir, "dashboard.md");
const topicsDir = path.join(trackingDir, "items");
const errors = [];

function withoutComments(markdown) {
  return markdown.replace(/<!--[\s\S]*?-->/g, "");
}

function lineNumber(markdown, offset) {
  return markdown.slice(0, offset).split("\n").length;
}

function markdownLinks(markdown) {
  return markdown.matchAll(/!?\[[^\]]*\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+[^)]*)?\)/g);
}

function isExternalLink(target) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target);
}

async function collectTopics(directory) {
  const topics = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.toLowerCase() !== "notes") {
        topics.push(...await collectTopics(entryPath));
      }
    } else if (entry.isFile() && /^WI-\d{3}-.+\.md$/i.test(entry.name)) {
      topics.push(entryPath);
    }
  }

  return topics;
}

async function checkLinks(markdown, sourcePath) {
  for (const match of markdownLinks(markdown)) {
    const rawTarget = match[1].replace(/^<|>$/g, "");
    if (isExternalLink(rawTarget)) {
      continue;
    }

    const targetPath = rawTarget.split(/[?#]/, 1)[0];
    if (!targetPath) {
      continue;
    }

    let decodedPath;
    try {
      decodedPath = decodeURIComponent(targetPath);
    } catch {
      errors.push(`${path.relative(trackingDir, sourcePath)}:${lineNumber(markdown, match.index)}: invalid URL encoding in link "${rawTarget}"`);
      continue;
    }

    const resolvedPath = path.resolve(path.dirname(sourcePath), decodedPath);
    try {
      await stat(resolvedPath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      errors.push(`${path.relative(trackingDir, sourcePath)}:${lineNumber(markdown, match.index)}: broken local link "${rawTarget}"`);
    }
  }
}

const dashboard = withoutComments(await readFile(dashboardPath, "utf8"));
const dashboardLines = dashboard.split(/\r?\n/);
let detachedTable = false;
for (const [index, line] of dashboardLines.entries()) {
  if (!/^\s*\|/.test(line)) {
    detachedTable = false;
    continue;
  }

  if (index === 0 || dashboardLines[index - 1].trim() === "") {
    const nextLine = dashboardLines[index + 1] ?? "";
    const hasSeparator = /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/.test(nextLine);
    detachedTable = !hasSeparator;
  }

  if (detachedTable && /\bWI-\d{3}\b/i.test(line)) {
    errors.push(`dashboard.md:${index + 1}: WI row is split from its table by a blank line; restore it below the table header and separator`);
  }
}

const anchorNames = new Map();
for (const match of dashboard.matchAll(/<a\s+name=["']([^"']+)["']\s*><\/a>/gi)) {
  const name = match[1];
  if (!/^wi-/i.test(name)) {
    continue;
  }

  const line = lineNumber(dashboard, match.index);
  if (!/^wi-\d{3}$/.test(name)) {
    errors.push(`dashboard.md:${line}: WI anchor "${name}" must use the format wi-NNN`);
  }
  if (anchorNames.has(name)) {
    errors.push(`dashboard.md:${line}: duplicate WI anchor "${name}" (first seen on line ${anchorNames.get(name)})`);
  } else {
    anchorNames.set(name, line);
  }
}

for (const match of markdownLinks(dashboard)) {
  const rawTarget = match[1].replace(/^<|>$/g, "");
  const topicMatch = rawTarget.match(/(?:^|\/)items\/(WI-(\d{3})-.+\.md)(?:[?#].*)?$/i);
  if (!topicMatch) {
    continue;
  }

  const expectedAnchor = `wi-${topicMatch[2]}`;
  const line = dashboard.slice(0, match.index).split("\n").at(-1);
  if (!line.includes(`<a name="${expectedAnchor}"></a>`)) {
    errors.push(`dashboard.md:${lineNumber(dashboard, match.index)}: topic link "${topicMatch[1]}" needs the matching ${expectedAnchor} anchor on the same row`);
  }
}

const topicPaths = await collectTopics(topicsDir);
await checkLinks(dashboard, dashboardPath);
for (const topicPath of topicPaths) {
  const topic = withoutComments(await readFile(topicPath, "utf8"));
  await checkLinks(topic, topicPath);
}

if (errors.length > 0) {
  console.error(`check-tracking: found ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`check-tracking: dashboard and ${topicPaths.length} topic file${topicPaths.length === 1 ? "" : "s"} passed.`);
}
