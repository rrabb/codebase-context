/* eslint-disable */
// @ts-nocheck
// Behavioral tests: does ai:find answer literal, semantic, conceptual, and thin prompts well?

import test from 'node:test';
import assert from 'node:assert/strict';
import { runFind } from './helpers.mjs';
import { literalQueries, semanticQueries, conceptualQueries, thinQueries, fuzzyQueries, allModeQuery, scopedQuery, jsxAttributeQuery } from './golden-queries.mjs';

test('literal API-name prompts resolve to the exact canonical symbol', async (t) => {
  for (const query of literalQueries) {
    const label = query.terms.join(' ') + (query.member ? ` #${query.member}` : '');
    await t.test(label, () => {
      const out = runFind(query.terms, query.member ? ['--members'] : []);
      assert.ok(out.results.length > 0, 'expected at least one result');
      assert.equal(out.results[0].symbol.api_id, query.topApiId);
      assert.equal(out.escalation, null, 'a known API should not escalate as thin');
      const top = out.results[0];
      assert.ok(top.declarations.length > 0 || top.exports.length > 0, 'expected a declaration or export locator');
      if (query.member) {
        assert.ok(top.members.some((row) => row.member_name === query.member), `expected member ${query.member}`);
      }
    });
  }
});

test('semantic capability prompts surface the relevant component', async (t) => {
  for (const query of semanticQueries) {
    await t.test(query.terms.join(' '), () => {
      const out = runFind(query.terms);
      const ids = out.results.slice(0, query.withinTop).map((row) => row.symbol.api_id);
      assert.ok(ids.includes(query.expectApiId), `expected ${query.expectApiId} within top ${query.withinTop}, got: ${ids.join(', ')}`);
    });
  }
});

test('conceptual prompts yield ranked symbols and related documentation', async (t) => {
  for (const query of conceptualQueries) {
    await t.test(query.terms.join(' '), () => {
      const out = runFind(query.terms);
      assert.ok(out.results.length >= query.minResults, `expected >= ${query.minResults} results`);
      assert.ok(out.relatedDocumentation.length >= query.minRelatedDocs, 'expected related documentation entries');
      if (query.expectApiIdWithin) {
        const ids = out.results.slice(0, query.expectApiIdWithin.top).map((row) => row.symbol.api_id);
        assert.ok(ids.includes(query.expectApiIdWithin.apiId), `expected ${query.expectApiIdWithin.apiId} in results`);
      }
    });
  }
});

test('thin or unknown prompts trigger an escalation path instead of guessing', async (t) => {
  for (const query of thinQueries) {
    await t.test(query.terms.join(' '), () => {
      const out = runFind(query.terms);
      assert.notEqual(out.escalation, null, 'expected an escalation block');
      if (typeof query.expectResults === 'number') {
        assert.equal(out.results.length, query.expectResults);
      }
      if (query.expectMentions) {
        assert.ok(out.escalation.mentions.length > 0, 'expected comment/string mention evidence');
      }
    });
  }
});

test('a loose fuzzy neighbor with real usage cannot suppress escalation for the literal target', () => {
  const out = runFind(['widgetMutableStatePropChange']);
  const target = out.results.find((result) => result.symbol.api_id.endsWith('::widgetMutableStatePropChange'));
  assert.ok(target, 'expected the literal target symbol in results');
  assert.equal(target.confidentMatch, true, 'the literal target should be a confident match');
  assert.notEqual(out.escalation, null, 'a confident, evidence-free target must still escalate');
  const looseNeighbor = out.results.find((result) => !result.confidentMatch && result.summary?.behavioral_usages > 0);
  assert.ok(looseNeighbor, 'expected a loose fuzzy neighbor with real usage evidence to still be shown');
});

test('typos and abbreviations still resolve to the intended symbol', async (t) => {
  for (const query of fuzzyQueries) {
    await t.test(query.terms.join(' '), () => {
      const out = runFind(query.terms);
      assert.ok(out.results.length > 0, 'expected a fuzzy match');
      assert.equal(out.results[0].symbol.api_id, query.topApiId);
    });
  }
});

test('--all lists every substring match past the ranked cap', () => {
  const out = runFind(allModeQuery.terms, ['--all']);
  assert.equal(out.mode, 'all');
  assert.ok(out.count >= allModeQuery.minMatches, `expected >= ${allModeQuery.minMatches} matches, got ${out.count}`);
  assert.equal(out.matches.length, out.count);
});

test('--in lists every usage of an exact member inside the scope', async (t) => {
  for (const scope of scopedQuery.scopes) {
    await t.test(scope, () => {
      const out = runFind(scopedQuery.terms, ['--in', scope]);
      assert.equal(out.mode, 'in');
      assert.deepEqual(out.targets.map((row) => row.api_id), [scopedQuery.apiId]);
      const actual = {};
      for (const usage of out.usages) (actual[usage.path] ??= []).push(usage.line);
      assert.deepEqual(actual, scopedQuery.expectLines);
    });
  }
});

test('--in with an unrelated scope returns no usages instead of falling back', () => {
  const out = runFind(scopedQuery.terms, ['--in', 'zzz-no-such-widget']);
  assert.equal(out.count, 0);
  assert.deepEqual(out.usages, []);
});

test('JSX attributes are indexed as usages of the Props member', () => {
  const out = runFind(jsxAttributeQuery.terms, ['--in', jsxAttributeQuery.scope]);
  const { path, line, usage_kind: usageKind } = jsxAttributeQuery.expectUsage;
  assert.ok(out.usages.some((usage) => usage.path === path && usage.line === line && usage.usage_kind === usageKind), `expected ${path}:${line} as ${usageKind}`);
});

test('results carry skill cross-links and coverage health for AI consumers', () => {
  const out = runFind(['DataSourceManager'], ['--members']);
  const top = out.results[0];
  assert.equal(top.skill, 'jimu-framework-apis');
  assert.ok(top.coverageHealth && typeof top.coverageHealth.ratio === 'number', 'expected coverageHealth ratio');
  assert.ok(Array.isArray(top.memberDocLinks), 'expected memberDocLinks array');
});

test('semantic mode adds a conceptual documentation tier without changing the default', () => {
  const plain = runFind(['loading', 'spinner']);
  assert.equal(plain.semanticDocumentation.length, 0, 'default should not populate semanticDocumentation');
  const semantic = runFind(['loading', 'spinner'], ['--semantic']);
  assert.ok(semantic.semanticDocumentation.length > 0, 'expected semantic matches under --semantic');
});
