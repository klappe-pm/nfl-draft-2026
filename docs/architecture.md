# architecture

## workbook-contract

The user-owned tab names and order are the workbook contract. Runtime automation uses immutable Google Sheets IDs rather than tab names, so moving or renaming a tab does not break Apps Script. Formula references use the current tab names: `Players-Draft Tracker`, `Big Board`, `Player-Bios`, `Players-College Cohorts`, `Players-Compare`, `Team-Compare`, `Team-Report`, `Draft-Actual`, `Analysis-Saved`, `_config`, `_nfl_info`, and `_updates`.

## source-of-truth

`_actuals!A:E` is the live official snapshot surface (Round, Pick, Overall, Team, Player), a script-managed staging tab created on first use. `Players-Draft Tracker` is the projection-versus-actual board. Its order as of 2026-08-28 is Player, Proj Pick, Act Pick, Value vs Rank, Board Rank, Pos, NFL Grade, Proj Team, Act Team, Proj Round, Act Round, then College through Status; the Act columns and Value vs Rank are guarded `XLOOKUP` formulas into `_actuals` that stay blank until actuals exist. That order is the owner's to change: the script resolves every tracker column by header label at runtime through `resolveTrackerColumns_` and refuses to write when a label is missing or duplicated, so a reorder degrades to a reported skip rather than formulas landing on the wrong data. `Big Board!A:U` is the prospect and actual-versus-projected source. `_config!A:P` owns commissioner settings and league participants. `_nfl_info!A:K` owns NFL reference metadata. Manual inputs in `_config`, `Draft Rules`, comparison selectors, and `Team-Needs` are authoritative.

## automation

`apps-script/code.gs` runs on Google servers. It obtains a document lock, fetches and validates the official NFL source, rejects invalid or regressive snapshots, and writes `_actuals!A2:E258` only after the complete snapshot validates; it never writes to the projection tracker. A scheduled refresh that validates all 257 picks removes its own trigger and logs `COMPLETE`. It updates `_updates`, appends `Update Log`, and exposes the `Draft War Room` menu, which also carries `Repair known issues` (targeted, idempotent fixes from the workbook audit), `Apply workbook theme` (consistent fonts, headers, freezes, banding, number formats), `Rebuild dashboard charts` (the Dashboard visual story: six draft charts from Analytics and Big Board, plus Championship Odds and Saved Analysis Performance once those surfaces exist), `Update Start Here guide` (deterministic rewrite of the `Start Here` tab with live navigation links and instructions), `Rebuild mobile view` (single-column `Mobile` tab for phones), and `Build season forecast` (head-to-head odds, expected wins, and champion odds from editable power ratings). Any refresh that validates all 257 picks records a completion timestamp and installs a daily `seasonFocusCheck` trigger; one week after completion the check switches `Mobile` to season mode, builds `Season Forecast` if missing, moves `Mobile` to the front of the tab list, and removes itself.

## flows

1. Official NFL tracker to Apps Script parser to validated `_actuals!A:E` snapshot, which feeds the tracker Act columns by player-name `XLOOKUP`.
2. `_actuals`, `Players-Draft Tracker`, and `Big Board` to `Analytics`, Dashboard metrics, native dashboard charts, `Draft-Actual`, `Team-Report`, and `Team-Compare`.
3. `Big Board` to `Players-Compare`, `Players-College Cohorts`, `Board-By Position`, and draft movement metrics.
4. `_config`, `Draft Rules`, and `_updates` to Commissioner Dashboard and Dashboard readiness cards.
5. The active analysis view to a values-only `Saved - <name>` snapshot tab plus an `Analysis-Saved` index row through `Draft War Room > Save current analysis` after Apps Script installation; live index columns track how each saved analysis actualizes against the Draft Tracker.
6. `_config` league participants and editable power ratings to `Season Forecast` head-to-head odds, expected wins, and champion odds, and to the `Mobile` season view after the post-draft season focus flip.
