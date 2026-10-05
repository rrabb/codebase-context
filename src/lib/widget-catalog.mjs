/* eslint-disable */
// @ts-nocheck
// Shared pure helpers for both widget-index generators (regex build-ai-index.mjs and
// ts-morph build-ai-index-ts.mjs) so the manifest, catalog, and reverse-index outputs
// cannot diverge between the two variants.

export function namesFromArr (arr) {
  if (!Array.isArray(arr)) {
    return '';
  }
  return arr
    .map((x) => (typeof x === 'string' ? x : (x && (x.messageType || x.name || x.actionType || x.actionName || x.label || x.type || x.point)) || ''))
    .filter(Boolean)
    .join(',');
}

// Manifest `properties` object -> CSV of enabled flags (key, or key=value for non-boolean).
export function propsCsv (obj) {
  if (!obj || typeof obj !== 'object') {
    return '';
  }
  return Object.entries(obj)
    .filter(([, v]) => v !== false && v != null)
    .map(([k, v]) => (v === true ? k : `${k}=${v}`))
    .join(',');
}

export function addUsage (map, key, wkey) {
  let u = map.get(key);
  if (!u) {
    u = { widgets: new Set(), files: 0 };
    map.set(key, u);
  }
  u.widgets.add(wkey);
  u.files++;
}

export function usageRows (map) {
  const rows = [];
  for (const [key, u] of map) {
    const widgets = Array.from(u.widgets).sort();
    rows.push(`${key}\t${u.files}\t${widgets.length}\t${widgets.join(',')}`);
  }
  return rows;
}

// One merged per-widget manifest digest row (identity + capabilities) plus the catalog entry.
export function manifestRow (json, group, widget, repoRel) {
  const dep = json.dependency ?? json.dependencies; // manifest field is `dependency` (string or array)
  const deps = Array.isArray(dep) ? dep.join('|') : (dep || '');
  const label = (json.label || '').toString().replace(/\t/g, ' ');
  const pub = namesFromArr(json.publishMessages);
  const ma = namesFromArr(json.messageActions);
  const da = namesFromArr(json.dataActions);
  const ly = namesFromArr(json.layouts);
  const props = propsCsv(json.properties);
  const exts = namesFromArr(json.extensions);
  const row = `${group}\t${widget}\t${json.name || ''}\t${label}\t${json.version || ''}\t${json.exbVersion || ''}\t${deps}\t${pub}\t${ma}\t${da}\t${ly}\t${props}\t${exts}\t${repoRel}`;
  const catalogEntry = widget ? { group, widget, label, version: json.version || '', exbVersion: json.exbVersion || '', deps } : null;
  return { row, catalogEntry };
}

export function catalogRows (counts, manifestByWidget) {
  const wkeys = new Set([...counts.keys(), ...manifestByWidget.keys()]);
  const rows = [];
  for (const wkey of wkeys) {
    const c = counts.get(wkey) || { symbols: 0, components: 0, hooks: 0, classes: 0 };
    const man = manifestByWidget.get(wkey) || {};
    const [group, widget] = wkey.split('/');
    rows.push(`${man.group || group}\t${man.widget || widget}\t${man.label || ''}\t${man.exbVersion || ''}\t${man.deps || ''}\t${c.components}\t${c.hooks}\t${c.classes}\t${c.symbols}`);
  }
  return rows;
}
