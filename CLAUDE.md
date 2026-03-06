# LinkedIn Ads Bulk Editor

## Project Overview

A browser-based bulk editor for LinkedIn Campaign Manager CSV/TSV exports. Users upload exported files, edit campaigns/ad sets/ads in a spreadsheet-like UI, validate changes, review diffs, and export modified files back to LinkedIn-compatible format.

## Architecture

**Static modular SPA** — entry HTML plus split vanilla CSS/JS modules (no framework, no build step).

### File Structure

```
index.html                 # Main entry point
css/                       # Split style modules
js/                        # Split vanilla JS modules
```

### Internal Layout (top → bottom)

| Section | Lines (approx.) | Contents |
|---------|-----------------|----------|
| `<style>` | 1–850 | CSS variables, component styles, dark mode, responsive breakpoints |
| `<body>` HTML | 855–930 | Semantic markup: header, upload zone, tabs, workspace, modals, toast, templates |
| `<script>` | 930–2298 | All application logic |

### CSS Architecture

- **Custom properties** on `:root` for theming (light defaults)
- **Dark mode** via `@media (prefers-color-scheme: dark)` — overrides `:root` vars + component-specific dark styles
- **Naming**: short utility-style classes (`.c-in`, `.c-ro`, `.btn-p`, `.btn-s`, `.pill`, `.wh-card`, etc.)
- **Font**: Space Grotesk (Google Fonts import)
- **No CSS framework** — all vanilla CSS

### JavaScript Architecture

- **No framework or build step** — vanilla ES6+ in a single `<script>` block
- **Global state**: `TYPES` object defines schema for each entity type (campaigns, adsets, ads); per-type state includes `rows`, `orig`, `selected`, `sort`, `filter`, `validation`
- **Rendering**: imperative DOM manipulation via `innerHTML` + event delegation. Key render functions: `render()`, `renderTable()`, `renderInspector()`, `renderPreflight()`, `renderToolbar()`, `renderTabs()`, `updateBar()`
- **Shorthand helpers**: `Q()` = `querySelector`, `QA()` = `querySelectorAll`

### Entity Types

Defined in the `TYPES` constant:

| Key | Label | Detect header | Key fields |
|-----|-------|---------------|------------|
| `campaigns` | Campaigns | `campaign_Edit` | `campaignId`, `campaignName`, `status` |
| `adsets` | Ad Sets | `ad_set_Edit` | `adSetId`, `adSetName`, `adSetStatus` |
| `ads` | Ads | `ad_Edit` | `adId`, `adContentName`, `adStatus` |

Each type has a `cols` array defining column schema: `{ k, h, csv, edit, type, hide }`.

### Data Flow

1. **Upload** → `loadFile()` reads file → `parseFile()` / `parseMultilineTSV()` parses TSV
2. **Edit** → `setCellValue()` updates row data, `runValidation()` re-checks
3. **Review** → `showReview()` builds diff modal comparing current vs. `orig`
4. **Export** → `exportOne()` serializes rows back to TSV with original headers

## Conventions

- All rendering is imperative (`innerHTML`-based). No virtual DOM, no templates (except one `<template>` for Find & Replace).
- State mutations go through `setCellValue()` then re-render affected components.
- Validation issues are tracked in `state[type].validation.cellIssues` (Map) and `rowsWithIssues` (Set).
- CSS classes for state: `.mod` (modified row), `.issue` (row with validation issue), `.focus` (selected row), `.on` (active pill/filter).
- Status dots use `.dot-{status}` classes.
- Editable cells use `.c-in`, read-only use `.c-ro`.

## Important Constraints

- **Modular files**: Keep code organized in `css/` and `js/`; do not collapse back into a monolith unless explicitly asked.
- **No build tools**: No bundler, no npm, no transpilation. Code must run directly in the browser.
- **No external JS dependencies**: Everything is vanilla. The only external resource is the Google Fonts CSS import.
- **LinkedIn compatibility**: Exported TSV files must exactly match LinkedIn Campaign Manager's expected format (header prefixes like `*` and `**` are significant).
