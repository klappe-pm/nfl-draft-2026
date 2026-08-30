---
domain: coding
category: nfl-draft-2026-sheets
date-created: 2026-08-28
date-revised: 2026-08-28
type: plan
status: DONE
aliases:
tags:
---

# 2026-08-28-report-builder

## goal

A complete redesign of the workbook's scenario tooling into one centralized system, removing nothing. Every existing tool stays exactly as it is (`Save current analysis`, the comparison views, `Season Forecast`, `Recommendations`, `Draft Optimizer`); on top of them sits a custom report builder that can compose an analysis across every dimension of the workbook and save it through the same central registry, `Analysis-Saved`.

## design-centralization-model

`Analysis-Saved` becomes the single registry of everything saved, regardless of how it was produced. Quick saves (`Save current analysis`) keep writing their selector-plus-snapshot rows unchanged. Built reports append rows of type `Custom Report` with the same columns: name, notes, saved by, timestamp, a hyperlink to the produced tab, and picks-at-save. One index, two producers, nothing removed.

## design-report-builder-tab

A generated `Report Builder` control tab, created and refreshed by a new menu action `Open report builder`, with all selections surviving rebuilds:

- Settings block: `Report name` (free text), `Output mode` (dropdown, `Live` or `Frozen`), `Notes` (free text).
- Eight section slots, composed top to bottom: slot number, `Section Type` (dropdown from the catalog below), `Focus` (free text, resolved case-insensitively at generation time), and `Top N` (row cap for list sections, default 10).
- A live Focus Choices block listing the valid focus values by dimension (NFL teams from `_nfl_info`, position groups, fantasy teams from `_config`, colleges deduplicated from the Big Board) so composing never requires guessing a spelling.

## design-section-catalog

Each section type is a formula-block writer over a documented dimension, so live reports keep recalculating. A focus that does not resolve renders an inline warning row inside the report instead of failing the generation.

| Section type | Focus | Content |
|---|---|---|
| Draft Overview | none | Feed status, picks in, latest pick, progress sparkline. |
| NFL Team Draft | NFL team | That team's picks from `_actuals` with Big Board grades, players linked to bios. |
| Position Group Board | position group | Top N of the group by NFL grade with draft outcome. |
| College Cohort | college | That school's prospects, grades, and results. |
| Player Spotlight | player | The player's board row, draft result, and bio link. |
| Value Board | none | Top N steals and reaches by slide versus board rank. |
| Fantasy Team Outlook | fantasy team | Forecast row (rating, expected and actual wins, champion odds), tightest matchup, and that team's optimizer picks. |
| Season Forecast Summary | none | Championship odds table, top N by odds. |
| Fantasy Draft Board | none | The optimizer pick log recorded so far. |
| Custom Range | any A1 reference such as `Analytics!A4:I11` | Inlines any range in the workbook; the catch-all that makes every dimension reachable. |

## design-generation

`Generate report from builder`, a new menu action, reads the builder and produces the report:

- `Live` mode writes a formula-driven `Report - <name>` tab; regenerating with the same name overwrites that tab in place, so a live report is a maintained artifact.
- `Frozen` mode writes the same content into a values-only grey `Saved - <name>` tab through the existing snapshot flatten, with the existing collision suffix, so frozen reports join the saved-snapshot family and never overwrite anything.
- Every generation appends its `Custom Report` row to `Analysis-Saved`. An empty builder (no sections) alerts and writes nothing.

Sheet references follow house rules: names through `quoteSheetName_`, forecast offsets through `forecastLayout_`, optimizer offsets through `DRAFT_OPTIMIZER_LAYOUT`, Big Board columns per the documented contract (A rank, B player, C grade, D pos, E group, F college, Q actual overall), and no tracker column letters are hardcoded. `Report Builder` joins the refused list for quick-saves (it is a control tab); produced `Report - ` tabs remain quick-savable like any other view.

## review-findings-resolved

The independent review confirmed five defects, each fixed with a test that guards it. Critical: the Fantasy Team Outlook tightest-matchup formula called `INDEX` on a one-row range without the row argument, so any opponent past the first produced a swallowed `#REF!`; the row argument is now passed, matching the recommendations builder. Important: Custom Range passed the raw focus into the formula, so spaced sheet names like `Big Board` produced an uncatchable parse `#ERROR!` that would flip `runSystemChecks` to `CHECK`; the sheet segment is now resolved through `findSheetByNames_`, requoted with `quoteSheetName_`, and the A1 part validated strictly. Live regeneration cleared content but not formats, letting stale `0.0%` and bold bleed onto a reshaped report; the clear now includes `clearFormat`. NFL Team Draft and College Cohort embedded resolved values without doubling quotes; both now escape like the sibling sites. The delta repair could have written inside the compare grid's per-column `MAP` spills; it now detects a formula-driven grid and renames the metric label instead, which is the actual root-cause fix for the live sheet. The unused `choicesHeaderRow`/`choicesTop` constants were removed.

## delivery

Implementation in `apps-script/code.gs` following the established generated-tab pattern (find-or-insert, preserve declared inputs, clear, write rows then formulas, bold sections). New Node tests: builder creation with dropdown validation and choices, input preservation across rebuilds, live generation with section content and registry row, in-place regeneration, frozen generation with values-paste and collision suffix, unresolved-focus warning, and the empty-builder refusal. Docs updated in the same change: `README.md`, `architecture.md`, `data-model.md`, `operations.md`, `testing.md`, plus Start Here menu guide rows. Gates: `node --check`, full `node --test`, independent review, per `high` rigor. This lands alongside an active concurrent session; its header-resolved tracker access and grid-bounds test mock are treated as authoritative constraints.
