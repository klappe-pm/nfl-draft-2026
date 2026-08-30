# sources

## authoritative-sources

Official draft results and prospect records use `https://www.nfl.com/draft/tracker/2026/prospects`. Fantasy player, ranking, projection, news, injury, and player-point data use the [FantasyPros public v2 API documentation](https://api.fantasypros.com/public/v2/docs). NFL franchise reference data is maintained in `_nfl_info`. The saved local official NFL page was parser-tested for 257 selections from Fernando Mendoza at No. 1 through Red Murdock at No. 257.

## limitations

The NFL tracker remains the sole source of official draft results. FantasyPros is a supplemental data source and does not expose private league rosters, matchups, standings, transactions, waivers, trades, or league history. `Team-Needs`, league managers, rules inputs, and notes are user-entered operational data. Verification dates and source status belong in `Source Center`.
