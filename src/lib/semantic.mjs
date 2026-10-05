/* eslint-disable */
// @ts-nocheck
// Zero-dependency semantic helpers for ai-find: a small curated concept map plus a
// query-time TF-IDF ranking over the already-small local documentation summaries.
// This widens conceptual recall ("loading spinner") without embeddings or a model.

// Phrase or word -> seed API terms. Hand-maintained; keep it small and specific.
export const CONCEPT_MAP = {
  'loading spinner': ['loading', 'progress'],
  'spinner': ['loading', 'progress'],
  'progress bar': ['progress', 'loading'],
  'dropdown': ['select', 'dropdown'],
  'combobox': ['select', 'combobox'],
  'map click': ['jimumapview', 'hittest'],
  'map view': ['jimumapview', 'jimumapviewcomponent'],
  'popup': ['popper', 'popup'],
  'tooltip': ['tooltip', 'popper'],
  'modal': ['modal', 'dialog'],
  'query': ['datasource', 'queriabledatasource', 'query'],
  'selection': ['selectionmanager', 'selection'],
  'feature layer': ['featurelayerdatasource', 'jimufeaturelayerview'],
  'table': ['table', 'datagrid'],
  'chart': ['chart'],
  'theme': ['theme', 'styled'],
  'settings panel': ['settingsection', 'settingrow'],
  'button': ['button'],
};

export function tokenize (text) {
  return String(text || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

// Expand a query into seed terms via the concept map, preserving the original words.
export function expandConcepts (query) {
  const lowered = String(query || '').toLowerCase().trim();
  const seeds = new Set(tokenize(lowered));
  for (const [phrase, terms] of Object.entries(CONCEPT_MAP)) {
    if (lowered.includes(phrase)) {
      for (const term of terms) seeds.add(term);
    }
  }
  return [...seeds];
}

// Rank documentation-like rows by TF-IDF against the expanded query terms.
export function rankDocs (queryTerms, rows, limit = 10) {
  const fields = (row) => `${row.summary || ''} ${row.symbol || ''} ${row.member || ''} ${row.title || ''} ${row.slug || ''} ${row.purpose || ''} ${row.key_symbols || ''} ${row.package || ''}`;
  const docTokens = rows.map((row) => tokenize(fields(row)));
  const total = rows.length || 1;
  const df = new Map();
  for (const tokens of docTokens) {
    for (const token of new Set(tokens)) df.set(token, (df.get(token) || 0) + 1);
  }
  const scored = rows.map((row, i) => {
    const tf = new Map();
    for (const token of docTokens[i]) tf.set(token, (tf.get(token) || 0) + 1);
    let score = 0;
    for (const term of queryTerms) {
      const freq = tf.get(term) || 0;
      if (!freq) continue;
      score += freq * Math.log(total / (1 + (df.get(term) || 0)));
    }
    return { row, score };
  });
  return scored
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.row);
}
