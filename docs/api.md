# api

## official-nfl-source-contract

The source URL is `https://www.nfl.com/draft/tracker/2026/prospects`. `fetchOfficialDraftSnapshot_` requests server-rendered HTML, extracts Next Flight payloads, reads the `useFetchProspectsProfiles` and `useFetchExperienceTeams` query state, and outputs round, pick, overall pick, team, and player values.

## validation-and-failure-handling

The parser requires HTTP 200, at least 250 prospect profiles, rounds one through seven, positive integer pick numbers, unique overall picks, nonempty team and player values, and no more than 257 selections. A snapshot smaller than the last known good player count is rejected. A failed fetch or validation never clears or overwrites `Players-Draft Tracker!A2:E258`.

## execution

The authorized time-driven trigger calls `scheduledDraftRefresh` once per minute. Manual refresh calls `refreshDraftNow`. LockService prevents overlap. Each success, error, skip, duration, pick count, changed-row count, source URL, and hash is appended to `Update Log!A:H`.
