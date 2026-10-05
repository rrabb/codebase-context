/* eslint-disable */
// @ts-nocheck
// Golden query corpus for ai:find, grouped by how an AI assistant would phrase a prompt.
// Expectations are grounded against the committed .ai-context/exb indexes (ExB 1.20.0).
// Regenerate expectations only after a deliberate scoring/schema change, never to paper over a regression.

// literal: an exact API name must resolve to this canonical symbol as the top result.
export const literalQueries = [
  { terms: ['DataSourceManager'], topApiId: 'jimu-core::DataSourceManager' },
  { terms: ['WidgetManager'], topApiId: 'jimu-core::WidgetManager' },
  { terms: ['SettingSection'], topApiId: 'jimu-ui/advanced/setting-components::SettingSection' },
  { terms: ['JimuMapViewComponent'], topApiId: 'jimu-arcgis::JimuMapViewComponent' },
  { terms: ['DataSourceManager'], member: 'getDataSource', topApiId: 'jimu-core::DataSourceManager' },
];

// semantic: a capability word (not the type name) should surface the right API within the top matches.
export const semanticQueries = [
  { terms: ['loading'], expectApiId: 'jimu-ui::Loading', withinTop: 8 },
  { terms: ['setting'], expectApiId: 'jimu-ui/advanced/setting-components::SettingSection', withinTop: 12 },
];

// conceptual: a multi-word phrase should yield ranked symbols plus related documentation navigation.
export const conceptualQueries = [
  {
    terms: ['feature', 'layer'],
    minResults: 3,
    minRelatedDocs: 1,
    expectApiIdWithin: { apiId: 'jimu-core::FeatureLayerDataSource', top: 12 },
  },
];

// thin: internal or unknown names must trigger an escalation block instead of a confident guess.
export const thinQueries = [
  { terms: ['widgetMutableStatePropChange'], expectMentions: true },
  { terms: ['zzznotarealapi123'], expectResults: 0 },
];

// fuzzy: typos (edit distance <= 2) and common abbreviations must still resolve.
export const fuzzyQueries = [
  { terms: ['SettingSecton'], topApiId: 'jimu-ui/advanced/setting-components::SettingSection' },
  { terms: ['DataSrcManager'], topApiId: 'jimu-core::DataSourceManager' },
  { terms: ['WidgetMgr'], topApiId: 'jimu-core::WidgetManager' },
];

// exhaustive: --all lists every substring match, past the ranked top-12 cap.
export const allModeQuery = { terms: ['SourceManager'], minMatches: 13 };

// scoped: --in lists every usage of one member inside a widget, with no sampling.
// Each scope form (owner, folder path) must return exactly these files and lines.
export const scopedQuery = {
  terms: ['DataSourceStatus.NotReady'],
  apiId: 'jimu-core::DataSourceStatus.NotReady',
  scopes: ['common/list', 'client/dist/widgets/common/list'],
  expectLines: {
    'ArcGISExperienceBuilder/client/dist/widgets/common/list/src/runtime/components/data-source/data-count.tsx': [32, 33],
    'ArcGISExperienceBuilder/client/dist/widgets/common/list/src/runtime/components/list-status-component/empty-and-not-ready-tips.tsx': [29],
    'ArcGISExperienceBuilder/client/dist/widgets/common/list/src/runtime/components/list-status-component/record-load-status-a11y.tsx': [22, 23],
  },
};

// jsx attribute: `<DataSourceComponent onDataSourceStatusChange={...}>` must count as a usage of the Props member,
// even though the emitted .d.ts inlines the props as a type literal.
export const jsxAttributeQuery = {
  terms: ['DataSourceComponentProps#onDataSourceStatusChange'],
  scope: 'common/list',
  expectUsage: { path: 'ArcGISExperienceBuilder/client/dist/widgets/common/list/src/runtime/components/data-source/data-source-component.tsx', line: 318, usage_kind: 'jsx-prop' },
};
