# workbook-audit-2026-08-28-live

## scope-and-method

Live-state audit of the shared workbook on 2026-08-28, driven by the owner's report that Players-Compare misbehaves when a player is selected. Method: anonymous CSV export per tab (`https://docs.google.com/spreadsheets/d/1dKiRihsHrOeQyGy3YpROZPoI012vtPU3lF3f6DNSr3k/export?format=csv&gid=<gid>`) plus the `htmlview` endpoint for the sheet-to-gid map, then cross-checking exported values against the code's contracts. All findings below were reproduced from real exported data, not inferred.

## live-state-discoveries

The Apps Script is now attached and in use: `Update Log` shows `Build draft optimizer` at 2026-08-28 13:58 and `Link player names to bios` (680 names) at 14:14, a grey `Saved - dustin-will-win-maybe` snapshot exists, and the `_actuals` staging tab exists. `Refresh now` has never run: `_actuals` holds only its header, `_updates` reports `NOT INSTALLED` with zero picks loaded. Every draft result shown in the workbook is pre-baked Big Board data (internally consistent: 257 players marked drafted all carry picks, 166 marked not drafted carry none, `Delta Act-Projected` filled for all drafted rows, `Size` empty for all 423).

The owner renamed the optimizer tab to `Draft Optimizer-test`, so `Build draft optimizer` will not find it and a rebuild creates a fresh `Draft Optimizer`. `Mock Lab`, `Draft History`, and `Source Center` do not appear in `htmlview` (hidden or deleted); `_updates` and `Update Log` are hidden but present.

## findings

| # | Location | Defect | Evidence | Resolution |
|---|---|---|---|---|
| 1 | `Players-Compare` selectors | Live layout is vertical (`Player 1`..`Player 5` labels in `A2:A6`, values in `B2:B6`), while the code read horizontal `B2, D2, F2, H2, J2`, so saves captured one player and four blanks | gid 1012 export rows 2-6 | `resolvePlayerCompareSelectorCells_` resolves the labeled vertical cells with the legacy horizontal row as fallback; save, repair, and system checks all use it |
| 2 | `Players-Compare` `Actual Vs Projected` row | Blank for all five compared players even though Big Board carries every delta; the grid's per-column `MAP`/`XLOOKUP` spills match metric labels against Big Board headers, and the board column is now named `Delta Act-Projected`, so the old label finds nothing | gid 1012 row 20 empty while every label that matches a live board header renders; gid 1003 column R filled for all 257 drafted rows | New dual-mode `repairPlayerCompareDeltaRow_`: on a formula-spill grid it renames the metric label to the live board header (column A sits outside the spills), and only on a plain-value grid does it write per-cell `VLOOKUP`s; it never writes inside a spill range |
| 3 | `Players-Compare` player names | Not clickable; the owner expects clicking a player to open the bio | gid 1012 grid headers are plain values | New `repairPlayerCompareHeaderLinks_` turns the five grid header cells into selector-tracking `HYPERLINK`s into `Player-Bios`; the selector cells themselves stay plain editable inputs |
| 4 | `runSystemChecks` player-compare check | Checked `B5:F5` for formula errors, cells that are now grid values, so the check could never fail nor catch the real breakage | code versus gid 1012 layout | Check now verifies the metric grid exists, at least one selector resolves and is filled, and the header row is error-free |
| 5 | Sharing | The workbook exports anonymously with no authentication, including `_config` league contact details | every export in this audit ran without credentials | Not changed by code; owner decision: restrict link access or accept public readability |

The `Drafted: Yes` values the owner saw are factually correct for the five selected players (all were drafted); the broken signal next to them was the empty delta row (finding 2). The stray `Actual Overall / Actual Vs Projected / Draft Team` fragment that moved from `K7:M7` to `K9:M9` was already fixed by the concurrent session's scanning repair.

## live-sheet-gid-map

Recorded for repeatable export-based testing: Start Here 0, Instructions 1016, Analysis-Saved 202865105, Draft Optimizer-test 1327499437, _actuals 389566354, Big Board 1003, Draft-Actual 707154026, Draft Rules 148377302, Commissioner Dashboard 404440470, Player-Bios 1004, Players-College Cohorts 2009412915, Board-By Position 1005, Players-Compare 1012, Players-Draft Tracker 1002, Team-Compare 1860980541, Team-Needs 1007, Team-Report 1006, Trade Calculator 1009, _config 1019, _nfl_info 1015, Dashboard 1001, Analytics 1011, plus hidden _updates 1017 and Update Log 1018.

## verification

`node --check < apps-script/code.gs` passes and `node --test apps-script/code.test.js` runs 64 scenarios green, with the Players-Compare fixture reseeded to the live vertical layout so the new repairs and selector resolution are tested against reality rather than the stale assumption. The delta and bio-link repairs are idempotent and skip on rerun. Live effect still requires the owner to paste the updated `apps-script/code.gs` into the attached script project and run `Repair known issues`.
