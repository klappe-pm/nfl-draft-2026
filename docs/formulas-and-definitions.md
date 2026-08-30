# formulas-and-definitions

## draft-metrics

Tracker Act columns are guarded lookups installed by `Repair known issues`, written into whichever columns the header resolves to rather than fixed addresses. Under the 2026-08-28 order that is `C2` (Act Pick) `=IF($A2="","",IFNA(XLOOKUP($A2,'_actuals'!$E$2:$E$258,'_actuals'!$B$2:$B$258),""))`, with Act Team from `_actuals!D:D` in `I` and Act Round from `_actuals!A:A` in `K`. `D2` (Value vs Rank) is `=IF(OR($A2="",$C2=""),"",IFNA(XLOOKUP($A2,'_actuals'!$E$2:$E$258,'_actuals'!$C$2:$C$258),"")-$E2)`, actual overall minus board rank, gated on Act Pick so it stays blank until the player is actually drafted. Positive values mean a player was selected later than the Big Board rank. A tracker whose Value vs Rank column shows minus the board rank on every row has not had this repair applied yet: that is the artifact of subtracting the rank from a blank actual. `Big Board!P:R` holds projected overall, actual overall, and `=IF(OR(P2="",Q2=""),"",Q2-P2)`.

## analytics

`Analytics!B5:B9` reports total selections, distinct teams, average actual draft grade, top actual draft grade, and average value versus rank. `Analytics!H:I` reports selections by official round. `Analytics!K:L` reports team selection volume. `Analytics!N:O` reports median and average actual versus projected, undrafted profiles, round-one selections, best value, and lowest value. `Analytics!Q:R` reports official selections by position. `Analytics!S:T` reports average value versus rank by round.

## team-and-player-views

`Board-By Position!A5` holds one `FILTER` over `Big Board` returning rank, player, position, group, college, grade, production, athleticism, drafted flag, overall, draft team, and projection, keyed to the position-group selector in `B3`; the projection output column is `Big Board!L:L`, not the source URL column. `Trade Calculator` custom points default to the Jimmy Johnson value chart for picks 1-224 with a linear fade to 1.0 through pick 257, and every value stays editable. `Team-Report!A8:I` and `Team-Compare!A6:AC` use `FILTER` against `Players-Draft Tracker` for official NFL team classes. The separate fantasy team card in `Team-Report!K1:L10` and three-team comparison in `Team-Compare!A49:P59` use `XLOOKUP` against `_config!F2:F13` and do not require an NFL franchise assignment. `Players-Compare!B5:F5` uses `MAP`, `XLOOKUP`, `INDEX`, and `MATCH` to return the 13 metrics named in `A5:A17` for up to five selected players. `Players-College Cohorts!H9:N` filters `Player-Bios` by the selected college in `I3`.

## fantasy-league-quality-gate

`Draft Rules!B31` uses `=IF(AND('_config'!B5=12,COUNTA('_config'!F2:F13)=12,COUNTA('_config'!G2:G13)=12,COUNTBLANK('_config'!T2:T23)=0,COUNTBLANK('_config'!T26:T34)=0,COUNTBLANK('_config'!T37:T76)=0,COUNTBLANK('_config'!T79:T85)=0),"PASS","CHECK")`. This gate validates screenshot import completeness only. It does not claim that hidden or uncaptured source settings were inferred.

The imported scoring profile is half PPR because `_config!T45` is `0.5` points per reception. Passing yards score `0.04` per yard, rushing and receiving yards score `0.1` per yard, passing touchdowns score `4`, rushing and receiving touchdowns score `6`, and turnovers use the captured negative values in `_config!T39`, `T49`, and `T76`.
