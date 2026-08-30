# debugging

## common-issues

If `_updates!B2` is `NOT INSTALLED`, attach and authorize `apps-script/code.gs` from the spreadsheet-bound Apps Script project. If it is `ERROR`, read the latest `Update Log` row before retrying. If Dashboard shows a formula error after a tab rename, restore the intended formula reference or use the sheet-ID-based Apps Script configuration for automation.

## recovery

Do not clear `Players-Draft Tracker!A2:E258` during recovery. Fix source parsing or authorization, then run `Draft War Room > Refresh now`. Use `Draft War Room > Run system checks` after any repair, and `Draft War Room > Repair known issues` for the audited defects (stray cells, the Board-By Position projection column, empty selectors, the trade value curve); it skips anything already clean. Broken logo URLs affect only display formulas in `_config!M:M` and do not affect draft data.
