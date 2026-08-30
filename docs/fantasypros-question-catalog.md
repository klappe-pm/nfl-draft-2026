# fantasypros-question-catalog

## scope

This catalog records every question category exposed by the FantasyPros public v2 documentation reviewed on 2026-08-30. The provider is a public, key-authenticated, read-only data API. The current workbook implements NFL ingestion only; the other documented sports describe possible future coverage, not active workbook features. The global sport-key enum also names PGA and NCAAF, but the listed operation response schemas document player, ranking, projection, injury, and comparison data only for NFL, MLB, NBA, and NHL, so no unverified PGA or NCAAF question coverage is claimed here.

## player-universe-and-identity

| Category | Subcategory | Questions the data can answer | Scope |
|---|---|---|---|
| Player discovery | Player directory | Which players are in the provider's player pool for a sport? | NFL, MLB, NBA, NHL |
| Player identity | IDs and links | What is the FantasyPros ID, player page, and external platform ID for this player? | NFL, MLB, NBA, NHL |
| Player identity | Cross-platform matching | How can a player be matched to Yahoo, ESPN, CBS, Fantrax, NFL, MLBAM, NBA, and other documented external IDs? | Where the player response supplies the requested ID |
| Player profile | Bio | What are the player's name variants, birthdate, age, and team? Which MLB player records include a status? | NFL, MLB, NBA, NHL; status is documented for MLB player records only |
| Player profile | Eligibility | What is the primary position, listed positions, and provider or platform position eligibility? | Sport-dependent |
| Player market | Baseline rank | What are this player's ECR and ADP, and where does the player rank overall or at position? | NFL, MLB, NBA, NHL |

## rankings-and-expert-opinion

| Category | Subcategory | Questions the data can answer | Scope |
|---|---|---|---|
| Rankings | Consensus | Who is ranked highest overall or at a requested position, sport, season, week, scoring type, and ranking type? | NFL, MLB, NBA, NHL |
| Rankings | Ranking types | Who is preferred for draft, weekly, rest-of-season, dynasty, ADP, waiver, prospect, or other sport-specific formats? | Sport-dependent |
| Rankings | Scoring formats | How do rankings change under NFL standard, half-PPR, and PPR, or NBA roto and points formats? | NFL and NBA |
| Rankings | Expert filters | How does the ranking change when limited to selected expert IDs? | Where rankings support filters |
| Rankings | Uncertainty | What are a player's ECR, minimum, maximum, and standard-deviation ranks? | Rankings endpoint |
| Rankings | Expert roster | Which experts are available, included, excluded, or last updated for a consensus set? | Consensus rankings |
| Rankings | Expert profiles | Who are the experts, what outlets do they represent, and what is their reported overall accuracy? | Expert endpoint |
| Rankings | Head-to-head comparison | How do two to four selected players compare in draft, weekly, or rest-of-season rankings and expert opinion? | NFL, MLB, NBA, NHL |
| Rankings | Historical trend | How did preseason or in-season ranks differ by requested year and week? | Store successive season and week responses |

## projections-and-expected-output

| Category | Subcategory | Questions the data can answer | Scope |
|---|---|---|---|
| NFL projections | Volume and scoring | What passing, rushing, receiving, kicking, defensive, IDP, and fantasy-point output is projected? | NFL |
| NFL projections | Horizon | What is projected for preseason, a selected week, or the rest of the season? | NFL |
| MLB projections | Hitting | What are the projected plate appearances, hits, power, runs, RBI, stolen bases, batting average, OBP, SLG, and OPS? | MLB |
| MLB projections | Pitching | What are the projected innings, wins, saves, strikeouts, ERA, WHIP, and rate statistics? | MLB |
| MLB projections | Horizon | What is projected for preseason, rest of season, a day, or a week? | MLB |
| NBA projections | Counting statistics | What points, rebounds, assists, steals, blocks, threes, turnovers, and playing time are projected? | NBA |
| NBA projections | Efficiency | What field-goal, free-throw, two-point, three-point, and assist-to-turnover rates are projected? | NBA |
| NBA projections | Horizon and form | What is projected preseason, daily, weekly, or rest of season, as totals or averages? | NBA |

## realized-performance-and-history

| Category | Subcategory | Questions the data can answer | Scope |
|---|---|---|---|
| NFL scoring | Season totals | How many games, total fantasy points, and average points did each player produce? | NFL player points |
| NFL scoring | Weekly detail | What were a player's points in each included week, and over what selected start and end weeks? | NFL player points |
| NFL scoring | Scoring comparison | How do results differ under standard, half-PPR, and PPR scoring? | NFL player points |
| NFL history | Multi-season comparison | Who accumulated the most PPR points, points per season, or points per game across imported seasons? | Implemented `FantasyPros History` view |
| NFL history | Player trajectory | How did a player's season total and weekly output change across stored seasons? | Import and compare season facts |
| NFL history | Historical availability | Which seasons can be requested? | Documentation sets a 2012 minimum, subject to provider response and key entitlement |

## news-injuries-and-availability

| Category | Subcategory | Questions the data can answer | Scope |
|---|---|---|---|
| News | Feed | What recently happened to a player, when, who reported it, and what is the source link? | NFL, MLB, NBA, NHL |
| News | Classification | Is the item injury, recap, transaction, rumor, breaking news, or another provider category? | News endpoint |
| News | Fantasy impact | What fantasy impact analysis accompanies the item? | News endpoint |
| Injuries | Current status | What are the player's name, injury status, injury type, comment, and injury update date? | NFL, MLB, NBA, NHL; injury team and position are not schema-guaranteed |
| Injuries | NFL practice | What were the three practice participations, IR weeks, and probability of playing? | NFL |
| Injuries | Team or player filter | Which injured players belong to selected professional teams or player IDs? | Injuries endpoint |

## lineups-and-game-context

| Category | Subcategory | Questions the data can answer | Scope |
|---|---|---|---|
| MLB lineups | Starting lineup | Who is batting in each lineup slot and at what defensive position? | MLB |
| MLB lineups | Pitching | Who are the probable starting pitchers and what records are shown? | MLB |
| MLB lineups | Game conditions | What is the game status, weather, rain chance, temperature, wind, and team record? | MLB |
| MLB lineups | Timing | What confirmed or projected lineup is available for a date and preseason, regular-season, or postseason period? | MLB |

## unsupported-questions

| Category | Why it cannot be answered from this API alone |
|---|---|
| Private league roster, lineup, bench, and starting-slot questions | The documentation exposes professional player data, not a user's league connection. |
| League standings, matchup results, schedules, playoff brackets, and team ownership | No private-league or matchup endpoint is documented. |
| Waivers, trades, transactions, draft picks, FAAB, and commissioner settings | No league-host transaction or rules endpoint is documented. |
| Private league historical results and keeper history | These require a league-host API or a user-provided export. |
| Guaranteed outcomes, betting advice, or a provider-endorsed start-sit decision | The API returns inputs, rankings, projections, and analysis, not a guarantee or recommendation contract. |

## implementation-map

The workbook's `Refresh FantasyPros NFL data` action implements player metadata, rankings, PPR consensus rankings, preseason projections, current injuries, and current news. `Import FantasyPros NFL history` implements historical NFL points under standard, half-PPR, and PPR scoring and rebuilds the PPR summary view. Every other documented category remains a source-backed opportunity rather than a promise that the current workbook imports it.
