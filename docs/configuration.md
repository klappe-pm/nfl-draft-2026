# configuration

## config

`_config!B2:B17` contains the shared workbook league name, commissioner, season, league-team count, NFL draft date, start time, timezone, operating mode, draft order, rounds, pick clock, prospect player pool, sharing guidance, live-update owner guidance, color policy, and logo policy. `_config!E1:P33` contains participant team ID, fantasy team name, manager, contact email, optional NFL franchise, primary color, secondary color, logo URL, logo formula, draft slot, active checkbox, and notes.

`_config!S1:T85` is the authoritative fantasy league input surface sourced from the user-provided league screenshots. `S2:T23` contains league, schedule, playoff, trade, and keeper settings. `S25:T34` contains roster requirements. `S36:T76` contains scoring values as numbers. `S78:T85` contains transaction rules.

## validation

NFL franchise entries use the `_nfl_info` franchise list and remain optional when a fantasy participant is not mapped to one NFL franchise. Active participant rows must equal `_config!B5`. Active draft slots must be unique. `Draft Rules!B15:B18` are commissioner inputs with strict dropdowns for trade permission, trade approval, clock expiry action, and rules publication. `Team-Report!L3` and `Team-Compare!B52`, `G52`, and `L52` use strict dropdowns from `_config!F2:F13`.

`Draft Rules!B31` must equal `PASS` before the fantasy league import is considered complete. The check requires 12 active teams, 12 manager values, all core fantasy settings, every roster requirement, every captured scoring value, and every captured transaction value.

## ownership-and-sharing

Only the durable commissioner account should install the trigger. Editors share one cloud-hosted state and do not run local refresh tooling. Never commit participant names, contacts, credentials, OAuth artifacts, or private league details.
