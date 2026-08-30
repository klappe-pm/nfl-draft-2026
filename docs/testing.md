# testing

## automated-and-manual-checks

Run `node --check < /Users/kevinlappe/coding/fantasy-bros/apps-script/code.gs` after source changes, then `node --test /Users/kevinlappe/coding/fantasy-bros/apps-script/code.test.js`. The Node suite loads `code.gs` under mocked Sheets, Lock, Properties, Trigger, Ui, and Charts services and covers pre-draft partial snapshots, mid-draft regression rejection, post-draft trigger auto-removal and season-focus installation, lock contention, Next Flight parsing, the default trade value curve, the formula-error regex, analysis type detection, save-analysis snapshotting with performance columns and cancel and refusal paths, Start Here guide idempotence, mobile view layout in both modes, season focus timing and cleanup, season forecast construction with input preservation and charts, dashboard chart coverage, player-bio link conversion idempotence, recommendations blocks and the value chart, the draft optimizer snake board with pick preservation and resizing, and FantasyPros request secrecy, response validation, latest-table normalization, and historical-import idempotence.

The mock enforces real grid bounds: `getRange` throws on a zero-size range and on any range past `getMaxRows`/`getMaxColumns`, exactly as Apps Script does, so an out-of-range write fails in tests instead of passing silently. Fixtures are seeded from the live sheet, including the tracker's 2026-08-28 header order and the vertically stacked Team-Compare blocks, so a test cannot pass by agreeing with a stale assumption in the code. Coverage added on 2026-08-28: runtime tracker column resolution and its refusal cases, the Act-column and Value vs Rank formulas as golden strings, Team-Compare block preservation, Analytics and Mock Lab column targeting, theme number-format targeting, the Commissioner and Players-Compare stray scans, college cohort deduplication, repair fault isolation and status, terminal `COMPLETE`, completion-bookkeeping isolation, season-focus single-fire, chart ownership, optimizer pick preservation by round and team, `_actuals` grid sizing, and the teams-payload diagnostic.

Every fix in that change was mutation-tested: each was reverted in a scratch copy and the suite rerun, and all 21 reverted fixes produced a failing test. Repeat that sweep when adding a fix, since a test that passes in both states guards nothing.

After Apps Script attachment, use `Draft War Room > Run system checks`. The check validates a complete 257-pick snapshot, core Dashboard formulas, Analytics formulas, official Team Compare formulas, fantasy team and manager completeness, fantasy rules completeness, fantasy Team Report formulas, fantasy Team Compare formulas, Player Compare formulas, Players-College Cohorts formulas, the Board-By Position projection column, the Trade Calculator value curve, the Start Here status cell, scheduled trigger presence, and a full-workbook scan for all eight Sheets error literals. Results append to `Update Log!A:H`.

## live-source-contract-validation

Validated 2026-08-27: the production tracker page at `https://www.nfl.com/draft/tracker/2026/prospects` was fetched (HTTP 200) and run through the real `fetchOfficialDraftSnapshot_`, `decodeNextFlightData_`, `parseQueryState_`, and `validateDraftRows_` code under Node with only `UrlFetchApp` stubbed to the downloaded HTML. Result: 257 rows, rounds 1 through 7, 257 unique overall picks, full validation pass, pick 1 `Fernando Mendoza` to the Las Vegas Raiders and pick 257 `Red Murdock` to the Denver Broncos. The source is post-draft, so a manual or scheduled refresh after attachment will load all 257 picks, record completion, and start the one-week season-focus clock.

## acceptance-cases

Verify `Dashboard!B3:F13` contains no formula errors, `Analytics!A4:T20` contains no formula errors, `Team-Compare!A6`, `K6`, and `U6` return selections for valid NFL team selectors, and `Players-Compare!B2`, `D2`, `F2`, `H2`, and `J2` return 13 profile metrics. Verify `Big Board!P:T` shows projected overall, actual overall, delta, projected round, and actual round.

Verify `_config!F2:G13` contains 12 fantasy teams and 12 manager display values, `_config!T2:T23`, `T26:T34`, `T37:T76`, and `T79:T85` contain no blanks, and `Draft Rules!B31` equals `PASS`. Change `Team-Report!L3` and confirm `L5:L10` update. Change `Team-Compare!B52`, `G52`, and `L52` and confirm rows 54 through 59 update independently. Leave `_config!I2:I13` blank unless a fantasy team is explicitly assigned to one NFL franchise.

## live-refresh-cases

Install one-minute updates from the durable commissioner account, confirm a trigger exists, run Refresh now, and verify `_updates!B2` becomes `LIVE`, `_updates!B3:B4` update, and `Update Log` receives a success record. Test a malformed snapshot only in a safe copy or by unit testing the parser, never by corrupting the shared draft table.
