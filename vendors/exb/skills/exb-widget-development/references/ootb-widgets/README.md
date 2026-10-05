# OTB Widgets Knowledge Base (Phase 2 - widget cards)

Rich, source-grounded pattern cards for the out-of-the-box Esri Experience Builder widgets under
`ArcGISExperienceBuilder/client/dist/widgets/**`. Built on top of
[phase1-inventory.md](phase1-inventory.md). Each card is grounded in the ACTUAL widget source (not
memory), follows the standard card template, links to the official widget doc, and marks anything
uncertain as `UNVERIFIED` with the file that needs deeper inspection.

> **Goal:** fill gaps in model training data with the definitive OTB source. These widgets are the
> authoritative reference for jimu-core, jimu-ui, jimu-arcgis, jimu-for-builder, jimu-theme,
> jimu-layouts, the ArcGIS Maps SDK for JavaScript, Calcite, React + TypeScript, settings, runtime,
> messages/actions, and app-config patterns.

## Layout

```
references/ootb-widgets/
  phase1-inventory.md            <- Phase 1 table + classification (done)
  README.md                      <- this index + doc-link map + card tracker
  patterns/                      <- cross-cutting pattern docs (Phase 2)
    container-shared-code.md       lrs/geobim/layout as containers of sibling widgets
    internal-esri-component-libraries.md   @arcgis/business-analyst|imagery|analysis-* + registry
    arcgis-core-vs-esri-alias.md   @arcgis/core (new modules) vs esri/* (legacy alias)
  cards/                         <- one rich card per widget (Phase 2)
    data/        query, list, chart, filter, select, table, feature-info, timeline, add-data
    map-view/    arcgis-map, legend, map-layers, basemap-gallery, bookmark, swipe, coordinates,
                 coordinate-conversion, measurement, draw, my-location, directions, floor-filter
    3d-scene/    3d-toolbox, building-explorer, fly-controller, elevation-profile,
                 image-collection-explorer, oriented-imagery-viewer, display-order,
                 processing-templates, suitability-modeler
    analysis-rest/ analysis, near-me, utility-network-trace, branch-version-management,
                 print, feature-report, search, ba-infographic, survey123
    ui-app/      button, card, text, image, divider, menu, controller, navigator, embed, share,
                 login, theme-mode
    containers/  lrs/*, geobim/*, layout/*
```

## Widget -> official doc link map

Use the matching link in each card's "Online widget doc" line. Base:
`https://developers.arcgis.com/experience-builder/guide/`.

| dist folder | Doc link |
|---|---|
| arcgis/arcgis-map | .../map-widget/ |
| arcgis/basemap-gallery | .../basemap-gallery-widget/ |
| arcgis/map-layers | .../map-layers-widget/ |
| arcgis/legend | .../legend-widget/ |
| arcgis/coordinates | .../coordinates-widget/ |
| arcgis/coordinate-conversion | .../coordinate-conversion-widget/ |
| arcgis/measurement | .../measurement-widget/ |
| arcgis/directions | .../directions-widget/ |
| arcgis/bookmark | .../bookmark-widget/ |
| arcgis/draw | .../draw-widget/ |
| arcgis/floor-filter | .../floor-filter-widget/ |
| arcgis/swipe | .../swipe-widget/ |
| arcgis/my-location | .../my-location-widget/ |
| arcgis/near-me | .../near-me-widget/ |
| arcgis/elevation-profile | .../elevation-profile-widget/ |
| arcgis/analysis | .../analysis-widget/ |
| arcgis/suitability-modeler | .../suitability-modeler-widget/ |
| arcgis/oriented-imagery-viewer | https://developers.arcgis.com/experience-builder/GUID-1C6BA557-A545-43AC-A903-5FB06AFF0359/ |
| arcgis/processing-templates | .../processing-templates-widget/ |
| arcgis/display-order | .../image-display-order-widget/ |
| arcgis/image-collection-explorer | .../image-collection-explorer-widget/ |
| arcgis/3d-toolbox | .../3d-toolbox-widget/ |
| arcgis/fly-controller | .../fly-controller-widget/ |
| arcgis/building-explorer | .../building-explorer-widget/ |
| arcgis/utility-network-trace | .../utility-network-trace-widget/ |
| arcgis/branch-version-management | .../branch-version-management-widget/ |
| arcgis/feature-info | .../feature-info-widget/ |
| common/search | .../search-widget/ |
| common/list | .../list-widget/ |
| common/table | .../table-widget/ |
| common/chart | .../chart-widget/ |
| common/filter | .../filter-widget/ |
| common/date-filter | .../date-filter-widget/ |
| common/query | .../query-widget/ |
| common/select | .../select-widget/ |
| common/edit | .../edit-widget/ |
| common/feature-report | .../feature-report-widget/ |
| common/add-data | .../add-data-widget/ |
| survey123 | .../survey-widget/ |
| common/timeline | .../timeline-widget/ |
| common/text | .../text-widget/ |
| common/image | .../image-widget/ |
| common/button | .../button-widget/ |
| common/card | .../card-widget/ |
| common/embed | .../embed-widget/ |
| common/divider | .../divider-widget/ |
| common/menu | .../menu-widget/ |
| common/controller | .../widget-controller-widget/ |
| common/share | .../share-widget/ |
| common/login | .../login-widget/ |
| common/theme-mode | .../theme-mode-switcher-widget/ |
| common/navigator | .../view-navigation-widget/ |
| ba-infographic | .../business-analyst-widget/ |
| geobim/document-explorer | .../document-explorer-widget/ |
| geobim/document-viewer | .../document-viewer-widget/ |
| geobim/link-explorer | .../link-explorer-widget/ |
| layout/fixed | .../fixed-panel-widget/ |
| layout/sidebar | .../sidebar-widget/ |
| layout/row | .../row-widget/ |
| layout/column | .../column-widget/ |
| layout/grid | .../grid-widget/ |
| layout/accordion | .../accordion-widget/ |
| layout/flowrow | .../flow-row-widget/ |
| lrs/* | No dedicated core-widget doc page. LRS ships with the ArcGIS Location Referencing solution; link the LRS solution docs and mark `UNVERIFIED` for exact per-widget pages |

Reference docs used to cross-check cards: jimu API reference
`https://developers.arcgis.com/experience-builder/api-reference/`, sample code
`https://developers.arcgis.com/experience-builder/sample-code/`, core concepts (data source, message +
action, data action, extension points) under `.../guide/core-concepts/`.

## Card tracker

Status: [x] done, [~] in progress, [ ] pending.

**Cross-cutting patterns**
- [x] patterns/container-shared-code.md
- [x] patterns/internal-esri-component-libraries.md
- [x] patterns/arcgis-core-vs-esri-alias.md

**Cards** (72 total; prioritized by the Phase 1 high-value list)
- [x] data/query · [x] data/list · [x] data/chart · [x] data/filter · [x] data/select · [x] data/table · [x] data/feature-info · [x] data/timeline · [x] data/add-data · [x] data/date-filter · [x] data/edit
- [x] map-view/{arcgis-map, legend, map-layers, basemap-gallery, bookmark, swipe, coordinates, coordinate-conversion, measurement, draw, my-location, directions, floor-filter}
- [x] 3d-scene/{3d-toolbox, building-explorer, fly-controller, elevation-profile, image-collection-explorer, oriented-imagery-viewer, display-order, processing-templates, suitability-modeler}
- [x] analysis-rest/{analysis, near-me, utility-network-trace, branch-version-management, print, feature-report, search, ba-infographic, survey123}
- [~] ui-app/{button, card, text, image, divider, menu, controller, navigator, embed, share, login, theme-mode}
- [x] containers/{lrs/*, geobim/*, layout/*}

## Card template (standard for every card)

`# OTB Widget: <folder>` / Online widget doc / Purpose / Source paths inspected / Architecture overview /
Key imports and packages (grouped, with file path per import) / Reusable patterns found / Builder vs
runtime split / Lifecycle and cleanup / Manifest/config requirements / Gotchas / Useful snippets and
functions (each snippet preceded by its source path). Rules: no invented code; real snippets only; mark
uncertainty `UNVERIFIED` + name the file; large widgets get an architecture summary first, then split.
