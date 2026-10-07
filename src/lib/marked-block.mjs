// A generated section inside a hand-written file, between begin and end marker comments.
import { createHash } from 'node:crypto';

export const hashText = (text) => createHash('sha256').update(text.replace(/\r\n/g, '\n').trim()).digest('hex');

const markers = (id) => [`<!-- codebase-context:begin ${id} -->`, `<!-- codebase-context:end ${id} -->`];

export function readBlock (text, id) {
  const [begin, end] = markers(id);
  const start = text.indexOf(begin);
  const stop = text.indexOf(end);
  if (start < 0 || stop < start)
    return null;
  return text.slice(start + begin.length, stop);
}

// Replaces the block, or inserts it after the first H1 heading (or at the top when there is none).
export function writeBlock (text, id, body) {
  const [begin, end] = markers(id);
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const block = `${begin}${eol}${body.trim().replace(/\r?\n/g, eol)}${eol}${end}`;
  const start = text.indexOf(begin);
  const stop = text.indexOf(end);
  if (start >= 0 && stop > start)
    return text.slice(0, start) + block + text.slice(stop + end.length);
  const heading = text.match(/^# .*(\r?\n)/m);
  if (!heading)
    return `${block}${eol}${eol}${text}`;
  const at = heading.index + heading[0].length;
  return `${text.slice(0, at)}${eol}${block}${eol}${text.slice(at)}`;
}
