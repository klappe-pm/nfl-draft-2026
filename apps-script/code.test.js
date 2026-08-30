'use strict';

const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const CODE_PATH = path.join(__dirname, 'code.gs');

function parseA1Cell(a1) {
  const match = /^([A-Z]+)(\d+)$/.exec(a1);
  if (!match) {
    throw new Error(`Unsupported A1 notation in test harness: ${a1}`);
  }
  let column = 0;
  for (const character of match[1]) {
    column = column * 26 + (character.charCodeAt(0) - 64);
  }
  return {row: Number(match[2]), column};
}

class MockRange {
  constructor(sheet, row, column, numRows, numColumns) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.numRows = numRows;
    this.numColumns = numColumns;
  }

  getValues() {
    const out = [];
    for (let r = 0; r < this.numRows; r += 1) {
      const rowValues = [];
      for (let c = 0; c < this.numColumns; c += 1) {
        rowValues.push(this.sheet.cellAt(this.row + r, this.column + c));
      }
      out.push(rowValues);
    }
    return out;
  }

  getDisplayValues() {
    return this.getValues().map(rowValues => rowValues.map(value => String(value === null || value === undefined ? '' : value)));
  }

  getValue() {
    return this.getValues()[0][0];
  }

  getDisplayValue() {
    return this.getDisplayValues()[0][0];
  }

  setValues(values) {
    for (let r = 0; r < this.numRows; r += 1) {
      for (let c = 0; c < this.numColumns; c += 1) {
        this.sheet.setCell(this.row + r, this.column + c, values[r][c]);
      }
    }
    return this;
  }

  setValue(value) {
    this.sheet.setCell(this.row, this.column, value);
    return this;
  }

  setFormula(formula) {
    this.sheet.setCell(this.row, this.column, formula);
    return this;
  }

  setFormulas(formulas) {
    return this.setValues(formulas);
  }

  getFormula() {
    const value = this.sheet.cellAt(this.row, this.column);
    return typeof value === 'string' && value.startsWith('=') ? value : '';
  }

  getFormulas() {
    return this.getValues().map(rowValues => rowValues.map(value => (typeof value === 'string' && value.startsWith('=') ? value : '')));
  }

  getA1Notation() {
    let letter = '';
    let remaining = this.column;
    while (remaining > 0) {
      const modulo = (remaining - 1) % 26;
      letter = String.fromCharCode(65 + modulo) + letter;
      remaining = Math.floor((remaining - 1) / 26);
    }
    return `${letter}${this.row}`;
  }

  getDataValidation() {
    return this.sheet.validations.get(this.sheet.key(this.row, this.column)) || null;
  }

  setDataValidation(rule) {
    this.sheet.validations.set(this.sheet.key(this.row, this.column), rule);
    return this;
  }

  setNumberFormat() {
    return this;
  }

  setFontWeight() {
    return this;
  }

  setFontSize() {
    return this;
  }

  setFontFamily() {
    return this;
  }

  setFontColor() {
    return this;
  }

  setBackground() {
    return this;
  }

  setVerticalAlignment() {
    return this;
  }

  applyRowBanding() {
    return this;
  }

  getMergedRanges() {
    return [];
  }

  copyTo(destination, type) {
    this.sheet.pasteOps.push({type, row: this.row, column: this.column, numRows: this.numRows, numColumns: this.numColumns});
    return this;
  }

  clearFormat() {
    this.sheet.formatClears = (this.sheet.formatClears || 0) + 1;
    return this;
  }

  clearContent() {
    for (let r = 0; r < this.numRows; r += 1) {
      for (let c = 0; c < this.numColumns; c += 1) {
        this.sheet.setCell(this.row + r, this.column + c, '');
      }
    }
    return this;
  }
}

let nextGeneratedSheetId = 50000;

function nextSheetId() {
  nextGeneratedSheetId += 1;
  return nextGeneratedSheetId;
}

class MockSheet {
  constructor(sheetId, name) {
    this.sheetId = sheetId;
    this.name = name;
    this.cells = new Map();
    this.maxRow = 0;
    this.maxColumn = 0;
    this.charts = [];
    this.pasteOps = [];
    this.tabColor = null;
    this.columnWidths = {};
    this.validations = new Map();
    // Real Apps Script sheets have a fixed grid and throw on any range outside it. Modelling
    // that is what makes an out-of-bounds write fail in tests instead of passing silently.
    this.maxRows = 1000;
    this.maxColumns = 26;
  }

  getMaxRows() {
    return this.maxRows;
  }

  getMaxColumns() {
    return this.maxColumns;
  }

  insertRowsAfter(afterRow, count) {
    this.maxRows = Math.max(this.maxRows, afterRow + count);
    return this;
  }

  insertColumnsAfter(afterColumn, count) {
    this.maxColumns = Math.max(this.maxColumns, afterColumn + count);
    return this;
  }

  setName(name) {
    this.name = name;
    return this;
  }

  getCharts() {
    return this.charts.slice();
  }

  removeChart(chart) {
    this.charts = this.charts.filter(candidate => candidate !== chart);
  }

  setTabColor(color) {
    this.tabColor = color;
    return this;
  }

  setColumnWidth(column, width) {
    this.columnWidths[column] = width;
    return this;
  }

  copyTo(spreadsheet) {
    const copy = new MockSheet(nextSheetId(), `Copy of ${this.name}`);
    copy.cells = new Map(this.cells);
    copy.maxRow = this.maxRow;
    copy.maxColumn = this.maxColumn;
    copy.charts = this.charts.slice();
    spreadsheet.getSheets().push(copy);
    return copy;
  }

  newChart() {
    const spec = {type: null, ranges: [], options: {}, position: null, numHeaders: 0};
    const builder = {
      setChartType(type) {
        spec.type = type;
        return builder;
      },
      addRange(range) {
        spec.ranges.push(range);
        return builder;
      },
      setPosition(row, column) {
        spec.position = {row, column};
        return builder;
      },
      setOption(key, value) {
        spec.options[key] = value;
        return builder;
      },
      setNumHeaders(count) {
        spec.numHeaders = count;
        return builder;
      },
      build() {
        return spec;
      },
    };
    return builder;
  }

  insertChart(chart) {
    this.charts.push(chart);
  }

  setFrozenRows(rows) {
    this.frozenRows = rows;
    return this;
  }

  setFrozenColumns(columns) {
    this.frozenColumns = columns;
    return this;
  }

  getBandings() {
    return [];
  }

  key(row, column) {
    return `${row}:${column}`;
  }

  cellAt(row, column) {
    const value = this.cells.get(this.key(row, column));
    return value === undefined ? '' : value;
  }

  setCell(row, column, value) {
    this.cells.set(this.key(row, column), value);
    this.maxRow = Math.max(this.maxRow, row);
    this.maxColumn = Math.max(this.maxColumn, column);
  }

  getSheetId() {
    return this.sheetId;
  }

  getName() {
    return this.name;
  }

  getLastRow() {
    return this.maxRow;
  }

  getLastColumn() {
    return this.maxColumn;
  }

  makeRange(row, column, numRows, numColumns) {
    if (!(numRows >= 1)) {
      throw new Error(`The number of rows in the range must be at least 1. (got ${numRows}) sheet=${this.name}`);
    }
    if (!(numColumns >= 1)) {
      throw new Error(`The number of columns in the range must be at least 1. (got ${numColumns}) sheet=${this.name}`);
    }
    if (row < 1 || column < 1) {
      throw new Error(`The coordinates of the range are outside the dimensions of the sheet. sheet=${this.name}`);
    }
    if (row + numRows - 1 > this.maxRows) {
      throw new Error(`Those rows are out of bounds. sheet=${this.name} want=${row + numRows - 1} maxRows=${this.maxRows}`);
    }
    if (column + numColumns - 1 > this.maxColumns) {
      throw new Error(`Those columns are out of bounds. sheet=${this.name} want=${column + numColumns - 1} maxColumns=${this.maxColumns}`);
    }
    return new MockRange(this, row, column, numRows, numColumns);
  }

  getRange(first, column, numRows, numColumns) {
    if (typeof first === 'string') {
      if (first.includes(':')) {
        const [startA1, endA1] = first.split(':');
        const start = parseA1Cell(startA1);
        const end = parseA1Cell(endA1);
        return this.makeRange(start.row, start.column, end.row - start.row + 1, end.column - start.column + 1);
      }
      const cell = parseA1Cell(first);
      return this.makeRange(cell.row, cell.column, 1, 1);
    }
    return this.makeRange(first, column, numRows === undefined ? 1 : numRows, numColumns === undefined ? 1 : numColumns);
  }

  appendRow(values) {
    const row = this.maxRow + 1;
    values.forEach((value, index) => this.setCell(row, index + 1, value));
    return this;
  }

  getDataRange() {
    return new MockRange(this, 1, 1, Math.max(this.maxRow, 1), Math.max(this.maxColumn, 1));
  }
}

const TEAM_VIEW_HEADER_FIXTURE = [
  'Round', 'Pick', 'Overall', 'Player', 'Pos', 'College', 'Board Rank', 'NFL Grade', 'Value Vs Rank',
];

// The owner's live Players-Draft Tracker header, 2026-08-28. Tests assert against this rather
// than against the code's own constant, so a drifted constant fails instead of self-agreeing.
const LIVE_TRACKER_HEADER = [
  'Player', 'Proj Pick', 'Act Pick', 'Value vs Rank', 'Board Rank', 'Pos',
  'NFL Grade', 'Proj Team', 'Act Team', 'Proj Round', 'Act Round',
];

function seedTeamCompareBlocks(sheet, blocks) {
  blocks.forEach((block, blockIndex) => {
    sheet.setCell(block.labelRow, 1, `Team ${blockIndex + 1}`);
    sheet.setCell(block.labelRow, 2, block.team);
    TEAM_VIEW_HEADER_FIXTURE.forEach((label, column) => {
      sheet.setCell(block.labelRow + 2, column + 1, label);
    });
    for (let row = 0; row < block.dataRows; row += 1) {
      sheet.setCell(block.labelRow + 3 + row, 4, `${block.team} pick ${row + 1}`);
    }
  });
}

function buildContext(options) {
  const state = {
    toasts: [],
    triggers: options && options.triggerInstalled ? [{handler: 'scheduledDraftRefresh'}] : [],
    properties: new Map(),
    lockAvailable: !(options && options.lockBusy),
    uiResponses: (options && options.uiResponses) || [],
    alerts: [],
    moves: [],
    activeSheet: null,
    activeRow: (options && options.activeRow) || 0,
  };

  const tracker = new MockSheet(1002, 'Players-Draft Tracker');
  const status = new MockSheet(1017, '_updates');
  const log = new MockSheet(1018, 'Update Log');
  log.appendRow(['Timestamp', 'Status', 'Picks', 'Changed Rows', 'Duration MS', 'Message', 'Source', 'Snapshot Hash']);
  const config = new MockSheet(1019, '_config');
  if (!(options && options.emptyLeague)) {
    const leagueSize = options && options.teamCount !== undefined ? options.teamCount : 12;
    for (let index = 1; index <= leagueSize; index += 1) {
      config.setCell(1 + index, 6, `Fantasy Team ${index}`);
      config.setCell(1 + index, 7, `Manager ${index}`);
    }
  }
  const analysis = new MockSheet(202865105, 'Analysis-Saved');
  analysis.appendRow([
    'Analysis Name', 'Type', 'Team 1', 'Team 2', 'Team 3',
    'Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5',
    'College', 'Notes', 'Saved By', 'Saved At',
  ]);
  const teamCompare = new MockSheet(1860980541, 'Team-Compare');
  // Owner's live Team-Compare shape: three blocks stacked vertically in A:I, each a "Team n"
  // label row carrying the selector in B, a blank row, a header row, then the picks.
  seedTeamCompareBlocks(teamCompare, [
    {labelRow: 3, team: 'Kansas City Chiefs', dataRows: 10},
    {labelRow: 18, team: 'Chicago Bears', dataRows: 11},
    {labelRow: 33, team: 'Detroit Lions', dataRows: 7},
  ]);
  teamCompare.setCell(52, 2, 'Fantasy Team 1');
  teamCompare.setCell(52, 7, 'Fantasy Team 2');
  teamCompare.setCell(52, 12, 'Fantasy Team 3');
  // Live layout as of 2026-08-28: vertical selectors labeled in column A, a Metric grid from
  // row 8 with player names as column headers, and the Actual Vs Projected row blank.
  const playerCompare = new MockSheet(1012, 'Players-Compare');
  playerCompare.setCell(1, 1, 'Player Compare');
  const comparePlayers = ['Rueben Bain Jr.', 'Jeremiyah Love', 'Fernando Mendoza', 'Denzel Boston', 'Francis Mauigoa'];
  comparePlayers.forEach((name, index) => {
    playerCompare.setCell(2 + index, 1, `Player ${index + 1}`);
    playerCompare.setCell(2 + index, 2, name);
  });
  playerCompare.setCell(8, 1, 'Metric');
  comparePlayers.forEach((name, index) => playerCompare.setCell(8, 2 + index, name));
  ['Rank', 'Pos', 'Group', 'College', 'NFL Grade', 'Production', 'Athleticism', 'Size', 'Projection', 'Drafted', 'Actual Overall', 'Actual Vs Projected', 'Draft Team'].forEach((label, index) => {
    playerCompare.setCell(9 + index, 1, label);
  });
  const collegeHistory = new MockSheet(2009412915, 'Players-College Cohorts');
  collegeHistory.setCell(3, 9, 'Ohio State');
  const nflInfo = new MockSheet(1015, '_nfl_info');
  nflInfo.setCell(1, 2, 'Team');
  ['Las Vegas Raiders', 'New York Jets', 'Kansas City Chiefs'].forEach((team, index) => {
    nflInfo.setCell(2 + index, 2, team);
  });
  const startHere = new MockSheet(1000, 'Start Here');
  startHere.setCell(1, 1, 'STALE TITLE');
  const dashboard = new MockSheet(1001, 'Dashboard');
  const analytics = new MockSheet(1011, 'Analytics');
  const bigBoard = new MockSheet(1005, 'Big Board');
  const mockLab = new MockSheet(1600, 'Mock Lab');
  const actuals = new MockSheet(1900, '_actuals');
  const teamReport = new MockSheet(1006, 'Team-Report');
  teamReport.setCell(3, 2, 'Buffalo Bills');
  const playerBios = new MockSheet(1004, 'Player-Bios');
  playerBios.setCell(1, 1, 'Player');
  const sheets = [tracker, status, log, config, analysis, teamCompare, playerCompare, collegeHistory, nflInfo, startHere, dashboard, analytics, bigBoard, mockLab, actuals, playerBios, teamReport];

  const spreadsheet = {
    getSheets: () => sheets,
    insertSheet: name => {
      const sheet = new MockSheet(nextSheetId(), name);
      sheets.push(sheet);
      return sheet;
    },
    setActiveSheet: sheet => {
      state.activeSheet = sheet;
    },
    moveActiveSheet: position => state.moves.push({sheet: state.activeSheet, position}),
    toast: (message, title) => state.toasts.push({message, title}),
  };
  if (options && options.activeSheetName) {
    state.activeSheet = sheets.find(sheet => sheet.getName() === options.activeSheetName) || null;
  }

  const ui = {
    Button: {OK: 'OK', CANCEL: 'CANCEL'},
    ButtonSet: {OK_CANCEL: 'OK_CANCEL'},
    prompt: () => {
      const next = state.uiResponses.length > 0 ? state.uiResponses.shift() : {button: 'CANCEL', text: ''};
      return {getSelectedButton: () => next.button, getResponseText: () => next.text || ''};
    },
    alert: message => state.alerts.push(message),
  };

  const context = {
    console,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => spreadsheet,
      getActiveSheet: () => state.activeSheet,
      getActiveRange: () => (state.activeRow ? {getRow: () => state.activeRow} : null),
      getUi: () => ui,
      CopyPasteType: {PASTE_VALUES: 'PASTE_VALUES'},
      newDataValidation: () => {
        const rule = {values: null, allowInvalid: true};
        const builder = {
          requireValueInList(values) {
            rule.values = values;
            return builder;
          },
          requireValueInRange(range) {
            rule.range = range;
            return builder;
          },
          setAllowInvalid(allow) {
            rule.allowInvalid = allow;
            return builder;
          },
          build() {
            return rule;
          },
        };
        return builder;
      },
      flush: () => {},
    },
    LockService: {
      getDocumentLock: () => ({
        tryLock: () => state.lockAvailable,
        releaseLock: () => {},
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: key => (state.properties.has(key) ? state.properties.get(key) : null),
        setProperty: (key, value) => state.properties.set(key, value),
      }),
    },
    ScriptApp: {
      getProjectTriggers: () => state.triggers.map(trigger => ({
        getHandlerFunction: () => trigger.handler,
        raw: trigger,
      })),
      deleteTrigger: wrapped => {
        state.triggers = state.triggers.filter(trigger => trigger !== wrapped.raw);
      },
      newTrigger: handler => ({
        timeBased: () => ({
          everyMinutes: () => ({
            create: () => state.triggers.push({handler}),
          }),
          everyDays: () => ({
            create: () => state.triggers.push({handler}),
          }),
        }),
      }),
    },
    Charts: {
      ChartType: {COLUMN: 'COLUMN', BAR: 'BAR', HISTOGRAM: 'HISTOGRAM'},
    },
    Utilities: {
      DigestAlgorithm: {SHA_256: 'SHA_256'},
      computeDigest: (algorithm, value) => Array.from(crypto.createHash('sha256').update(value).digest())
        .map(byte => (byte > 127 ? byte - 256 : byte)),
    },
    Session: {
      getActiveUser: () => ({getEmail: () => 'test@example.org'}),
    },
    UrlFetchApp: {
      fetch: () => {
        throw new Error('UrlFetchApp should be stubbed per test.');
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(CODE_PATH, 'utf8'), context);
  return {context, state, tracker, status, log, sheets, spreadsheet, actuals};
}

// Top-level `const` in a vm script is not exposed as a property of the context object the way
// function declarations are, so constants have to be read back by evaluating their name.
function readConst(context, name) {
  return vm.runInContext(name, context);
}

function triggersByHandler(state, handler) {
  return state.triggers.filter(trigger => trigger.handler === handler);
}

function findSheet(sheets, name) {
  return sheets.find(sheet => sheet.getName() === name);
}

function columnAValues(sheet) {
  return sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), 1).getDisplayValues().flat();
}

function snapshotRows(count) {
  const rows = [];
  for (let overall = 1; overall <= count; overall += 1) {
    rows.push([
      Math.min(7, Math.floor((overall - 1) / 40) + 1),
      ((overall - 1) % 40) + 1,
      overall,
      `Team ${((overall - 1) % 32) + 1}`,
      `Player ${overall}`,
    ]);
  }
  return rows;
}

function stubSnapshot(context, rows) {
  context.fetchOfficialDraftSnapshot_ = () => ({rows, hash: `hash-${rows.length}`});
}

function logColumn(log, column) {
  const lastRow = log.getLastRow();
  const out = [];
  for (let row = 2; row <= lastRow; row += 1) {
    out.push(log.cellAt(row, column));
  }
  return out;
}

test('validateDraftRows_ accepts a complete valid snapshot', () => {
  const {context} = buildContext();
  assert.doesNotThrow(() => context.validateDraftRows_(snapshotRows(257)));
});

test('validateDraftRows_ rejects duplicate, out-of-range, and incomplete rows', () => {
  const {context} = buildContext();
  const duplicate = snapshotRows(3);
  duplicate[2][2] = 2;
  assert.throws(() => context.validateDraftRows_(duplicate), /Duplicate overall pick/);
  const badRound = snapshotRows(2);
  badRound[1][0] = 8;
  assert.throws(() => context.validateDraftRows_(badRound), /Invalid round/);
  const beyondMax = snapshotRows(1);
  beyondMax[0][2] = 258;
  assert.throws(() => context.validateDraftRows_(beyondMax), /Invalid pick number/);
  const missingPlayer = snapshotRows(1);
  missingPlayer[0][4] = '';
  assert.throws(() => context.validateDraftRows_(missingPlayer), /Missing team or player/);
});

test('decodeNextFlightData_ and parseQueryState_ read Next Flight payloads', () => {
  const {context} = buildContext();
  const profilesPayload = '{"state":{"data":{"profiles":[{"draftOverallPick":1}]}},"queryKey":["useFetchProspectsProfiles"]}';
  const teamsPayload = '{"state":{"data":[{"id":"T1","teamType":"TEAM","fullName":"Las Vegas Raiders"}]},"queryKey":["useFetchExperienceTeams"]}';
  const flight = `prefix ${profilesPayload} middle ${teamsPayload} suffix`;
  const html = `<script>self.__next_f.push([1,${JSON.stringify(flight)}])</script>`;
  const decoded = context.decodeNextFlightData_(html);
  assert.equal(decoded, flight);
  const profiles = context.parseQueryState_(decoded, 'useFetchProspectsProfiles');
  assert.equal(profiles.state.data.profiles.length, 1);
  const teams = context.parseQueryState_(decoded, 'useFetchExperienceTeams');
  assert.equal(teams.state.data[0].fullName, 'Las Vegas Raiders');
});

test('pre-start: zero-pick snapshot succeeds without writes, completion, or trigger changes', () => {
  const {context, state, tracker, status, log} = buildContext({triggerInstalled: true});
  stubSnapshot(context, snapshotRows(0));
  context.refreshDraftSnapshot_({initiator: 'SCHEDULED', showToast: false});
  assert.equal(tracker.cellAt(2, 5), '', 'no picks means no tracker writes');
  assert.equal(status.cellAt(2, 2), 'LIVE');
  assert.deepEqual(logColumn(log, 2), ['SUCCESS']);
  assert.equal(triggersByHandler(state, 'scheduledDraftRefresh').length, 1, 'polling must continue before the first pick');
  assert.equal(triggersByHandler(state, 'seasonFocusCheck').length, 0, 'no completion may be recorded before the draft starts');
  assert.equal(state.properties.get('nflDraft2026CompletedAt') || null, null);
});

test('pre-draft: partial snapshot writes padded rows to _actuals and keeps polling', () => {
  const {context, state, tracker, status, log, actuals} = buildContext({triggerInstalled: true});
  tracker.setCell(1, 1, 'Player');
  tracker.setCell(2, 1, 'Fernando Mendoza');
  tracker.setCell(2, 2, 'Las Vegas Raiders');
  stubSnapshot(context, snapshotRows(10));
  context.refreshDraftSnapshot_({initiator: 'SCHEDULED', showToast: false});
  assert.equal(actuals.cellAt(2, 5), 'Player 1');
  assert.equal(actuals.cellAt(11, 5), 'Player 10');
  assert.equal(actuals.cellAt(12, 5), '');
  assert.equal(tracker.cellAt(2, 1), 'Fernando Mendoza', 'the projection tracker must never be overwritten by the feed');
  assert.equal(tracker.cellAt(2, 2), 'Las Vegas Raiders');
  assert.equal(status.cellAt(2, 2), 'LIVE');
  assert.deepEqual(logColumn(log, 2), ['SUCCESS']);
  assert.equal(state.triggers.length, 1, 'trigger must stay installed before the draft completes');
});

test('mid-draft: regressive snapshot is rejected and the last good table survives', () => {
  const {context, state, status, log, actuals} = buildContext({triggerInstalled: true});
  stubSnapshot(context, snapshotRows(10));
  context.refreshDraftSnapshot_({initiator: 'SCHEDULED', showToast: false});
  stubSnapshot(context, snapshotRows(5));
  assert.throws(
    () => context.refreshDraftSnapshot_({initiator: 'SCHEDULED', showToast: false}),
    /regressed from 10 to 5/
  );
  assert.equal(actuals.cellAt(11, 5), 'Player 10', 'existing picks must never be cleared by a bad fetch');
  assert.equal(status.cellAt(2, 2), 'ERROR');
  assert.deepEqual(logColumn(log, 2), ['SUCCESS', 'ERROR']);
  assert.equal(state.triggers.length, 1);
});

test('post-draft: scheduled refresh at 257 picks removes its own trigger', () => {
  const {context, state, log} = buildContext({triggerInstalled: true});
  stubSnapshot(context, snapshotRows(257));
  context.refreshDraftSnapshot_({initiator: 'SCHEDULED', showToast: false});
  assert.equal(triggersByHandler(state, 'scheduledDraftRefresh').length, 0, 'scheduled polling must stop once the draft is complete');
  assert.equal(triggersByHandler(state, 'seasonFocusCheck').length, 1, 'completion must install the daily season focus check');
  assert.deepEqual(logColumn(log, 2), ['SUCCESS', 'COMPLETE']);
});

test('post-draft: manual refresh at 257 picks leaves the poller alone', () => {
  const {context, state, log} = buildContext({triggerInstalled: true});
  stubSnapshot(context, snapshotRows(257));
  context.refreshDraftSnapshot_({initiator: 'MANUAL', showToast: false});
  assert.equal(triggersByHandler(state, 'scheduledDraftRefresh').length, 1);
  assert.equal(triggersByHandler(state, 'seasonFocusCheck').length, 1, 'manual completion still records completion and installs the season focus check');
  assert.deepEqual(logColumn(log, 2), ['SUCCESS']);
});

test('lock contention logs SKIPPED and writes nothing', () => {
  const {context, log, actuals} = buildContext({lockBusy: true});
  stubSnapshot(context, snapshotRows(257));
  context.refreshDraftSnapshot_({initiator: 'SCHEDULED', showToast: false});
  assert.equal(actuals.cellAt(2, 5), '');
  assert.deepEqual(logColumn(log, 2), ['SKIPPED']);
});

test('install then scheduled run: post-draft installation self-heals to zero poller triggers', () => {
  const {context, state, log} = buildContext();
  stubSnapshot(context, snapshotRows(257));
  context.installDraftDayAutomation();
  assert.equal(triggersByHandler(state, 'scheduledDraftRefresh').length, 1, 'INSTALL refresh must not remove the fresh trigger');
  context.scheduledDraftRefresh();
  assert.equal(triggersByHandler(state, 'scheduledDraftRefresh').length, 0);
  assert.equal(triggersByHandler(state, 'seasonFocusCheck').length, 1);
  assert.deepEqual(logColumn(log, 2), ['SUCCESS', 'SUCCESS', 'COMPLETE']);
});

test('buildDefaultPickValues_ produces a full monotone 257-pick curve', () => {
  const {context} = buildContext();
  const values = context.buildDefaultPickValues_();
  assert.equal(values.length, 257);
  assert.equal(values[0], 3000);
  assert.equal(values[223], 2);
  assert.equal(values[256], 1);
  for (let index = 1; index < values.length; index += 1) {
    assert.ok(values[index] <= values[index - 1], `curve must not increase at pick ${index + 1}`);
  }
});

test('hasFormulaErrors_ catches every Sheets error literal including #ERROR!', () => {
  const {context} = buildContext();
  const sheet = new MockSheet(9999, 'Scratch');
  const errors = ['#REF!', '#DIV/0!', '#NUM!', '#N/A', '#VALUE!', '#NAME?', '#ERROR!', '#NULL!'];
  errors.forEach((value, index) => sheet.setCell(1, index + 1, value));
  sheet.getRangeList = a1Notations => ({
    getRanges: () => a1Notations.map(a1 => sheet.getRange(a1)),
  });
  errors.forEach((value, index) => {
    const a1 = `${String.fromCharCode(65 + index)}1`;
    assert.ok(context.hasFormulaErrors_(sheet, [a1]), `${value} must be detected`);
  });
  sheet.setCell(1, 9, 'clean value');
  assert.ok(!context.hasFormulaErrors_(sheet, ['I1']));
});

test('columnLetter_ maps 1, 26, 27, and 52 correctly', () => {
  const {context} = buildContext();
  assert.equal(context.columnLetter_(1), 'A');
  assert.equal(context.columnLetter_(26), 'Z');
  assert.equal(context.columnLetter_(27), 'AA');
  assert.equal(context.columnLetter_(52), 'AZ');
});

test('detectAnalysisType_ maps each analysis surface', () => {
  const {context, sheets} = buildContext();
  const teamCompare = findSheet(sheets, 'Team-Compare');
  assert.equal(context.detectAnalysisType_(teamCompare, 3), 'Team Comparison');
  assert.equal(context.detectAnalysisType_(teamCompare, 52), 'Fantasy Team Comparison');
  assert.equal(context.detectAnalysisType_(findSheet(sheets, 'Players-Compare'), 2), 'Player Comparison');
  assert.equal(context.detectAnalysisType_(findSheet(sheets, 'Players-College Cohorts'), 5), 'College Review');
  assert.equal(context.detectAnalysisType_(findSheet(sheets, 'Mock Lab'), 5), 'Mock Review');
  assert.equal(context.detectAnalysisType_(findSheet(sheets, 'Dashboard'), 5), 'Custom');
});

test('saveCurrentAnalysis snapshots the active view and logs a performance-tracked index row', () => {
  const {context, sheets} = buildContext({
    activeSheetName: 'Team-Compare',
    activeRow: 10,
    uiResponses: [{button: 'OK', text: 'Week One Edge'}, {button: 'OK', text: 'notes here'}],
  });
  const teamCompare = findSheet(sheets, 'Team-Compare');
  const chart = {id: 'live-chart'};
  teamCompare.charts.push(chart);
  const sheetCountBefore = sheets.length;
  context.saveCurrentAnalysis();
  const snapshot = findSheet(sheets, 'Saved - Week One Edge');
  assert.ok(snapshot, 'snapshot sheet must be created');
  assert.equal(sheets.length, sheetCountBefore + 1);
  assert.equal(snapshot.charts.length, 0, 'live charts must be removed from the snapshot');
  assert.equal(snapshot.tabColor, '#999999');
  assert.equal(snapshot.pasteOps.length, 1, 'snapshot must be flattened to values');
  assert.equal(snapshot.pasteOps[0].type, 'PASTE_VALUES');
  const analysis = findSheet(sheets, 'Analysis-Saved');
  const row = analysis.getLastRow();
  assert.equal(analysis.cellAt(row, 1), 'Week One Edge');
  assert.equal(analysis.cellAt(row, 2), 'Team Comparison');
  assert.equal(analysis.cellAt(row, 3), 'Kansas City Chiefs');
  assert.equal(analysis.cellAt(row, 6), 'Rueben Bain Jr.', 'player selectors must be read from the live vertical layout');
  assert.equal(analysis.cellAt(row, 10), 'Francis Mauigoa');
  assert.equal(analysis.cellAt(row, 12), 'notes here');
  assert.equal(analysis.cellAt(row, 13), 'test@example.org');
  assert.match(String(analysis.cellAt(row, 15)), /#gid=/);
  assert.equal(analysis.cellAt(row, 16), 0, 'picks at save must record the current pick count');
  assert.match(String(analysis.cellAt(row, 17)), /^=IF\(COUNTA/);
  assert.match(String(analysis.cellAt(row, 18)), /^=IFERROR\(ROUND\(AVERAGE/);
  assert.equal(analysis.cellAt(1, 15), 'Snapshot');
  assert.equal(analysis.cellAt(1, 16), 'Picks At Save');
  assert.equal(analysis.cellAt(1, 17), 'Players Drafted Now');
  assert.equal(analysis.cellAt(1, 18), 'Avg Actual Overall Now');
});

test('saveCurrentAnalysis on the fantasy block captures fantasy selectors', () => {
  const {context, sheets} = buildContext({
    activeSheetName: 'Team-Compare',
    activeRow: 52,
    uiResponses: [{button: 'OK', text: 'League Rivalry'}, {button: 'OK', text: ''}],
  });
  context.saveCurrentAnalysis();
  const analysis = findSheet(sheets, 'Analysis-Saved');
  const row = analysis.getLastRow();
  assert.equal(analysis.cellAt(row, 2), 'Fantasy Team Comparison');
  assert.equal(analysis.cellAt(row, 3), 'Fantasy Team 1');
  assert.equal(analysis.cellAt(row, 5), 'Fantasy Team 3');
});

test('saveCurrentAnalysis appends a counter to a duplicate snapshot name', () => {
  const {context, sheets, spreadsheet} = buildContext({
    activeSheetName: 'Team-Compare',
    activeRow: 3,
    uiResponses: [{button: 'OK', text: 'Week One Edge'}, {button: 'OK', text: ''}],
  });
  spreadsheet.insertSheet('Saved - Week One Edge');
  context.saveCurrentAnalysis();
  assert.ok(findSheet(sheets, 'Saved - Week One Edge (2)'), 'duplicate snapshot names must get a counter suffix');
});

test('saveCurrentAnalysis cancel and refusal paths write nothing', () => {
  const cancelled = buildContext({activeSheetName: 'Team-Compare', activeRow: 3, uiResponses: [{button: 'CANCEL'}]});
  const cancelledSheets = cancelled.sheets.length;
  const cancelledRows = findSheet(cancelled.sheets, 'Analysis-Saved').getLastRow();
  cancelled.context.saveCurrentAnalysis();
  assert.equal(cancelled.sheets.length, cancelledSheets);
  assert.equal(findSheet(cancelled.sheets, 'Analysis-Saved').getLastRow(), cancelledRows);

  const refused = buildContext({
    activeSheetName: 'Analysis-Saved',
    activeRow: 3,
    uiResponses: [{button: 'OK', text: 'X'}, {button: 'OK', text: ''}],
  });
  const refusedSheets = refused.sheets.length;
  refused.context.saveCurrentAnalysis();
  assert.equal(refused.state.alerts.length, 1, 'refused tabs must alert instead of saving');
  assert.equal(refused.sheets.length, refusedSheets);
  assert.equal(refused.state.uiResponses.length, 2, 'refusal must happen before any prompt');
});

test('updateStartHereGuide rebuilds navigation and instructions idempotently', () => {
  const {context, sheets} = buildContext();
  const startHere = findSheet(sheets, 'Start Here');
  context.updateStartHereGuide();
  assert.equal(startHere.cellAt(1, 1), '2026 NFL DRAFT WAR ROOM');
  const topLabels = startHere.getRange('A1:A20').getDisplayValues().flat();
  const statusRow = topLabels.indexOf('Workbook status') + 1;
  assert.ok(statusRow > 0, 'the Workbook status label must stay within A1:A20 for the health check');
  assert.match(String(startHere.cellAt(statusRow, 2)), /^=IF\(COUNTA/);
  const labels = columnAValues(startHere);
  assert.ok(labels.includes('Quick Navigation'));
  const trackerRow = labels.indexOf('Draft Tracker') + 1;
  assert.ok(trackerRow > 0);
  assert.match(String(startHere.cellAt(trackerRow, 2)), /#gid=1002/);
  assert.ok(!labels.includes('Draft History'), 'navigation must skip tabs that do not exist');
  assert.ok(labels.includes('Draft War Room Menu'));
  assert.ok(labels.includes('Save current analysis'));
  assert.ok(labels.includes('Build season forecast'));
  assert.ok(labels.includes('Save An Analysis'));
  assert.ok(labels.includes('First-Time Setup'));
  const firstDump = JSON.stringify(startHere.getDataRange().getValues());
  context.updateStartHereGuide();
  assert.equal(JSON.stringify(startHere.getDataRange().getValues()), firstDump, 'a second rebuild must produce identical content');
});

test('rebuildMobileView builds a single-column view and season mode reorders sections', () => {
  const {context, state, sheets} = buildContext();
  context.rebuildMobileView();
  const mobile = findSheet(sheets, 'Mobile');
  assert.ok(mobile, 'Mobile sheet must be created when missing');
  assert.equal(mobile.maxColumn, 1, 'mobile view must stay one vertical column');
  const draftLabels = columnAValues(mobile);
  assert.equal(draftLabels[1], 'DRAFT MODE');
  assert.ok(draftLabels.indexOf('Draft Status') < draftLabels.indexOf('Top Available'));
  assert.ok(draftLabels.indexOf('Top Available') < draftLabels.indexOf('Season'));
  assert.ok(draftLabels.includes('Shortcuts'));
  assert.ok(draftLabels.some(value => value.includes('SPARKLINE')), 'mobile view must carry an in-cell draft progress sparkline');
  state.properties.set('nflDraft2026MobileMode', 'SEASON');
  context.rebuildMobileView();
  const seasonLabels = columnAValues(mobile);
  assert.equal(seasonLabels[1], 'SEASON MODE');
  assert.ok(seasonLabels.indexOf('Season') < seasonLabels.indexOf('Draft Recap'), 'season mode must lead with the season section');
  assert.ok(seasonLabels.includes('Undrafted Free Agents'));
});

test('seasonFocusCheck waits a week, then flips mobile to season focus and cleans up', () => {
  const {context, state, sheets, log} = buildContext();
  state.triggers.push({handler: 'seasonFocusCheck'});
  state.properties.set('nflDraft2026CompletedAt', new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString());
  context.seasonFocusCheck();
  assert.equal(state.properties.get('nflDraft2026MobileMode') || null, null, 'season focus must wait a full week');
  assert.equal(triggersByHandler(state, 'seasonFocusCheck').length, 1);
  state.properties.set('nflDraft2026CompletedAt', new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString());
  context.seasonFocusCheck();
  assert.equal(state.properties.get('nflDraft2026MobileMode'), 'SEASON');
  const mobile = findSheet(sheets, 'Mobile');
  assert.ok(mobile);
  assert.ok(findSheet(sheets, 'Season Forecast'), 'season focus must build the forecast when it is missing');
  assert.deepEqual(state.moves[state.moves.length - 1], {sheet: mobile, position: 1}, 'mobile must move to the front of the tab list');
  assert.equal(triggersByHandler(state, 'seasonFocusCheck').length, 0, 'the daily check must remove itself after firing');
  assert.ok(logColumn(log, 2).includes('SEASON'));
});

test('buildSeasonForecast_ builds the table and matrix, preserves edits, and refuses a bare league', () => {
  const {context, spreadsheet, sheets} = buildContext();
  const forecast = context.buildSeasonForecast_(spreadsheet);
  assert.ok(forecast);
  assert.equal(forecast.cellAt(5, 1), 'Fantasy Team');
  assert.equal(forecast.cellAt(6, 1), 'Fantasy Team 1');
  assert.equal(forecast.cellAt(6, 3), 50, 'power rating must default to 50');
  assert.equal(forecast.cellAt(3, 2), 14, 'regular season games must default to 14');
  assert.match(String(forecast.cellAt(6, 4)), /^=IFERROR\(ROUND\(SUM\(B21:M21\)/);
  assert.match(String(forecast.cellAt(6, 7)), /^=EXP\(C6\/10\)/);
  assert.match(String(forecast.cellAt(6, 9)), /ROUND\(100\*\(1-G6\)\/G6,0\)/);
  assert.equal(forecast.cellAt(20, 2), 'Fantasy Team 1', 'matrix header must list every team');
  assert.match(String(forecast.cellAt(21, 3)), /^=IF\(\$A21=C\$20/);
  assert.match(String(forecast.cellAt(32, 13)), /VLOOKUP\(\$A32/, 'the full 12x12 matrix must be written');
  assert.equal(forecast.charts.length, 2, 'the forecast must carry its two native charts');
  assert.deepEqual(forecast.charts.map(chart => chart.options.title), ['Championship Odds', 'Expected Vs Actual Wins']);
  forecast.setCell(6, 3, 85);
  forecast.setCell(6, 5, 7);
  forecast.setCell(3, 2, 13);
  context.buildSeasonForecast_(spreadsheet);
  assert.equal(forecast.cellAt(6, 3), 85, 'edited power ratings must survive a rebuild');
  assert.equal(forecast.cellAt(6, 5), 7, 'edited actual wins must survive a rebuild');
  assert.equal(forecast.cellAt(3, 2), 13, 'edited season length must survive a rebuild');
  assert.equal(sheets.filter(sheet => sheet.getName() === 'Season Forecast').length, 1, 'rebuild must reuse the existing sheet');
  assert.equal(forecast.charts.length, 2, 'a rebuild must not stack duplicate charts');

  const bare = buildContext({emptyLeague: true});
  assert.equal(bare.context.buildSeasonForecast_(bare.spreadsheet), null, 'an unconfigured league must not produce a forecast');
});

test('forecast rebuild preserves edited inputs in a small league whose matrix overlaps rows 6-17', () => {
  const {context, spreadsheet, sheets} = buildContext({teamCount: 6});
  const forecast = context.buildSeasonForecast_(spreadsheet);
  assert.ok(forecast);
  for (let index = 0; index < 6; index += 1) {
    forecast.setCell(6 + index, 3, 85);
    forecast.setCell(6 + index, 5, 7);
  }
  context.buildSeasonForecast_(spreadsheet);
  for (let index = 0; index < 6; index += 1) {
    assert.equal(forecast.cellAt(6 + index, 3), 85, `power rating for team ${index + 1} must survive the rebuild`);
    assert.equal(forecast.cellAt(6 + index, 5), 7, `actual wins for team ${index + 1} must survive the rebuild`);
  }
  assert.ok(findSheet(sheets, 'Season Forecast'));
});

test('dashboard championship odds chart and mobile sparkline size to the actual league', () => {
  const {context, spreadsheet, sheets, state} = buildContext({teamCount: 8});
  context.buildSeasonForecast_(spreadsheet);
  const dashboard = findSheet(sheets, 'Dashboard');
  context.rebuildDashboardCharts();
  const odds = dashboard.charts.find(chart => chart.options.title === 'Championship Odds');
  assert.ok(odds);
  odds.ranges.forEach(range => {
    assert.equal(range.row, 5, 'odds chart must start at the table header row');
    assert.equal(range.numRows, 9, 'odds chart must cover the header plus exactly eight teams');
  });
  state.properties.set('nflDraft2026MobileMode', 'SEASON');
  context.rebuildMobileView();
  const mobile = findSheet(sheets, 'Mobile');
  const sparkline = columnAValues(mobile).find(value => value.includes('SPARKLINE') && value.includes('!G'));
  assert.ok(sparkline, 'season mobile view must carry the champion odds sparkline');
  assert.match(sparkline, /G6:G13/, 'champion sparkline must span exactly the eight team rows');
});

test('saved-analysis average actual formula handles undrafted players element-wise', () => {
  const {context, sheets} = buildContext({
    activeSheetName: 'Team-Compare',
    activeRow: 3,
    uiResponses: [{button: 'OK', text: 'Partial Draft'}, {button: 'OK', text: ''}],
  });
  context.saveCurrentAnalysis();
  const analysis = findSheet(sheets, 'Analysis-Saved');
  const formula = String(analysis.cellAt(analysis.getLastRow(), 18));
  assert.match(formula, /ARRAYFORMULA\(IFERROR\(VLOOKUP/, 'IFERROR must sit inside ARRAYFORMULA so lookup misses resolve per element');
});

test('report builder composes, preserves inputs, generates live and frozen reports, and registers them', () => {
  const {context, sheets, spreadsheet, state} = buildContext();
  context.buildSeasonForecast_(spreadsheet);
  const builder = context.openReportBuilder_(spreadsheet);
  assert.equal(builder.cellAt(8, 1), 'Slot');
  assert.ok(builder.getRange(4, 2).getDataValidation(), 'output mode must carry a dropdown');
  assert.ok(builder.getRange(9, 2).getDataValidation(), 'section type must carry a dropdown');
  assert.match(String(builder.cellAt(20, 3)), /^=IFERROR\(FILTER/, 'fantasy team choices must be live');
  builder.setCell(3, 2, 'Weekly Sheet');
  builder.setCell(4, 2, 'Live');
  builder.setCell(5, 2, 'league packet');
  builder.setCell(9, 2, 'NFL Team Draft');
  builder.setCell(9, 3, 'las vegas raiders');
  builder.setCell(10, 2, 'Position Group Board');
  builder.setCell(10, 3, 'qb');
  builder.setCell(10, 4, 3);
  builder.setCell(11, 2, 'Custom Range');
  builder.setCell(11, 3, 'Analytics!A4:I11');
  builder.setCell(12, 2, 'Position Group Board');
  builder.setCell(12, 3, 'KICKER');
  builder.setCell(13, 2, 'Fantasy Team Outlook');
  builder.setCell(13, 3, 'fantasy team 1');
  builder.setCell(14, 2, 'Custom Range');
  builder.setCell(14, 3, 'Big Board!A1:C5');
  builder.setCell(15, 2, 'Custom Range');
  builder.setCell(15, 3, 'Nowhere!A1:B2');
  const rebuilt = context.openReportBuilder_(spreadsheet);
  assert.equal(rebuilt.cellAt(3, 2), 'Weekly Sheet', 'builder inputs must survive a rebuild');
  assert.equal(rebuilt.cellAt(9, 3), 'las vegas raiders');
  context.generateReportFromBuilder();
  const report = findSheet(sheets, 'Report - Weekly Sheet');
  assert.ok(report, 'live report tab must be created');
  const labels = columnAValues(report);
  assert.equal(labels[0], 'WEEKLY SHEET');
  assert.ok(labels.includes('NFL Team Draft: Las Vegas Raiders'), 'focus must resolve case-insensitively');
  assert.ok(labels.includes('Position Group Board: QB'));
  assert.ok(labels.some(value => value.includes('Custom Range: Analytics!A4:I11')));
  assert.ok(labels.some(value => value.includes('"KICKER" was not found')), 'an unresolved focus must warn inline');
  assert.ok(labels.includes('Fantasy Team Outlook: Fantasy Team 1'));
  const reportValues = report.getDataRange().getValues().flat().map(String);
  assert.ok(reportValues.some(value => value.includes("{'Analytics'!A4:I11}")), 'custom range must inline the requoted reference');
  assert.ok(reportValues.some(value => value.includes("{'Big Board'!A1:C5}")), 'spaced sheet names must be quoted, not passed raw');
  assert.ok(labels.some(value => value.includes('"Nowhere!A1:B2" was not found')), 'an unknown sheet in a custom range must warn');
  assert.ok(reportValues.some(value => /INDEX\([^)]*,1,MATCH\(/.test(value)), 'tightest matchup must pass the row argument to INDEX on the one-row header range');
  assert.ok((report.formatClears || 0) >= 1, 'live generation must clear stale formats before writing');
  const analysis = findSheet(sheets, 'Analysis-Saved');
  const indexRow = analysis.getLastRow();
  assert.equal(analysis.cellAt(indexRow, 1), 'Weekly Sheet');
  assert.equal(analysis.cellAt(indexRow, 2), 'Custom Report');
  assert.equal(analysis.cellAt(indexRow, 12), 'league packet');
  assert.match(String(analysis.cellAt(indexRow, 15)), /#gid=/);
  context.generateReportFromBuilder();
  assert.equal(sheets.filter(sheet => sheet.getName() === 'Report - Weekly Sheet').length, 1, 'live regeneration must reuse the tab');
  builder.setCell(4, 2, 'Frozen');
  context.generateReportFromBuilder();
  const frozen = findSheet(sheets, 'Saved - Weekly Sheet');
  assert.ok(frozen, 'frozen report must join the Saved family');
  assert.equal(frozen.tabColor, '#999999');
  assert.equal(frozen.pasteOps.length, 1);
  assert.equal(frozen.pasteOps[0].type, 'PASTE_VALUES');
  context.generateReportFromBuilder();
  assert.ok(findSheet(sheets, 'Saved - Weekly Sheet (2)'), 'frozen reports must never overwrite');
  const empty = buildContext();
  empty.context.openReportBuilder_(empty.spreadsheet);
  empty.context.generateReportFromBuilder();
  assert.equal(empty.state.alerts.length, 1, 'an empty builder must alert instead of generating');
  assert.ok(!findSheet(empty.sheets, 'Report - Untitled Report'), 'nothing may be written for an empty builder');
});

test('resolvePlayerCompareSelectorCells_ reads the live vertical layout with a legacy fallback', () => {
  const {context, sheets} = buildContext();
  const playerCompare = findSheet(sheets, 'Players-Compare');
  const cells = context.resolvePlayerCompareSelectorCells_(playerCompare);
  assert.deepEqual(cells.map(cell => [cell.row, cell.column]), [[2, 2], [3, 2], [4, 2], [5, 2], [6, 2]]);
  const legacy = new MockSheet(nextSheetId(), 'Legacy Compare');
  legacy.setCell(2, 2, 'Someone');
  const fallback = context.resolvePlayerCompareSelectorCells_(legacy);
  assert.deepEqual(fallback.map(cell => [cell.row, cell.column]), [[2, 2], [2, 4], [2, 6], [2, 8], [2, 10]]);
});

test('repairPlayerCompareDeltaRow_ fills Actual Vs Projected from the Big Board delta column once', () => {
  const {context, sheets, spreadsheet} = buildContext();
  const bigBoard = findSheet(sheets, 'Big Board');
  bigBoard.setCell(1, 2, 'Player');
  bigBoard.setCell(1, 18, 'Delta Act-Projected');
  bigBoard.setCell(2, 2, 'Fernando Mendoza');
  bigBoard.setCell(2, 18, -3);
  const playerCompare = findSheet(sheets, 'Players-Compare');
  const done = [];
  const skipped = [];
  context.repairPlayerCompareDeltaRow_(spreadsheet, done, skipped);
  assert.equal(done.length, 1, skipped.join('; '));
  const formula = String(playerCompare.cellAt(20, 2));
  assert.match(formula, /^=IF\(B\$8=""/, 'delta formula must key off the grid header cell');
  assert.match(formula, /\$R\$2:\$R\$424/, 'delta formula must target the resolved Delta Act-Projected column');
  const again = [];
  const againSkipped = [];
  context.repairPlayerCompareDeltaRow_(spreadsheet, again, againSkipped);
  assert.equal(again.length, 0, 'a second run must skip the already-repaired row');
  assert.equal(againSkipped.length, 1);
});

test('repairPlayerCompareDeltaRow_ relabels instead of writing when the grid is a formula spill', () => {
  const {context, sheets, spreadsheet} = buildContext();
  const bigBoard = findSheet(sheets, 'Big Board');
  bigBoard.setCell(1, 2, 'Player');
  bigBoard.setCell(1, 18, 'Delta Act-Projected');
  const playerCompare = findSheet(sheets, 'Players-Compare');
  playerCompare.setCell(9, 2, '=MAP($A$9:$A$21,LAMBDA(metric,XLOOKUP(metric,BoardHeaders,BoardValues)))');
  const done = [];
  const skipped = [];
  context.repairPlayerCompareDeltaRow_(spreadsheet, done, skipped);
  assert.equal(done.length, 1, skipped.join('; '));
  assert.equal(playerCompare.cellAt(20, 1), 'Delta Act-Projected', 'metric label must be renamed to the live Big Board header');
  assert.equal(playerCompare.cellAt(20, 2), '', 'nothing may be written inside the spill range');
  const again = [];
  const againSkipped = [];
  context.repairPlayerCompareDeltaRow_(spreadsheet, again, againSkipped);
  assert.equal(again.length, 0, 'a relabeled grid must skip on rerun');
});

test('report formulas escape double quotes in resolved focus values', () => {
  const {context, sheets, spreadsheet} = buildContext();
  findSheet(sheets, '_nfl_info').setCell(5, 2, 'The "Silver" Team');
  const builder = context.openReportBuilder_(spreadsheet);
  builder.setCell(3, 2, 'Quote Test');
  builder.setCell(9, 2, 'NFL Team Draft');
  builder.setCell(9, 3, 'the "silver" team');
  context.generateReportFromBuilder();
  const report = findSheet(sheets, 'Report - Quote Test');
  const formulas = report.getDataRange().getValues().flat().map(String);
  assert.ok(formulas.some(value => value.includes('="The ""Silver"" Team"')), 'embedded string literals must double their quotes');
});

test('repairPlayerCompareHeaderLinks_ makes grid headers open the compared player bio', () => {
  const {context, sheets, spreadsheet} = buildContext();
  const playerCompare = findSheet(sheets, 'Players-Compare');
  const done = [];
  const skipped = [];
  context.repairPlayerCompareHeaderLinks_(spreadsheet, done, skipped);
  assert.equal(done.length, 1, skipped.join('; '));
  const formula = String(playerCompare.cellAt(8, 2));
  assert.match(formula, /HYPERLINK\("#gid=1004&range=A"&MATCH\(\$B\$2/, 'header must link to the bio row of the selector value');
  assert.match(String(playerCompare.cellAt(8, 6)), /\$B\$6/, 'fifth header must follow the fifth selector');
  const again = [];
  const againSkipped = [];
  context.repairPlayerCompareHeaderLinks_(spreadsheet, again, againSkipped);
  assert.equal(again.length, 0, 'a second run must skip already-linked headers');
});

test('linkPlayerNamesToBios converts static names, keeps formulas, and is idempotent', () => {
  const {context, sheets, log} = buildContext();
  const bigBoard = findSheet(sheets, 'Big Board');
  bigBoard.setCell(2, 2, 'Fernando Mendoza');
  bigBoard.setCell(3, 2, 'Red Murdock');
  bigBoard.setCell(4, 2, '=SOMEOTHERFORMULA()');
  const tracker = findSheet(sheets, 'Players-Draft Tracker');
  tracker.setCell(1, 1, 'Player');
  tracker.setCell(2, 1, 'Fernando Mendoza');
  context.linkPlayerNamesToBios();
  assert.match(String(bigBoard.cellAt(2, 2)), /^=IFERROR\(HYPERLINK\("#gid=1004&range=A"&MATCH\("Fernando Mendoza"/);
  assert.match(String(bigBoard.cellAt(3, 2)), /Red Murdock/);
  assert.equal(bigBoard.cellAt(4, 2), '=SOMEOTHERFORMULA()', 'existing formulas must not be replaced');
  assert.match(String(tracker.cellAt(2, 1)), /^=IFERROR\(HYPERLINK/);
  const linked = String(bigBoard.cellAt(2, 2));
  context.linkPlayerNamesToBios();
  assert.equal(String(bigBoard.cellAt(2, 2)), linked, 'a second run must leave linked cells unchanged');
  assert.ok(logColumn(log, 6).some(message => String(message).startsWith('LINKS:')));
});

test('buildRecommendations_ builds draft lists, season calls, and the value chart', () => {
  const {context, sheets, spreadsheet} = buildContext();
  context.buildSeasonForecast_(spreadsheet);
  const sheet = context.buildRecommendations_(spreadsheet);
  assert.ok(sheet);
  const labels = columnAValues(sheet);
  assert.equal(labels[0], 'RECOMMENDATIONS');
  assert.ok(labels.includes('Undrafted Free Agent Targets'));
  assert.ok(labels.includes('Best Value Picks (slid furthest past board rank)'));
  assert.ok(labels.includes('Biggest Reaches (taken furthest above board rank)'));
  assert.ok(labels.includes('Title Contenders'));
  assert.ok(labels.includes('Dark Horse Value Plays (best payout outside the top three)'));
  assert.ok(labels.includes('Tightest Matchups (closest to a coin flip)'));
  assert.ok(labels.includes('Fantasy Team 1'), 'every team gets a tightest-matchup row');
  const faRow = labels.indexOf('Undrafted Free Agent Targets') + 3;
  assert.match(String(sheet.cellAt(faRow, 1)), /HYPERLINK/, 'player lists must link to bios');
  assert.match(String(sheet.cellAt(faRow, 2)), /^=IFERROR\(ARRAY_CONSTRAIN\(SORT\(FILTER/);
  assert.equal(sheet.charts.length, 1);
  assert.equal(sheet.charts[0].options.title, 'Draft Value Board');
  context.buildRecommendations_(spreadsheet);
  assert.equal(sheets.filter(candidate => candidate.getName() === 'Recommendations').length, 1);
  assert.equal(findSheet(sheets, 'Recommendations').charts.length, 1, 'rebuild must not stack charts');
});

test('buildDraftOptimizer_ builds a snake board, preserves picks, and recommends from availability', () => {
  const {context, sheets, spreadsheet} = buildContext();
  const sheet = context.buildDraftOptimizer_(spreadsheet);
  assert.ok(sheet);
  const labels = columnAValues(sheet);
  assert.equal(labels[0], 'DRAFT OPTIMIZER');
  assert.ok(labels.includes('On The Clock'));
  assert.ok(labels.includes('Recommended Now (best available by NFL grade)'));
  assert.ok(labels.includes('Best Available By Group'));
  assert.ok(labels.includes('Draft Board'));
  assert.equal(sheet.cellAt(42, 1), 1);
  assert.equal(sheet.cellAt(42, 3), 'Fantasy Team 1');
  assert.equal(sheet.cellAt(53, 3), 'Fantasy Team 12', 'round one ends with the last slot');
  assert.equal(sheet.cellAt(54, 3), 'Fantasy Team 12', 'round two must snake back');
  assert.equal(sheet.getLastRow(), 41 + 15 * 12, 'default board covers 15 rounds of 12 picks');
  assert.match(String(sheet.cellAt(6, 1)), /on the clock/, 'on-the-clock formula present');
  assert.match(String(sheet.cellAt(10, 1)), /HYPERLINK/, 'recommendations link to bios');
  assert.match(String(sheet.cellAt(30, 2)), /^=SUMPRODUCT/, 'scarcity counts remaining quality by group');
  sheet.setCell(42, 4, 'Fernando Mendoza');
  sheet.setCell(3, 2, 3);
  context.buildDraftOptimizer_(spreadsheet);
  assert.equal(sheet.cellAt(42, 4), 'Fernando Mendoza', 'recorded picks must survive a rebuild');
  assert.equal(sheet.cellAt(41 + 3 * 12, 1), 36, 'edited round count must resize the board to 36 picks');
  assert.equal(sheet.cellAt(41 + 3 * 12 + 1, 1), '', 'rows beyond the resized board must be cleared');
  const bare = buildContext({emptyLeague: true});
  assert.equal(bare.context.buildDraftOptimizer_(bare.spreadsheet), null);
});

test('rebuildDashboardCharts covers the draft, the season forecast, and saved analyses', () => {
  const {context, sheets, spreadsheet} = buildContext({
    activeSheetName: 'Team-Compare',
    activeRow: 3,
    uiResponses: [{button: 'OK', text: 'Chart Fuel'}, {button: 'OK', text: ''}],
  });
  const dashboard = findSheet(sheets, 'Dashboard');
  context.rebuildDashboardCharts();
  const baseTitles = dashboard.charts.map(chart => chart.options.title);
  assert.ok(baseTitles.includes('Selections by Round'));
  assert.ok(baseTitles.includes('NFL Grade Distribution'));
  assert.ok(!baseTitles.includes('Championship Odds'), 'no forecast tab yet, so no odds chart');
  context.buildSeasonForecast_(spreadsheet);
  context.saveCurrentAnalysis();
  context.rebuildDashboardCharts();
  const fullTitles = dashboard.charts.map(chart => chart.options.title);
  assert.ok(fullTitles.includes('Championship Odds'), 'forecast odds must chart on Dashboard once the tab exists');
  assert.ok(fullTitles.includes('Saved Analysis Performance'), 'saved analyses must chart on Dashboard once one exists');
  assert.equal(dashboard.charts.length, fullTitles.length, 'rebuild must replace, not stack, dashboard charts');
});

test('repairTrackerActualColumns_ installs guarded act formulas once and skips unknown layouts', () => {
  const {context, tracker, spreadsheet} = buildContext();
  ['Player', 'Proj Team', 'Pos', 'NFL Grade', 'Proj Pick', 'Act Pick', 'Act Team', 'Board Rank', 'Value vs Rank', 'Proj Round', 'Act Round']
    .forEach((label, index) => tracker.setCell(1, index + 1, label));
  tracker.setCell(2, 1, 'Fernando Mendoza');
  const done = [];
  const skipped = [];
  context.repairTrackerActualColumns_(spreadsheet, done, skipped);
  assert.equal(done.length, 1);
  assert.equal(
    tracker.cellAt(2, 6),
    '=IF($A2="","",IFNA(XLOOKUP($A2,\'_actuals\'!$E$2:$E$258,\'_actuals\'!$B$2:$B$258),""))'
  );
  assert.equal(
    tracker.cellAt(2, 9),
    '=IF(OR($A2="",$F2=""),"",IFNA(XLOOKUP($A2,\'_actuals\'!$E$2:$E$258,\'_actuals\'!$C$2:$C$258),"")-$H2)'
  );
  assert.ok(tracker.cellAt(258, 11).includes('$A258'), 'formulas must cover all 257 projection rows');
  const done2 = [];
  const skipped2 = [];
  context.repairTrackerActualColumns_(spreadsheet, done2, skipped2);
  assert.equal(done2.length, 0, 'second run must skip');
  assert.ok(skipped2[0].includes('already formula-driven'));
  tracker.setCell(1, 6, 'Pick');
  tracker.setCell(2, 6, '');
  const done3 = [];
  const skipped3 = [];
  context.repairTrackerActualColumns_(spreadsheet, done3, skipped3);
  assert.equal(done3.length, 0, 'renamed act header must skip, never overwrite');
  assert.ok(skipped3[0].includes('layout not recognized'));
});

test('repairKnownIssues survives a missing sheet, applies what it can, and always logs', () => {
  const {context, log, sheets} = buildContext();
  // Drop a sheet a repair hard-requires: the runner must isolate the fault, keep going, and
  // still land a log row naming what failed.
  const index = sheets.findIndex(sheet => sheet.getName() === 'Team-Report');
  sheets.splice(index, 1);
  assert.doesNotThrow(() => context.repairKnownIssues());
  const lastRow = log.getLastRow();
  assert.ok(lastRow >= 2, 'a repair log row must always land');
  const message = String(log.cellAt(lastRow, 6));
  assert.ok(
    message.includes('team view sources failed: Missing required sheet: Team-Report'),
    `log must name the failed repair, got: ${message}`
  );
  assert.equal(log.cellAt(lastRow, 2), 'CHECK', 'a run containing a failure must not log PASS');
});

// Seeded from the owner's live Commissioner Dashboard: labelled counters on the readiness row
// (5), the orphan one row BELOW it at F6, and the Draft Quality Gate table starting at row 7.
// The old fixture put its orphan at rows 8-9, inside the superseded hardcoded window, so it
// passed against code that could never find the real one.
function seedCommissionerDashboard(spreadsheet) {
  const sheet = spreadsheet.insertSheet('Commissioner Dashboard');
  sheet.setCell(1, 1, 'Commissioner Dashboard');
  sheet.setCell(4, 1, 'League');
  sheet.setCell(4, 2, 'Game of Chodes');
  sheet.setCell(5, 1, 'Rule Readiness');
  sheet.setCell(5, 2, '13/14');
  sheet.setCell(5, 4, 'Quality Checks');
  sheet.setCell(5, 5, '3/7');
  sheet.setCell(5, 7, 'Picks Loaded');
  sheet.setCell(5, 8, '0/257');
  sheet.setCell(6, 6, '4/8');
  sheet.setCell(7, 1, 'Draft Quality Gate');
  sheet.setCell(8, 1, 'Check');
  sheet.setCell(8, 2, 'Result');
  sheet.setCell(8, 3, 'Owner');
  sheet.setCell(9, 1, 'Commissioner Assignment');
  sheet.setCell(9, 2, 'PENDING');
  sheet.setCell(9, 3, 'Config');
  return sheet;
}

test('commissioner stray scan finds the live orphan below the readiness row and spares labeled counters', () => {
  const {context, spreadsheet} = buildContext();
  const sheet = seedCommissionerDashboard(spreadsheet);
  const done = [];
  const skipped = [];
  context.repairCommissionerDashboardStray_(spreadsheet, done, skipped);
  assert.equal(sheet.cellAt(6, 6), '', 'the orphaned F6 counter must clear');
  assert.equal(done.length, 1, 'clearing the live orphan must be reported as a repair');
  assert.equal(sheet.cellAt(5, 2), '13/14', 'a ratio beside its label must survive');
  assert.equal(sheet.cellAt(5, 5), '3/7', 'a ratio beside its label must survive');
  assert.equal(sheet.cellAt(5, 8), '0/257', 'a ratio beside its label must survive');
  assert.equal(sheet.cellAt(9, 2), 'PENDING', 'the quality gate table must be untouched');
  const done2 = [];
  const skipped2 = [];
  context.repairCommissionerDashboardStray_(spreadsheet, done2, skipped2);
  assert.equal(done2.length, 0, 'second run must be a no-op');
  assert.deepEqual(skipped2, ['Commissioner Dashboard already clean']);
  assert.equal(sheet.cellAt(5, 2), '13/14', 'repeat runs must never erode labeled data');
});

test('commissioner stray scan leaves an unrecognized dashboard completely untouched', () => {
  const {context, spreadsheet} = buildContext();
  const sheet = spreadsheet.insertSheet('Commissioner Dashboard');
  sheet.setCell(6, 6, '4/8');
  const done = [];
  const skipped = [];
  context.repairCommissionerDashboardStray_(spreadsheet, done, skipped);
  assert.equal(sheet.cellAt(6, 6), '4/8', 'no readiness anchor means no clearing');
  assert.equal(done.length, 0);
  assert.deepEqual(skipped, ['Commissioner Dashboard readiness row not found, left untouched']);
});

test('board-by-position repair rebuilds URL breakage but never touches unrecognized layouts', () => {
  const {context, sheets, spreadsheet} = buildContext();
  const bigBoard = findSheet(sheets, 'Big Board');
  bigBoard.setCell(1, 1, 'Rank');
  const board = spreadsheet.insertSheet('Board-By Position');
  board.setCell(3, 1, 'Position:');
  board.setCell(3, 2, 'All');
  ['Board Rank', 'Player', 'Pos', 'Group', 'College', 'NFL Grade', 'Production', 'Athleticism', 'Drafted', 'Overall', 'Draft Team', 'Projection']
    .forEach((label, index) => board.setCell(4, index + 1, label));
  board.setCell(5, 12, 'https://www.nfl.com/prospects/arvell-reese');
  assert.equal(context.boardByPositionState_(board), 'broken');
  const done = [];
  const skipped = [];
  context.repairBoardByPositionProjection_(spreadsheet, done, skipped);
  assert.equal(done.length, 1);
  const anchor = board.cellAt(5, 1);
  assert.ok(anchor.includes("'Big Board'!L2:L424"), 'projection output must come from Big Board column L');
  assert.ok(!anchor.includes("'Big Board'!U2:U424"), 'the URL column must not be projected');
  assert.equal(context.boardByPositionState_(board), 'ok');

  const renamed = spreadsheet.insertSheet('Renamed Board');
  renamed.setCell(4, 1, 'Board Rank');
  renamed.setCell(4, 12, 'Proj Round');
  renamed.setCell(5, 12, 'scouting note that must survive');
  assert.equal(context.boardByPositionState_(renamed), 'unrecognized');
  assert.equal(renamed.cellAt(5, 12), 'scouting note that must survive');
});

test('post-draft scheduled completion marks _updates COMPLETE', () => {
  const {context, status} = buildContext({triggerInstalled: true});
  stubSnapshot(context, snapshotRows(257));
  context.refreshDraftSnapshot_({initiator: 'SCHEDULED', showToast: false});
  assert.equal(status.cellAt(2, 2), 'COMPLETE', 'feed status must not report LIVE after the poller retires itself');
});

test('startHereStatusFormula_ counts the official actuals, not the projection tracker', () => {
  const {context, spreadsheet} = buildContext();
  assert.equal(
    context.startHereStatusFormula_(spreadsheet),
    '=IF(COUNTA(\'_actuals\'!E2:E258)>=257,"COMPLETE",COUNTA(\'_actuals\'!E2:E258)&" of 257 picks loaded")'
  );
});

// --- 2026-08-28 adversarial review regressions ---

test('resolveTrackerColumns_ maps the owner live header and refuses unknown or duplicate layouts', () => {
  const {context, tracker} = buildContext();
  LIVE_TRACKER_HEADER.forEach((label, index) => tracker.setCell(1, index + 1, label));
  const labels = readConst(context, 'TRACKER_HEADER_LABELS');
  const columns = readConst(context, 'TRACKER_COLUMNS');
  const resolved = context.resolveTrackerColumns_(tracker);
  assert.ok(resolved, 'the live header must resolve');
  LIVE_TRACKER_HEADER.forEach((label, index) => {
    const key = Object.keys(labels).find(candidate => labels[candidate] === label);
    assert.ok(key, `${label} must be a known tracker field`);
    assert.equal(resolved[key], index + 1, `${label} must resolve to column ${index + 1}`);
  });
  // The documented default must agree with the live sheet, so the constant is never a trap.
  Object.keys(columns).forEach(key => {
    assert.equal(
      LIVE_TRACKER_HEADER[columns[key] - 1],
      labels[key],
      `TRACKER_COLUMNS.${key} must point at its own label in the live header`
    );
  });
  tracker.setCell(1, 3, 'Renamed');
  assert.equal(context.resolveTrackerColumns_(tracker), null, 'a missing label must refuse');
  tracker.setCell(1, 3, 'Act Pick');
  tracker.setCell(1, 12, 'Act Pick');
  assert.equal(context.resolveTrackerColumns_(tracker), null, 'a duplicated label must refuse');
});

test('tracker act formulas target the resolved columns, not the superseded letters', () => {
  const {context, tracker, spreadsheet} = buildContext();
  LIVE_TRACKER_HEADER.forEach((label, index) => tracker.setCell(1, index + 1, label));
  tracker.setCell(2, 1, 'Fernando Mendoza');
  tracker.setCell(2, 6, 'QB');
  tracker.setCell(2, 8, 'Las Vegas Raiders');
  const done = [];
  const skipped = [];
  context.repairTrackerActualColumns_(spreadsheet, done, skipped);
  assert.equal(done.length, 1, 'the live layout must be repairable');
  assert.equal(
    tracker.cellAt(2, 3),
    '=IF($A2="","",IFNA(XLOOKUP($A2,\'_actuals\'!$E$2:$E$258,\'_actuals\'!$B$2:$B$258),""))',
    'Act Pick formula belongs in column C'
  );
  assert.equal(
    tracker.cellAt(2, 4),
    '=IF(OR($A2="",$C2=""),"",IFNA(XLOOKUP($A2,\'_actuals\'!$E$2:$E$258,\'_actuals\'!$C$2:$C$258),"")-$E2)',
    'Value vs Rank must gate on Act Pick in C and subtract Board Rank in E'
  );
  assert.equal(tracker.cellAt(2, 6), 'QB', 'Pos must never be overwritten');
  assert.equal(tracker.cellAt(2, 8), 'Las Vegas Raiders', 'Proj Team must never be overwritten');
  assert.ok(tracker.cellAt(258, 11).includes('$A258'), 'formulas must cover all 257 rows');
});

test('tracker repair refuses a layout it cannot resolve instead of writing over data', () => {
  const {context, tracker, spreadsheet} = buildContext();
  ['Player', 'Something Else', 'Pos'].forEach((label, index) => tracker.setCell(1, index + 1, label));
  tracker.setCell(2, 2, 'owner data');
  const done = [];
  const skipped = [];
  context.repairTrackerActualColumns_(spreadsheet, done, skipped);
  assert.equal(done.length, 0);
  assert.deepEqual(skipped, ['tracker layout not recognized, act columns left untouched']);
  assert.equal(tracker.cellAt(2, 2), 'owner data', 'an unresolved layout must be left alone');
});

test('team view repair preserves every vertically stacked Team-Compare block', () => {
  const {context, sheets, spreadsheet} = buildContext();
  const bigBoard = findSheet(sheets, 'Big Board');
  bigBoard.setCell(1, 1, 'Rank');
  const teamCompare = findSheet(sheets, 'Team-Compare');
  const teamReport = findSheet(sheets, 'Team-Report');
  teamReport.setCell(3, 2, 'Buffalo Bills');
  const done = [];
  const skipped = [];
  context.repairTeamViewSources_(spreadsheet, done, skipped);
  assert.equal(teamCompare.cellAt(18, 1), 'Team 2', 'the Team 2 label must survive');
  assert.equal(teamCompare.cellAt(18, 2), 'Chicago Bears', 'the Team 2 selector must survive');
  assert.equal(teamCompare.cellAt(33, 1), 'Team 3', 'the Team 3 label must survive');
  assert.equal(teamCompare.cellAt(33, 2), 'Detroit Lions', 'the Team 3 selector must survive');
  assert.equal(teamCompare.cellAt(20, 1), 'Round', 'the Team 2 header row must survive');
  assert.equal(teamCompare.cellAt(35, 1), 'Round', 'the Team 3 header row must survive');
  [[6, '$B$3'], [21, '$B$18'], [36, '$B$33']].forEach(([anchorRow, selector]) => {
    const formula = teamCompare.cellAt(anchorRow, 1);
    assert.ok(formula.includes('_actuals'), `block at row ${anchorRow} must be rebuilt from actuals`);
    assert.ok(formula.includes(selector), `block at row ${anchorRow} must key on its own selector ${selector}`);
  });
});

test('team view repair leaves an unrecognized Team-Compare completely untouched', () => {
  const {context, sheets, spreadsheet} = buildContext();
  findSheet(sheets, 'Big Board').setCell(1, 1, 'Rank');
  const teamCompare = findSheet(sheets, 'Team-Compare');
  teamCompare.cells.clear();
  teamCompare.setCell(6, 1, 'owner data the script did not create');
  const done = [];
  const skipped = [];
  context.repairTeamViewSources_(spreadsheet, done, skipped);
  assert.equal(teamCompare.cellAt(6, 1), 'owner data the script did not create');
  assert.ok(skipped.includes('Team-Compare layout not recognized, left untouched'));
});

test('saveCurrentAnalysis reads NFL selectors from the detected blocks', () => {
  const {context, sheets} = buildContext({
    activeSheetName: 'Team-Compare',
    activeRow: 10,
    uiResponses: [{button: 'OK', text: 'Vertical Blocks'}, {button: 'OK', text: ''}],
  });
  context.saveCurrentAnalysis();
  const analysis = findSheet(sheets, 'Analysis-Saved');
  const row = analysis.getLastRow();
  assert.equal(analysis.cellAt(row, 3), 'Kansas City Chiefs');
  assert.equal(analysis.cellAt(row, 4), 'Chicago Bears', 'Team 2 selector must come from its real cell');
  assert.equal(analysis.cellAt(row, 5), 'Detroit Lions', 'Team 3 selector must come from its real cell');
});

test('players-compare stray scan clears the fragment wherever it sits', () => {
  const {context, sheets, spreadsheet} = buildContext();
  const playerCompare = findSheet(sheets, 'Players-Compare');
  ['Actual Overall', 'Actual Vs Projected', 'Draft Team'].forEach((label, index) => {
    playerCompare.setCell(9, 11 + index, label);
  });
  const done = [];
  const skipped = [];
  context.repairPlayerCompareSelectors_(spreadsheet, done, skipped);
  assert.equal(playerCompare.cellAt(9, 11), '', 'the K9 fragment must clear');
  assert.equal(playerCompare.cellAt(9, 13), '', 'the M9 fragment must clear');
  assert.ok(done.some(entry => entry.includes('K9:M9')), 'the cleared address must be reported');
  const done2 = [];
  const skipped2 = [];
  context.repairPlayerCompareSelectors_(spreadsheet, done2, skipped2);
  assert.ok(skipped2.some(entry => entry.includes('no orphaned header fragment')));
});

test('players-compare stray scan spares a real K:M section that has data under it', () => {
  const {context, sheets, spreadsheet} = buildContext();
  const playerCompare = findSheet(sheets, 'Players-Compare');
  ['Actual Overall', 'Actual Vs Projected', 'Draft Team'].forEach((label, index) => {
    playerCompare.setCell(9, 11 + index, label);
  });
  playerCompare.setCell(10, 11, '5');
  const done = [];
  const skipped = [];
  context.repairPlayerCompareSelectors_(spreadsheet, done, skipped);
  assert.equal(playerCompare.cellAt(9, 11), 'Actual Overall', 'a header with data under it is a real section');
});

test('college cohort repair clears duplicate blocks once and then reports clean', () => {
  const {context, sheets, spreadsheet} = buildContext();
  const cohorts = findSheet(sheets, 'Players-College Cohorts');
  cohorts.setCell(3, 8, 'College Selector');
  cohorts.setCell(3, 9, 'Penn State');
  cohorts.setCell(9, 8, 'Olaivavega Ioane');
  cohorts.setCell(21, 8, 'College Selector');
  cohorts.setCell(21, 9, 'Miami');
  cohorts.setCell(27, 8, 'A.J. Haulcy');
  cohorts.setCell(39, 8, 'College Selector');
  cohorts.setCell(39, 9, 'Florida');
  const done = [];
  const skipped = [];
  context.repairCollegeCohortDuplicates_(spreadsheet, done, skipped);
  assert.equal(cohorts.cellAt(3, 8), 'College Selector', 'the contract block must survive');
  assert.equal(cohorts.cellAt(9, 8), 'Olaivavega Ioane', 'the contract roster must survive');
  assert.equal(cohorts.cellAt(21, 8), '', 'the first duplicate block must clear');
  assert.equal(cohorts.cellAt(27, 8), '', 'the mirrored roster must clear');
  assert.equal(cohorts.cellAt(39, 8), '', 'the second duplicate block must clear');
  const done2 = [];
  const skipped2 = [];
  context.repairCollegeCohortDuplicates_(spreadsheet, done2, skipped2);
  assert.equal(done2.length, 0, 'second run must be a no-op');
  assert.ok(skipped2.some(entry => entry.includes('single cohort block')));
});

test('repairKnownIssues logs CHECK rather than PASS when a repair throws', () => {
  const {context, sheets, log} = buildContext();
  const teamReport = findSheet(sheets, 'Team-Report');
  teamReport.getRange = () => {
    throw new Error('simulated Sheets failure');
  };
  context.repairKnownIssues();
  const lastRow = log.getLastRow();
  assert.equal(log.cellAt(lastRow, 2), 'CHECK', 'a failed repair must not be logged as PASS');
  assert.ok(String(log.cellAt(lastRow, 6)).includes('failed'), 'the log must name the failure');
});

test('post-draft manual refresh keeps COMPLETE and never demotes the feed to LIVE', () => {
  const {context, status} = buildContext({triggerInstalled: true});
  stubSnapshot(context, snapshotRows(257));
  context.refreshDraftSnapshot_({initiator: 'SCHEDULED', showToast: false});
  assert.equal(status.cellAt(2, 2), 'COMPLETE');
  context.refreshDraftSnapshot_({initiator: 'MANUAL', showToast: false});
  assert.equal(status.cellAt(2, 2), 'COMPLETE', 'a later manual refresh must not demote a finished draft');
});

test('a completion bookkeeping failure is logged without failing the ingest that succeeded', () => {
  const {context, state, status, log, actuals} = buildContext({triggerInstalled: true});
  stubSnapshot(context, snapshotRows(257));
  const realNewTrigger = context.ScriptApp.newTrigger;
  context.ScriptApp.newTrigger = () => {
    throw new Error('trigger quota exceeded');
  };
  assert.doesNotThrow(() => context.refreshDraftSnapshot_({initiator: 'MANUAL', showToast: false}));
  context.ScriptApp.newTrigger = realNewTrigger;
  assert.equal(actuals.cellAt(2, 5), 'Player 1', 'the snapshot must still land');
  assert.equal(status.cellAt(2, 2), 'COMPLETE', 'status must reflect the data that landed');
  const statuses = logColumn(log, 2);
  assert.ok(statuses.includes('SUCCESS'), 'the successful ingest must be logged as SUCCESS');
  assert.ok(statuses.includes('CHECK'), 'the bookkeeping failure must be logged separately');
  assert.ok(!statuses.includes('ERROR'), 'a successful ingest must never be logged as ERROR');
});

test('season focus runs once and is never re-armed by later refreshes', () => {
  const {context, state} = buildContext({triggerInstalled: true});
  stubSnapshot(context, snapshotRows(257));
  context.refreshDraftSnapshot_({initiator: 'SCHEDULED', showToast: false});
  assert.equal(triggersByHandler(state, 'seasonFocusCheck').length, 1);
  state.properties.set('nflDraft2026CompletedAt', new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString());
  context.seasonFocusCheck();
  assert.equal(triggersByHandler(state, 'seasonFocusCheck').length, 0, 'the check must remove itself');
  assert.equal(state.properties.get('nflDraft2026SeasonFocusDone'), 'true');
  context.refreshDraftSnapshot_({initiator: 'MANUAL', showToast: false});
  assert.equal(triggersByHandler(state, 'seasonFocusCheck').length, 0, 'a later refresh must not re-arm the flip');
});

test('a teams payload missing franchises reports the payload, not a per-row data error', () => {
  const {context} = buildContext();
  const profiles = [];
  for (let overall = 1; overall <= 257; overall += 1) {
    profiles.push({draftRound: 1, draftPick: overall, draftOverallPick: overall, draftTeamId: 'T1', person: {displayName: `Player ${overall}`}});
  }
  const flight = `${JSON.stringify({state: {data: {profiles}}, queryKey: ['useFetchProspectsProfiles']})} ${JSON.stringify({state: {data: [{id: 'T1', teamType: 'TEAM', fullName: 'Las Vegas Raiders'}]}, queryKey: ['useFetchExperienceTeams']})}`;
  context.UrlFetchApp.fetch = () => ({
    getResponseCode: () => 200,
    getContentText: () => `<script>self.__next_f.push([1,${JSON.stringify(flight)}])</script>`,
  });
  assert.throws(() => context.fetchOfficialDraftSnapshot_(), /resolved only 1 of 32 franchises/);
});

test('rebuildDashboardCharts replaces its own charts and keeps charts added by hand', () => {
  const {context, sheets} = buildContext();
  const dashboard = findSheet(sheets, 'Dashboard');
  const chartWithTitle = title => ({getOptions: () => ({get: key => (key === 'title' ? title : null)})});
  const ownChart = chartWithTitle('Selections by Round');
  const userChart = chartWithTitle('My Own Chart');
  dashboard.charts.push(ownChart, userChart);
  context.rebuildDashboardCharts();
  assert.ok(!dashboard.charts.includes(ownChart), 'a stale copy of an owned chart must be replaced');
  assert.ok(dashboard.charts.includes(userChart), 'a chart the owner added must survive a rebuild');
  const rebuiltTitles = dashboard.charts.filter(chart => chart.options).map(chart => chart.options.title);
  assert.ok(rebuiltTitles.includes('Selections by Round'), 'owned charts must be rebuilt');
});

test('optimizer restores recorded picks by round and team, not by pick ordinal', () => {
  const {context, sheets, spreadsheet} = buildContext();
  findSheet(sheets, 'Big Board').setCell(2, 2, 'Prospect 1');
  const config = findSheet(sheets, '_config');
  const sheet = context.buildDraftOptimizer_(spreadsheet);
  assert.ok(sheet, 'a 12-team league must build');
  const boardTop = 42;
  assert.equal(sheet.cellAt(boardTop, 3), 'Fantasy Team 1');
  assert.equal(sheet.cellAt(boardTop + 1, 3), 'Fantasy Team 2');
  sheet.setCell(boardTop + 1, 4, 'Drafted By Team 2');
  // Shrink the league to 10 teams: pick ordinal 2 still belongs to team 2, but ordinal-keyed
  // restore would move later rounds' picks to the wrong rosters.
  config.setCell(12, 6, '');
  config.setCell(13, 6, '');
  const rebuilt = context.buildDraftOptimizer_(spreadsheet);
  const round2Team2Row = boardTop + 10 + 8;
  assert.equal(rebuilt.cellAt(boardTop + 1, 3), 'Fantasy Team 2');
  assert.equal(rebuilt.cellAt(boardTop + 1, 4), 'Drafted By Team 2', 'the pick must stay with its team');
  assert.equal(rebuilt.cellAt(round2Team2Row, 4), '', 'no other roster may inherit the pick');
});

test('ensureActualsSheet_ sizes an existing shortened sheet instead of throwing', () => {
  const {context, spreadsheet, actuals} = buildContext();
  actuals.maxRows = 10;
  actuals.maxColumns = 2;
  const sized = context.ensureActualsSheet_(spreadsheet);
  assert.ok(sized.getMaxRows() >= 258, 'rows must grow to hold the full class');
  assert.ok(sized.getMaxColumns() >= 5, 'columns must grow to hold the snapshot shape');
  assert.doesNotThrow(() => context.getActualRows_(spreadsheet));
});

test('mobile view reports "Updated: never" before the first refresh', () => {
  const {context, spreadsheet} = buildContext();
  const sheet = context.rebuildMobileView_(spreadsheet, 'DRAFT');
  const formulas = columnAValues(sheet).filter(value => String(value).includes('Updated'));
  assert.ok(formulas.length > 0, 'the updated line must exist');
  assert.ok(
    formulas[0].includes('="","Updated: never"'),
    'a blank timestamp must short-circuit to "never" rather than formatting an empty date'
  );
});

test('recommendations matchup lookups index a single row by column', () => {
  const {context, spreadsheet, sheets} = buildContext();
  findSheet(sheets, 'Big Board').setCell(2, 2, 'Prospect 1');
  context.buildSeasonForecast_(spreadsheet);
  const sheet = context.buildRecommendations_(spreadsheet);
  const indexFormulas = [];
  for (let row = 1; row <= sheet.getLastRow(); row += 1) {
    for (let column = 1; column <= 5; column += 1) {
      const value = String(sheet.cellAt(row, column));
      if (value.includes('MATCH(MIN(')) {
        indexFormulas.push(value);
      }
    }
  }
  assert.ok(indexFormulas.length > 0, 'the tightest-matchup formulas must exist');
  indexFormulas.forEach(formula => {
    assert.ok(
      /INDEX\([^,]*(!\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?\d+|\)),1,MATCH\(MIN\(/.test(formula),
      `single-row INDEX must pass a column offset: ${formula}`
    );
  });
});

test('analytics value formulas reference the resolved Value vs Rank and Act Round columns', () => {
  const {context, sheets, tracker, spreadsheet} = buildContext();
  LIVE_TRACKER_HEADER.forEach((label, index) => tracker.setCell(1, index + 1, label));
  findSheet(sheets, 'Big Board').setCell(1, 1, 'Rank');
  const nflInfo = spreadsheet.insertSheet('_nfl_info');
  nflInfo.setCell(2, 2, 'Arizona Cardinals');
  const analytics = findSheet(sheets, 'Analytics');
  const done = [];
  const skipped = [];
  context.repairAnalyticsSources_(spreadsheet, done, skipped);
  assert.equal(done.length, 1, 'analytics must rebuild against a recognized tracker');
  const average = String(analytics.cellAt(9, 2));
  assert.ok(average.includes("'Players-Draft Tracker'!$D$2:$D$258"), `B9 must average Value vs Rank in D, got: ${average}`);
  assert.ok(!average.includes('!I2:I'), 'B9 must not average the Act Team text column');
  const roundValue = String(analytics.cellAt(5, 20));
  assert.ok(roundValue.includes("'Players-Draft Tracker'!$D$2:$D$258"), `T5 must average Value vs Rank in D, got: ${roundValue}`);
  assert.ok(roundValue.includes("'Players-Draft Tracker'!$K$2:$K$258"), 'T5 must key on Act Round in K');
});

test('analytics repair refuses an unresolvable tracker instead of emitting wrong references', () => {
  const {context, sheets, tracker, spreadsheet} = buildContext();
  tracker.setCell(1, 1, 'Player');
  tracker.setCell(1, 2, 'Mystery Column');
  findSheet(sheets, 'Big Board').setCell(1, 1, 'Rank');
  spreadsheet.insertSheet('_nfl_info').setCell(2, 2, 'Arizona Cardinals');
  const analytics = findSheet(sheets, 'Analytics');
  const done = [];
  const skipped = [];
  context.repairAnalyticsSources_(spreadsheet, done, skipped);
  assert.equal(done.length, 0);
  assert.deepEqual(skipped, ['analytics rewrite needs a recognized tracker layout']);
  assert.equal(analytics.cellAt(9, 2), '', 'nothing may be written when the layout is unknown');
});

test('mock lab order INDEXes the resolved projection columns', () => {
  const {context, sheets, tracker, spreadsheet} = buildContext();
  LIVE_TRACKER_HEADER.forEach((label, index) => tracker.setCell(1, index + 1, label));
  const mockLab = findSheet(sheets, 'Mock Lab');
  mockLab.setCell(6, 1, 'Overall');
  const done = [];
  const skipped = [];
  context.repairMockLabOrder_(spreadsheet, done, skipped);
  assert.equal(done.length, 1, 'Mock Lab must rebuild against a recognized tracker');
  const team = String(mockLab.cellAt(7, 2));
  const round = String(mockLab.cellAt(7, 3));
  const pick = String(mockLab.cellAt(7, 4));
  assert.ok(team.includes("'Players-Draft Tracker'!$H$2:$H$258"), `NFL Team must read Proj Team in H, got: ${team}`);
  assert.ok(!team.includes('$B$2:$B$258'), 'NFL Team must not read the Proj Pick number column');
  assert.ok(round.includes("'Players-Draft Tracker'!$J$2:$J$258"), `Round must read Proj Round in J, got: ${round}`);
  assert.ok(pick.includes("'Players-Draft Tracker'!$B$2:$B$258"), `Pick must read Proj Pick in B, got: ${pick}`);
  assert.ok(!pick.includes('$E$2:$E$258'), 'Pick must not read the Board Rank column');
});

test('mock lab repair refuses an unresolvable tracker instead of emitting wrong references', () => {
  const {context, sheets, tracker, spreadsheet} = buildContext();
  tracker.setCell(1, 1, 'Player');
  tracker.setCell(1, 2, 'Mystery Column');
  const mockLab = findSheet(sheets, 'Mock Lab');
  mockLab.setCell(6, 1, 'Overall');
  const done = [];
  const skipped = [];
  context.repairMockLabOrder_(spreadsheet, done, skipped);
  assert.equal(done.length, 0);
  assert.deepEqual(skipped, ['Mock Lab rebuild needs a recognized tracker layout']);
  assert.equal(mockLab.cellAt(7, 2), '', 'nothing may be written when the layout is unknown');
});

test('applyWorkbookTheme formats the resolved grade and value columns', () => {
  const {context, tracker, sheets, spreadsheet} = buildContext();
  LIVE_TRACKER_HEADER.forEach((label, index) => tracker.setCell(1, index + 1, label));
  const formatted = [];
  const realGetRange = tracker.getRange.bind(tracker);
  tracker.getRange = (...args) => {
    const range = realGetRange(...args);
    const realSetNumberFormat = range.setNumberFormat.bind(range);
    range.setNumberFormat = format => {
      formatted.push(`${range.getA1Notation()}:${format}`);
      return realSetNumberFormat(format);
    };
    return range;
  };
  findSheet(sheets, 'Big Board').setCell(1, 1, 'Rank');
  context.applyWorkbookTheme();
  assert.ok(formatted.some(entry => entry.startsWith('G2:') && entry.endsWith('0.00')), `NFL Grade in G must get 0.00, got: ${formatted}`);
  assert.ok(formatted.some(entry => entry.startsWith('D2:') && entry.endsWith(':0')), `Value vs Rank in D must get 0, got: ${formatted}`);
  assert.ok(!formatted.some(entry => entry.startsWith('I2:')), 'the Act Team text column must not get a number format');
});
