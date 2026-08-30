---
domain: coding
category: nfl-draft-2026-sheets
date-created: 2026-08-27
date-revised: 2026-08-27
type: plan
status: DONE
aliases:
tags:
---

# 2026-08-27-start-here-and-save-analysis

## goal

Two changes to the Draft War Room Apps Script, designed before implementation. First, a redesigned `Save current analysis` command that saves the analysis itself, not just its selector inputs. Second, an `Update Start Here guide` command that rewrites the stale `Start Here` tab with current navigation and instructions, including how to save an analysis. No live Sheets connector is attached to this session, so both changes ship through `apps-script/code.gs` and take effect when the commissioner attaches the script and runs the menu actions.

## design-save-current-analysis

The current command asks three sequential prompts (name, free-text type validated against an allowlist, notes) and appends one selector row to `Analysis-Saved`. That row is a bookmark, not a save: reopening the view later shows current data, and a typo in the type prompt aborts the flow after the name was already entered.

The redesign is save-what-you-are-looking-at:

- The analysis type is detected from the active sheet instead of prompted: `Team-Compare` with the cursor at row 45 or below is `Team Comparison` and at row 46 or above is `Fantasy Team Comparison` (the fantasy block starts at row 52), `Players-Compare` is `Player Comparison`, `Players-College Cohorts` is `College Review`, `Mock Lab` is `Mock Review`, and any other content tab is `Custom`.
- Two prompts remain: a required name (the prompt title shows the detected type) and optional notes. Cancel at either prompt aborts with no writes.
- The command creates a values-only snapshot tab: it copies the active sheet, pastes values over the whole data range so formulas freeze at their current results while formatting survives, removes embedded charts (they would keep pointing at live ranges), names the tab `Saved - <name>` with invalid sheet-name characters stripped, a length cap, and a `(2)`-style suffix on collision, and colors the tab grey.
- The `Analysis-Saved` index row keeps its existing 14 columns (name, type, three team selectors, five player selectors, college selector, notes, saved by, timestamp) and gains column O `Snapshot`, a `HYPERLINK` to the snapshot tab's gid. The header cell is ensured idempotently. Fantasy team comparisons read the `B52`, `G52`, `L52` selectors; every other type reads `B3`, `L3`, `V3`, as today.
- Control tabs refuse to save with an alert: `Analysis-Saved` itself, `Update Log`, `_updates`, `_config`, `Start Here`, and any existing `Saved - ` snapshot.

Considered and rejected: an HtmlService dialog form (better UX but adds an untestable surface for marginal gain over two prompts), one snapshot region appended inside `Analysis-Saved` (mixed-shape blocks in one tab are unreadable), and keeping the selector-only row (does not satisfy save the analysis). Known tradeoff: `Run system checks` scans snapshot tabs too, so a snapshot that captured an error literal at save time will flag the workbook error scan; that is treated as signal, not noise.

## design-update-start-here-guide

The live `Start Here` tab (confirmed via a Drive CSV export of the first sheet on 2026-08-27) has a title block, an At A Glance card, and a 14-row Quick Navigation list that predates `Team-Compare`, `Draft-Actual`, `Analysis-Saved`, `Draft Rules`, and Commissioner Dashboard, and says nothing about the Draft War Room menu.

A new menu action `Update Start Here guide` rewrites the tab deterministically:

- Title block rows 1 to 3 keep the existing title, attribution, and description text.
- At A Glance keeps its four rows; the workbook status cell gets the same pick-count formula `repairKnownIssues` installs, and the label stays inside `A1:A20` so `startHereStatusHealthy_` keeps working.
- Quick Navigation is rebuilt from the live sheet list, covering every user-facing tab including the five missing ones; the Open column becomes real `HYPERLINK("#gid=...")` links resolved at runtime, and rows for tabs that do not exist are skipped rather than written dead.
- Three new instruction sections follow: Draft War Room Menu (each command, when to run it, what it does), Save An Analysis (four steps describing the redesigned command), and First-Time Setup (the onboarding sequence from the README).
- The function clears a bounded region before writing, bolds the title and section headers, and is idempotent; rerunning after any tab change refreshes the links. The tab is script-owned content, so manual edits to it are overwritten by design and the guide says so.

## design-snapshot-performance-tracking

Requested mid-delivery: the saved analysis should also report how it performed as reality actualizes, A/B style. The snapshot tab is the frozen A side; the live workbook is the B side. Three columns join them on the `Analysis-Saved` index: `Picks At Save` (static, the pick count when the analysis was saved), `Players Drafted Now` (live count of the row's five player selectors that now appear in the Draft Tracker), and `Avg Actual Overall Now` (live average actual draft position of those players). Rows without player selectors leave the live columns blank. Deeper per-cell diffing of snapshot versus live view was considered and rejected: every view has different semantics, so a generic diff would be noise.

## design-mobile-view

Requested mid-delivery: a vertical, iPhone-friendly view. A new `Mobile` tab, one narrow column (360 px), built by a new `Rebuild mobile view` menu action. Draft mode stacks: title, mode banner, Draft Status (feed state, picks in, last pick, last update), Top Available (top 15 undrafted Big Board prospects as single text lines), Season (completion status plus the 12 league teams and managers), and Shortcuts (tap-through `HYPERLINK` links to Season Forecast, Team Report, Team Compare, Dashboard, and Draft Rules). Season mode reorders to Season first, relabels the draft block `Draft Recap`, and relabels availability `Undrafted Free Agents`. The Top Available line uses Big Board columns A (rank), B (player), E (position group), and Q (actual overall) per the documented `P:T` contract; column E follows the Board-By Position projection mapping and must be spot-checked after attachment.

## design-season-focus-automation

Requested mid-delivery: one week after the draft closes, mobile users should land on season content. Any refresh that validates all 257 picks records a completion timestamp in script properties and installs a daily `seasonFocusCheck` trigger. Each day the check compares now against completion plus seven days; once past, it sets the stored mobile mode to `SEASON`, builds the Season Forecast tab if it is missing, rebuilds `Mobile` season-first, moves `Mobile` to the front of the tab list so new opens land on it, logs a `SEASON` row to `Update Log`, and removes its own trigger. The one-week delay is checked against the recorded timestamp, not trigger cadence, so a missed day cannot skip the transition.

## design-season-forecast

Requested mid-delivery: complete season forecasting with head-to-heads and champion odds the league can bet on. A new `Season Forecast` tab, built by `Build season forecast`, driven entirely by inputs the league controls because no external projection feed exists in this workbook. Inputs: an editable `Regular season games` count (default 14) and an editable `Power Rating` per fantasy team (default 50), plus an editable `Actual Wins` column. Derived live: a full head-to-head win-probability matrix using an Elo-style logistic on rating difference (`1/(1+10^((Rb-Ra)/25))`), expected wins (average head-to-head probability times season length), `Forecast Delta` (actual minus expected, the season-level A/B readout), champion probability (softmax over ratings), and fair betting lines with no vig in decimal and American formats. Rebuilds preserve edited ratings, actual wins, and season length by team name, so the league updates ratings weekly and every forecast recomputes. Teams come from `_config!F2:G13`; fewer than two configured teams refuses with an alert.

## design-comprehensive-visualization

Requested mid-delivery: comprehensive visualization and charts across the workbook, designed into the spreadsheet itself. Three layers, each matched to its surface. Native charts on `Season Forecast`: a Championship Odds bar chart and an Expected Vs Actual Wins column chart, rebuilt idempotently with the tab. Dashboard stays the single visual story: `Rebuild dashboard charts` keeps its six draft charts and now conditionally adds Championship Odds (when the forecast tab exists) and Saved Analysis Performance (picks at save versus players drafted now per saved analysis, once at least one exists), so the chart count reflects what the workbook actually has. In-cell `SPARKLINE` visuals on `Mobile`, because embedded charts do not fit a one-column phone layout: a draft progress bar under Draft Status and a champion-odds column sparkline in the Season section when the forecast exists.

## design-recommendations

Requested mid-delivery: recommendation options, live in the spreadsheet. A generated `Recommendations` tab built by `Build recommendations`, all formula-driven so every list reranks as data changes. Draft blocks from the Big Board: Undrafted Free Agent Targets (top ten available by NFL grade), Best Value Picks (largest positive actual-minus-rank slide), and Biggest Reaches (largest negative slide), each rendered as ranked options rather than a single dictate. Season blocks from the Season Forecast: Title Contenders (top three by champion odds), Dark Horse Value Plays (best payout outside the top three via `QUERY ... offset 3`), and Tightest Matchups (per team, the opponent whose head-to-head probability is closest to a coin flip, diagonal blanks masked before the distance comparison). A Draft Value Board bar chart visualizes the slide leaders. The season blocks degrade to a build-the-forecast pointer when the forecast tab is absent, and `seasonFocusCheck` builds the tab at the season flip when missing.

## design-player-bio-links

Requested mid-delivery: player names click through to their bios on every tab. Sheets cannot attach a link to a value cell without a formula, so the design has two halves. `Link player names to bios`, a new idempotent menu action, converts static player-name cells on the Big Board (`B2:B424`) and the restructured Draft Tracker player column into `HYPERLINK("#gid=<bios gid>&range=A"&MATCH(...))` formulas whose label is the name itself, so every `XLOOKUP` and `VLOOKUP` keyed on those cells keeps resolving; cells already holding any formula are left untouched, making reruns safe. Generated surfaces link at build time: the Mobile Top Available list and all optimizer and recommendation player lists wrap their name arrays in `ARRAYFORMULA(HYPERLINK(...))`, with `IFNA(...,1)` falling back to the top of `Player-Bios` for unmatched names. Spill views owned by other repairs (Board-By Position, Draft-Actual, team views) are deferred; converting their single-formula projections to linked columns is recorded here as follow-up rather than done piecemeal.

## design-draft-optimizer

Requested mid-delivery: forecast the optimized pick from the available players and the picks other teams have already made. A generated `Draft Optimizer` tab built by `Build draft optimizer` for the league's own draft. The bottom block is an editable snake Draft Board (pick number, round, fantasy team in snake order from `_config` team order, and a Player column with Big Board data validation) where the league records each pick as it happens. Everything above it derives live from that log: On The Clock (first unrecorded pick and its team), Recommended Now (top five available by NFL grade, excluding every recorded pick, linked to bios), Best Available By Group (top remaining player per position group), and Remaining Quality By Group (count of undrafted players at grade 6.5 or better, the scarcity signal for reach-versus-wait calls). Recorded picks and the editable round count (default 15) survive rebuilds keyed by pick number, so resizing the board mid-prep loses nothing.

## review-findings-resolved

The independent review confirmed four defects, each reproduced before fixing and each now guarded by a test that failed against the pre-fix code. Critical: `readForecastInputs_` read a hardcoded 12-row block, so in leagues of eight or fewer teams the head-to-head matrix rows (same team names) overwrote preserved power ratings with win probabilities on every rebuild, including the unattended `seasonFocusCheck` path; the read now stops at the first blank team row. Important: the Dashboard Championship Odds chart and the Mobile champion-odds sparkline were hardcoded to the 12-team span (`A5:A17`, `G6:G17`) and pulled section headers and matrix probabilities into smaller-league charts; both now size from `forecastLayout_`, and the mobile guard also requires a genuinely built forecast tab. Important: the saved-analysis `Avg Actual Overall Now` formula nested `ARRAYFORMULA` inside `IFERROR`, so one undrafted player blanked the whole average; `IFERROR` now sits inside `ARRAYFORMULA` for element-wise misses. The review also flagged a dead `forecastLayout_` assignment in `buildSeasonForecast_`, now removed.

## delivery

Implementation lands in `apps-script/code.gs` with new cases in the Node harness (`apps-script/code.test.js`): type detection, snapshot creation with values-paste and chart removal, collision suffixing, refusal tabs, cancel paths, index-row shape with hyperlink and performance columns, Start Here rewrite content and idempotence, mobile view layout in both modes, season focus timing and cleanup, forecast table and matrix construction with input preservation and charts, completion recording, dashboard chart coverage, bio-link conversion idempotence, recommendations blocks and chart, and the optimizer snake board with pick preservation and resizing. Docs updated in the same change: `README.md`, `architecture.md`, `data-model.md`, `operations.md`, `testing.md`. Verification gates: `node --check < apps-script/code.gs`, `node --test` (32 cases green), a live end-to-end parse of the production NFL tracker page through the real parser (257 valid picks on 2026-08-27), and an independent code review, per the session's `high` rigor level. This change landed alongside a concurrent session's `_actuals` tracker restructure; the two were reconciled in place, with the restructure treated as authoritative. Live-workbook effects still require the commissioner to attach the script and run the new menu actions; nothing in this change mutates the shared sheet directly.
