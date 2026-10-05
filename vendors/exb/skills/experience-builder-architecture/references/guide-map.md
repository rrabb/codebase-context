# ExB developer guide map

Two copies of the guide exist. Prefer the local one: it matches the installed version.

| Copy | Location | Version |
| --- | --- | --- |
| Local | `ArcGISExperienceBuilder/exb-api-ref-docs/experience-builder/guide/<slug>/index.html` | 1.20, same as the installed ExB |
| Online | `https://developers.arcgis.com/experience-builder/guide/<slug>/` | Latest release. On 2026-10-04 this was 1.21 (JSAPI 5.1). Older "What's new" pages are under `guide/<version>/whats-new/`. |

The local pages are large HTML files (about 180 KB each). Search the plain-text copies instead: `.ai-context/exb/docs-text/guide/<slug>.md` (built by `npm run ai:knowledge`; `index.tsv` there lists every slug, title, and online URL). Pages marked "online only" were added after 1.20; check that they apply to 1.20 before relying on them.

| Section | Topic | Slug |
| --- | --- | --- |
| Introduction | What ExB and Jimu are; core concept list | `core-concepts` |
| Introduction | Product overview | `overview-of-experience-builder` |
| Release notes | What's new in 1.20 (local); older releases | `whats-new`, `1.19/whats-new`, ... |
| Requirements | Browsers, Node, portals | `requirements` |
| Downloads | Developer Edition and offline Node cache | `downloads` |
| Installation | Client ID, server and client install, offline install, Windows service | `install-guide` |
| Tutorials | Index; starter widget; map coordinates; add layers | `tutorials`, `create-a-starter-widget`, `get-map-coordinates`, `add-layers-to-a-map` |
| Core concepts | Jimu packages | `core-concepts/jimu` |
| Core concepts | AppConfig, draft vs published | `core-concepts/appconfig` |
| Core concepts | Map and scene view | `core-concepts/map-scene-view` |
| Application layout | Page, window, section and view, screen group, layout | `core-concepts/page`, `core-concepts/window`, `core-concepts/section-view`, `core-concepts/screen`, `core-concepts/layout` |
| Widget | What a widget is; widget UI options | `core-concepts/widget` |
| Theme | Theme concept | `core-concepts/theme` |
| Data source | Data source types, status, data views, output data sources | `core-concepts/data-source` |
| Interactivity | Message and action | `core-concepts/message-action` |
| Interactivity | Data action | `core-concepts/data-action` |
| Interactivity | Extension points (`AppConfigProcessor`, `DependencyDefine`, `ReduxStore`) | `extension-points` |
| Interactivity | Immutable config and state | `immutable` |
| Development | jimu-ui Storybook | `storybook` |
| Development | Extension repos, `your-extensions` | `getting-started-widget` |
| Development | Widget manifest | `widget-manifest` |
| Development | Widget files, props, i18n, JSAPI loading, inline editing, best practices | `extend-base-widget` |
| Development | Widget UI (jimu-ui, Calcite) | `widget-ui` |
| Development | Data sources in a widget | `use-data-source-in-widget` |
| Development | Map and scene views in a widget | `use-map-widget-in-widget` (online: `use-mapview-sceneview-in-a-widget`) |
| Development | Widget communication | `widget-communication` |
| Development | Assets, third-party libraries, shared code | `use-assets`, `third-party-libraries`, `share-code-between-widgets` |
| Development | Widget help, backward compatibility (version manager) | `add-help-to-your-widget`, `make-widgets-backward-compatible` |
| Development | Multi-language support | online only: `multi-language-support` |
| Development | Webpack override, copy files to `dist` | `override-webpack-config`, `copy-files-to-dist-folder` |
| Development | Themes: intro, custom theme, theme options, component styles, fonts, upgrade to new theme | `introduction-to-theme-development`, `create-a-custom-theme`, `customize-theme-options`, `customize-component-styles`, `using-custom-fonts`, `upgrade-to-new-theme` |
| Development | Debugging, unit testing, linting | `debugging-widget-development`, `unit-testing`, `linting` |
| Building apps | Express mode | `express-mode` |
| Building apps | Pages, data, theme, widgets, utility services, screen groups, windows, mobile layouts | `add-a-page`, `select-data`, `change-app-theme`, `add-widgets`, `add-utility-services`, `add-screen-groups`, `add-windows`, `design-for-mobile-devices` |
| Building apps | URL parameters, general settings | `url-parameters`, `general-settings` |
| Building apps | Save, preview, publish; widget version upgrades | `save-preview-publish` |
| Building apps | Import apps or templates | `import-apps-or-templates` |
| Building apps | Accessibility | `accessibility` |
| Building apps | Integrate with other apps, AI, manage translations | online only: `integrate-with-other-apps`, `experience-builder-ai`, `manage-translations` |
| Deployment | Download and host an app, `zipApp`, service worker | `experience-deployment` |
| Deployment | Widget and theme deployment | `widget-theme-deployment` |
| Deployment | Builder documentation URL | online only: `customize-documentation-url` |
| Configure built-in widgets | Overview; style settings; action triggers; advanced formatting; Arcade assistant | `widgets-overview`, `style-settings`, `action-triggers`, `advanced-formatting`, `use-arcade-assistant` |
| Configure built-in widgets | One page per OOTB widget | `<name>-widget`, for example `map-widget`, `list-widget`, `edit-widget`, `sidebar-widget` |
| About release versions | ExB, JSAPI, Enterprise, Calcite, Node, React versions | `release-versions` |
| Upgrade | Upgrading the Developer Edition | `upgrade` |
| Migrating from Web AppBuilder | WAB to ExB | `migrating-from-web-appbuilder` |
| FAQ | Common questions (map tools, extensions, editor errors) | `frequently-asked-questions` |

API reference: local `exb-api-ref-docs/experience-builder/api-reference/<package>/<Symbol>/index.html`, indexed in `.ai-context/exb/docs/api-reference.tsv`; use `npm run ai:find -- <Symbol>` first.
