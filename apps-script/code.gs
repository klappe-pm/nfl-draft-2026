const DRAFT_LIVE_CONFIG = Object.freeze({
  sourceUrl: 'https://www.nfl.com/draft/tracker/2026/prospects',
  trackerSheetId: 1002,
  trackerSheetLabel: 'Players-Draft Tracker',
  analysisSheetId: 202865105,
  analysisSheetLabel: 'Analysis-Saved',
  statusSheetId: 1017,
  statusSheetLabel: '_updates',
  logSheetId: 1018,
  logSheetLabel: 'Update Log',
  teamCompareSheetId: 1860980541,
  teamCompareSheetLabel: 'Team-Compare',
  teamReportSheetId: 1006,
  teamReportSheetLabel: 'Team-Report',
  playerCompareSheetId: 1012,
  playerCompareSheetLabel: 'Players-Compare',
  collegeHistorySheetId: 2009412915,
  collegeHistorySheetLabel: 'Players-College Cohorts',
  dashboardSheetId: 1001,
  dashboardSheetLabel: 'Dashboard',
  analyticsSheetId: 1011,
  analyticsSheetLabel: 'Analytics',
  configSheetId: 1019,
  configSheetLabel: '_config',
  draftRulesSheetId: 148377302,
  draftRulesSheetLabel: 'Draft Rules',
  actualsSheetName: '_actuals',
  firstDataRow: 2,
  totalPicks: 257,
  liveColumns: 5,
  triggerHandler: 'scheduledDraftRefresh',
  snapshotHashKey: 'nflDraft2026SnapshotHash',
});

const NAMED_SHEETS = Object.freeze({
  startHere: ['Start Here'],
  bigBoard: ['Big Board'],
  playerBios: ['Player-Bios', 'Player Bios', 'Player Profiles'],
  boardByPosition: ['Board-By Position', 'Positional Board'],
  draftActual: ['Draft-Actual', 'Actual Team Drafts'],
  teamNeeds: ['Team-Needs', 'Team Needs'],
  mockLab: ['Mock Lab'],
  tradeCalculator: ['Trade Calculator'],
  draftHistory: ['Draft History'],
  sourceCenter: ['Source Center'],
  nflInfo: ['_nfl_info'],
  commissionerDashboard: ['Commissioner Dashboard'],
  mobileView: ['Mobile'],
  seasonForecast: ['Season Forecast'],
  recommendations: ['Recommendations'],
  draftOptimizer: ['Draft Optimizer'],
  reportBuilder: ['Report Builder'],
});

const SEASON_FOCUS = Object.freeze({
  triggerHandler: 'seasonFocusCheck',
  completedAtKey: 'nflDraft2026CompletedAt',
  modeKey: 'nflDraft2026MobileMode',
  doneKey: 'nflDraft2026SeasonFocusDone',
  delayMs: 7 * 24 * 60 * 60 * 1000,
});

const POSITION_GROUPS = Object.freeze(['All', 'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'SPEC']);

// Tracker header labels, in the owner's 2026-08-28 order. Proj Pick and Act Pick are
// within-round pick numbers; overall pick lives in _actuals column C. These positions are
// only a documented default: the owner has reordered this tab twice, so every consumer
// resolves the live positions through resolveTrackerColumns_ and refuses to write when the
// header does not match. Never hardcode a tracker column letter against this constant.
const TRACKER_COLUMNS = Object.freeze({
  player: 1,
  projPick: 2,
  actPick: 3,
  valueVsRank: 4,
  boardRank: 5,
  pos: 6,
  nflGrade: 7,
  projTeam: 8,
  actTeam: 9,
  projRound: 10,
  actRound: 11,
});

const TRACKER_HEADER_LABELS = Object.freeze({
  player: 'Player',
  projPick: 'Proj Pick',
  actPick: 'Act Pick',
  valueVsRank: 'Value vs Rank',
  boardRank: 'Board Rank',
  pos: 'Pos',
  nflGrade: 'NFL Grade',
  projTeam: 'Proj Team',
  actTeam: 'Act Team',
  projRound: 'Proj Round',
  actRound: 'Act Round',
});

// Maps every tracker field to its live 1-based column by reading row 1. Returns null when a
// label is missing or duplicated, which is the signal for callers to skip rather than write
// formulas over whatever now occupies the position they assumed.
function resolveTrackerColumns_(tracker) {
  const width = Math.max(tracker.getLastColumn(), 1);
  const header = tracker.getRange(1, 1, 1, width).getDisplayValues()[0].map(value => String(value).trim());
  const resolved = {};
  const keys = Object.keys(TRACKER_HEADER_LABELS);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const label = TRACKER_HEADER_LABELS[key];
    const first = header.indexOf(label);
    if (first < 0 || header.indexOf(label, first + 1) >= 0) {
      return null;
    }
    resolved[key] = first + 1;
  }
  return resolved;
}

function trackerColumnLetters_(resolved) {
  const letters = {};
  Object.keys(resolved).forEach(key => {
    letters[key] = columnLetter_(resolved[key]);
  });
  return letters;
}

const BOARD_BY_POSITION_HEADER = Object.freeze([
  'Board Rank', 'Player', 'Pos', 'Group', 'College', 'NFL Grade',
  'Production', 'Athleticism', 'Drafted', 'Overall', 'Draft Team', 'Projection',
]);

const ANALYSIS_SNAPSHOT = Object.freeze({
  namePrefix: 'Saved - ',
  tabColor: '#999999',
  maxNameLength: 70,
  indexHeaderLabel: 'Analysis Name',
  snapshotColumn: 15,
  picksAtSaveColumn: 16,
  draftedNowColumn: 17,
  avgActualColumn: 18,
});

const NFL_DIVISIONS = Object.freeze({
  'Buffalo Bills': 'AFC East',
  'Miami Dolphins': 'AFC East',
  'New England Patriots': 'AFC East',
  'New York Jets': 'AFC East',
  'Baltimore Ravens': 'AFC North',
  'Cincinnati Bengals': 'AFC North',
  'Cleveland Browns': 'AFC North',
  'Pittsburgh Steelers': 'AFC North',
  'Houston Texans': 'AFC South',
  'Indianapolis Colts': 'AFC South',
  'Jacksonville Jaguars': 'AFC South',
  'Tennessee Titans': 'AFC South',
  'Denver Broncos': 'AFC West',
  'Kansas City Chiefs': 'AFC West',
  'Las Vegas Raiders': 'AFC West',
  'Los Angeles Chargers': 'AFC West',
  'Dallas Cowboys': 'NFC East',
  'New York Giants': 'NFC East',
  'Philadelphia Eagles': 'NFC East',
  'Washington Commanders': 'NFC East',
  'Chicago Bears': 'NFC North',
  'Detroit Lions': 'NFC North',
  'Green Bay Packers': 'NFC North',
  'Minnesota Vikings': 'NFC North',
  'Atlanta Falcons': 'NFC South',
  'Carolina Panthers': 'NFC South',
  'New Orleans Saints': 'NFC South',
  'Tampa Bay Buccaneers': 'NFC South',
  'Arizona Cardinals': 'NFC West',
  'Los Angeles Rams': 'NFC West',
  'San Francisco 49ers': 'NFC West',
  'Seattle Seahawks': 'NFC West',
});

// Jimmy Johnson trade value chart, picks 1-224. Picks 225-257 fade linearly below 2.
const JIMMY_JOHNSON_VALUES = Object.freeze([
  3000, 2600, 2200, 1800, 1700, 1600, 1500, 1400, 1350, 1300, 1250, 1200, 1150, 1100, 1050, 1000,
  950, 900, 875, 850, 800, 780, 760, 740, 720, 700, 680, 660, 640, 620, 600, 590,
  580, 560, 550, 540, 530, 520, 510, 500, 490, 480, 470, 460, 450, 440, 430, 420,
  410, 400, 390, 380, 370, 360, 350, 340, 330, 320, 310, 300, 292, 284, 276, 270,
  265, 260, 255, 250, 245, 240, 235, 230, 225, 220, 215, 210, 205, 200, 195, 190,
  185, 180, 175, 170, 165, 160, 155, 150, 145, 140, 136, 132, 128, 124, 120, 116,
  112, 108, 104, 100, 96, 92, 88, 86, 84, 82, 80, 78, 76, 74, 72, 70,
  68, 66, 64, 62, 60, 58, 56, 54, 52, 50, 49, 48, 47, 46, 45, 44,
  43, 42, 41, 40, 39.5, 39, 38.5, 38, 37.5, 37, 36.5, 36, 35.5, 35, 34.5, 34,
  33.5, 33, 32.6, 32.2, 31.8, 31.4, 31, 30.6, 30.2, 29.8, 29.4, 29, 28.6, 28.2, 27.8, 27.4,
  27, 26.6, 26.2, 25.8, 25.4, 25, 24.6, 24.2, 23.8, 23.4, 23, 22.6, 22.2, 21.8, 21.4, 21,
  20.6, 20.2, 19.8, 19.4, 19, 18.6, 18.2, 17.8, 17.4, 17, 16.6, 16.2, 15.8, 15.4, 15, 14.6,
  14.2, 13.8, 13.4, 13, 12.6, 12.2, 11.8, 11.4, 11, 10.6, 10.2, 9.8, 9.4, 9, 8.6, 8.2,
  7.8, 7.4, 7, 6.6, 6.2, 5.8, 5.4, 5, 4.6, 4.2, 3.8, 3.4, 3, 2.6, 2.3, 2,
]);

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Draft War Room')
    .addItem('Refresh now', 'refreshDraftNow')
    .addItem('Save current analysis', 'saveCurrentAnalysis')
    .addItem('Open report builder', 'openReportBuilder')
    .addItem('Generate report from builder', 'generateReportFromBuilder')
    .addItem('Run system checks', 'runSystemChecks')
    .addSeparator()
    .addItem('Repair known issues', 'repairKnownIssues')
    .addItem('Apply workbook theme', 'applyWorkbookTheme')
    .addItem('Rebuild dashboard charts', 'rebuildDashboardCharts')
    .addItem('Update Start Here guide', 'updateStartHereGuide')
    .addItem('Rebuild mobile view', 'rebuildMobileView')
    .addItem('Build season forecast', 'buildSeasonForecast')
    .addItem('Build recommendations', 'buildRecommendations')
    .addItem('Build draft optimizer', 'buildDraftOptimizer')
    .addItem('Link player names to bios', 'linkPlayerNamesToBios')
    .addSeparator()
    .addItem('Install one-minute updates', 'installDraftDayAutomation')
    .addItem('Remove scheduled updates', 'removeDraftDayAutomation')
    .addToUi();
}

function installDraftDayAutomation() {
  removeDraftDayAutomation();
  ScriptApp.newTrigger(DRAFT_LIVE_CONFIG.triggerHandler).timeBased().everyMinutes(1).create();
  refreshDraftSnapshot_({initiator: 'INSTALL', showToast: true});
}

function removeDraftDayAutomation() {
  removeTriggersByHandler_(DRAFT_LIVE_CONFIG.triggerHandler);
}

function removeTriggersByHandler_(handler) {
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === handler)
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
}

function refreshDraftNow() {
  refreshDraftSnapshot_({initiator: 'MANUAL', showToast: true});
}

function saveCurrentAnalysis() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const sourceSheet = SpreadsheetApp.getActiveSheet();
  if (isSnapshotRefusedSheet_(sourceSheet)) {
    ui.alert('Open the analysis view you want to save first. Control tabs and saved snapshots cannot be saved.');
    return;
  }
  const activeRange = SpreadsheetApp.getActiveRange();
  const analysisType = detectAnalysisType_(sourceSheet, activeRange ? activeRange.getRow() : 0);
  const nameResponse = ui.prompt(`Save Current Analysis (${analysisType})`, 'Name this analysis.', ui.ButtonSet.OK_CANCEL);
  if (nameResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  const analysisName = sanitizeAnalysisName_(nameResponse.getResponseText());
  if (!analysisName) {
    ui.alert('Analysis name is required.');
    return;
  }
  const notesResponse = ui.prompt('Save Current Analysis', 'Optional notes.', ui.ButtonSet.OK_CANCEL);
  if (notesResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const teamCompare = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.teamCompareSheetId, DRAFT_LIVE_CONFIG.teamCompareSheetLabel);
  const playerCompare = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.playerCompareSheetId, DRAFT_LIVE_CONFIG.playerCompareSheetLabel);
  const collegeHistory = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.collegeHistorySheetId, DRAFT_LIVE_CONFIG.collegeHistorySheetLabel);
  const analysisSheet = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.analysisSheetId, DRAFT_LIVE_CONFIG.analysisSheetLabel);
  const snapshot = createAnalysisSnapshot_(spreadsheet, sourceSheet, analysisName);
  const savedBy = Session.getActiveUser().getEmail() || '';
  const playerSelections = resolvePlayerCompareSelectorCells_(playerCompare)
    .map(cell => playerCompare.getRange(cell.row, cell.column).getValue());
  const teamSelectors = analysisType === 'Fantasy Team Comparison'
    ? ['B52', 'G52', 'L52'].map(a1 => teamCompare.getRange(a1).getValue())
    : teamCompareSelectorValues_(teamCompare);
  ensureAnalysisSnapshotHeader_(analysisSheet);
  analysisSheet.appendRow([
    analysisName,
    analysisType,
    teamSelectors[0],
    teamSelectors[1],
    teamSelectors[2],
    playerSelections[0],
    playerSelections[1],
    playerSelections[2],
    playerSelections[3],
    playerSelections[4],
    collegeHistory.getRange('I3').getValue(),
    notesResponse.getResponseText().trim(),
    savedBy,
    new Date(),
  ]);
  const indexRow = analysisSheet.getLastRow();
  analysisSheet.getRange(indexRow, 14).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  analysisSheet.getRange(indexRow, ANALYSIS_SNAPSHOT.snapshotColumn)
    .setFormula(`=HYPERLINK("#gid=${snapshot.getSheetId()}","Open snapshot")`);
  const playerColumn = actualsColumnRef_(spreadsheet, 'E');
  const overallColumn = actualsColumnRef_(spreadsheet, 'C');
  const selectorRange = `F${indexRow}:J${indexRow}`;
  analysisSheet.getRange(indexRow, ANALYSIS_SNAPSHOT.picksAtSaveColumn).setValue(getCurrentPickCount_(spreadsheet));
  analysisSheet.getRange(indexRow, ANALYSIS_SNAPSHOT.draftedNowColumn)
    .setFormula(`=IF(COUNTA(${selectorRange})=0,"",SUMPRODUCT(--ISNUMBER(MATCH(${selectorRange},${playerColumn},0))))`);
  analysisSheet.getRange(indexRow, ANALYSIS_SNAPSHOT.avgActualColumn)
    .setFormula(`=IFERROR(ROUND(AVERAGE(ARRAYFORMULA(IFERROR(VLOOKUP(${selectorRange},{${playerColumn},${overallColumn}},2,FALSE),""))),1),"")`);
  spreadsheet.toast(`Saved "${analysisName}" (${analysisType}) to ${snapshot.getName()} and logged in Analysis-Saved.`, 'Draft War Room', 8);
}

// Reads the three official NFL team selectors from wherever the Team-Compare blocks actually
// sit, padding to three so the Analysis-Saved row keeps its fixed column shape.
function teamCompareSelectorValues_(teamCompare) {
  const blocks = detectTeamCompareBlocks_(teamCompare);
  const values = blocks.slice(0, 3).map(block => teamCompare.getRange(block.labelRow, 2).getValue());
  while (values.length < 3) {
    values.push('');
  }
  return values;
}

function detectAnalysisType_(sheet, activeRow) {
  const sheetId = sheet.getSheetId();
  if (sheetId === DRAFT_LIVE_CONFIG.teamCompareSheetId) {
    return activeRow >= 46 ? 'Fantasy Team Comparison' : 'Team Comparison';
  }
  if (sheetId === DRAFT_LIVE_CONFIG.playerCompareSheetId) {
    return 'Player Comparison';
  }
  if (sheetId === DRAFT_LIVE_CONFIG.collegeHistorySheetId) {
    return 'College Review';
  }
  const name = sheet.getName().toLowerCase();
  if (NAMED_SHEETS.mockLab.some(candidate => candidate.toLowerCase() === name)) {
    return 'Mock Review';
  }
  return 'Custom';
}

function isSnapshotRefusedSheet_(sheet) {
  const refusedIds = [
    DRAFT_LIVE_CONFIG.analysisSheetId,
    DRAFT_LIVE_CONFIG.logSheetId,
    DRAFT_LIVE_CONFIG.statusSheetId,
    DRAFT_LIVE_CONFIG.configSheetId,
  ];
  if (refusedIds.includes(sheet.getSheetId())) {
    return true;
  }
  const name = sheet.getName();
  if (name.startsWith(ANALYSIS_SNAPSHOT.namePrefix) || name === DRAFT_LIVE_CONFIG.actualsSheetName) {
    return true;
  }
  return NAMED_SHEETS.startHere.concat(NAMED_SHEETS.mobileView, NAMED_SHEETS.reportBuilder).some(candidate => candidate.toLowerCase() === name.toLowerCase());
}

function sanitizeAnalysisName_(rawName) {
  return String(rawName || '')
    .replace(/[\[\]*\/\\?:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, ANALYSIS_SNAPSHOT.maxNameLength)
    .trim();
}

function createAnalysisSnapshot_(spreadsheet, sourceSheet, analysisName) {
  const baseName = ANALYSIS_SNAPSHOT.namePrefix + analysisName;
  let snapshotName = baseName;
  let suffix = 2;
  while (spreadsheet.getSheets().some(sheet => sheet.getName() === snapshotName)) {
    snapshotName = `${baseName} (${suffix})`;
    suffix += 1;
  }
  const snapshot = sourceSheet.copyTo(spreadsheet).setName(snapshotName);
  const dataRange = snapshot.getDataRange();
  dataRange.copyTo(dataRange, SpreadsheetApp.CopyPasteType.PASTE_VALUES, false);
  snapshot.getCharts().forEach(chart => snapshot.removeChart(chart));
  snapshot.setTabColor(ANALYSIS_SNAPSHOT.tabColor);
  return snapshot;
}

function ensureAnalysisSnapshotHeader_(analysisSheet) {
  const headerRow = findRowByFirstCell_(analysisSheet, ANALYSIS_SNAPSHOT.indexHeaderLabel, 14);
  if (headerRow === 0) {
    return;
  }
  const headers = [
    [ANALYSIS_SNAPSHOT.snapshotColumn, 'Snapshot'],
    [ANALYSIS_SNAPSHOT.picksAtSaveColumn, 'Picks At Save'],
    [ANALYSIS_SNAPSHOT.draftedNowColumn, 'Players Drafted Now'],
    [ANALYSIS_SNAPSHOT.avgActualColumn, 'Avg Actual Overall Now'],
  ];
  headers.forEach(([column, label]) => {
    if (analysisSheet.getRange(headerRow, column).getDisplayValue() === '') {
      analysisSheet.getRange(headerRow, column).setValue(label);
    }
  });
}

function runSystemChecks() {
  const started = Date.now();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const tracker = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.trackerSheetId, DRAFT_LIVE_CONFIG.trackerSheetLabel);
  const dashboard = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.dashboardSheetId, DRAFT_LIVE_CONFIG.dashboardSheetLabel);
  const analytics = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.analyticsSheetId, DRAFT_LIVE_CONFIG.analyticsSheetLabel);
  const config = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.configSheetId, DRAFT_LIVE_CONFIG.configSheetLabel);
  const draftRules = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.draftRulesSheetId, DRAFT_LIVE_CONFIG.draftRulesSheetLabel);
  const teamCompare = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.teamCompareSheetId, DRAFT_LIVE_CONFIG.teamCompareSheetLabel);
  const teamReport = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.teamReportSheetId, DRAFT_LIVE_CONFIG.teamReportSheetLabel);
  const trackedRows = getActualRows_(spreadsheet);
  const fantasyTeams = config.getRange('F2:G13').getDisplayValues();
  const fantasyInputs = ['T2:T23', 'T26:T34', 'T37:T76', 'T79:T85']
    .flatMap(a1 => config.getRange(a1).getDisplayValues().flat());
  const checks = [];
  try {
    validateDraftRows_(trackedRows);
    checks.push(['official snapshot', trackedRows.length === DRAFT_LIVE_CONFIG.totalPicks]);
  } catch (error) {
    checks.push(['official snapshot', false]);
  }
  const trackerColumns = resolveTrackerColumns_(tracker);
  checks.push(['tracker layout', trackerColumns !== null]);
  checks.push(['tracker act columns', trackerColumns !== null
    && tracker.getRange(DRAFT_LIVE_CONFIG.firstDataRow, trackerColumns.actPick).getFormula().includes(DRAFT_LIVE_CONFIG.actualsSheetName)]);
  checks.push(['dashboard formulas', !hasFormulaErrors_(dashboard, ['B3', 'D3', 'F3', 'B4', 'D4', 'F4', 'F8', 'D9', 'F12', 'B13', 'D13'])]);
  checks.push(['analytics formulas', !hasFormulaErrors_(analytics, ['B5', 'B6', 'B7', 'B8', 'B9', 'O5', 'O6', 'O7', 'O8', 'O9', 'O10', 'Q5', 'S5'])]);
  checks.push(['official team compare source', !hasFormulaErrors_(teamCompare, ['A6', 'K6', 'U6'])]);
  checks.push(['fantasy league teams', fantasyTeams.length === 12 && fantasyTeams.every(([team, manager]) => team !== '' && manager !== '')]);
  checks.push(['fantasy league rules', fantasyInputs.every(value => value !== '') && draftRules.getRange('B31').getDisplayValue() === 'PASS']);
  checks.push(['fantasy team report', !hasFormulaErrors_(teamReport, ['L5', 'L6', 'L7', 'L9', 'L10'])]);
  checks.push(['fantasy team compare', !hasFormulaErrors_(teamCompare, ['B54', 'B55', 'B56', 'G54', 'G55', 'G56', 'L54', 'L55', 'L56'])]);
  const playerCompareSheet = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.playerCompareSheetId, DRAFT_LIVE_CONFIG.playerCompareSheetLabel);
  const playerCompareHeaderRow = findRowByFirstCell_(playerCompareSheet, 'Metric', 14);
  const playerCompareSelectors = resolvePlayerCompareSelectorCells_(playerCompareSheet);
  const playerCompareHeaderCells = ['B', 'C', 'D', 'E', 'F'].map(letter => `${letter}${Math.max(playerCompareHeaderRow, 1)}`);
  checks.push(['player compare source', playerCompareHeaderRow > 0
    && playerCompareSelectors.some(cell => playerCompareSheet.getRange(cell.row, cell.column).getDisplayValue() !== '')
    && !hasFormulaErrors_(playerCompareSheet, playerCompareHeaderCells)]);
  checks.push(['college cohort source', !hasFormulaErrors_(requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.collegeHistorySheetId, DRAFT_LIVE_CONFIG.collegeHistorySheetLabel), ['I5', 'I6', 'H9'])]);

  const boardByPosition = findSheetByNames_(spreadsheet, NAMED_SHEETS.boardByPosition);
  checks.push(['positional board projection', boardByPosition !== null && boardByPositionState_(boardByPosition) === 'ok']);
  const tradeCalculator = findSheetByNames_(spreadsheet, NAMED_SHEETS.tradeCalculator);
  checks.push(['trade value curve', tradeCalculator !== null && tradeCurvePopulated_(tradeCalculator)]);
  const startHere = findSheetByNames_(spreadsheet, NAMED_SHEETS.startHere);
  checks.push(['start here status', startHere !== null && startHereStatusHealthy_(startHere)]);
  const triggerInstalled = ScriptApp.getProjectTriggers().some(trigger => trigger.getHandlerFunction() === DRAFT_LIVE_CONFIG.triggerHandler);
  checks.push(['automation ready', triggerInstalled || trackedRows.length >= DRAFT_LIVE_CONFIG.totalPicks]);
  const errorCells = scanWorkbookForErrors_(spreadsheet);
  checks.push(['workbook error scan', errorCells.length === 0]);

  const failures = checks.filter(([, passed]) => !passed).map(([name]) => name);
  const status = failures.length === 0 ? 'PASS' : 'CHECK';
  let message = failures.length === 0 ? 'SYSTEM CHECK: all propagation paths passed.' : `SYSTEM CHECK: review ${failures.join(', ')}.`;
  if (errorCells.length > 0) {
    message += ` Formula errors at ${errorCells.slice(0, 10).join(', ')}${errorCells.length > 10 ? ` and ${errorCells.length - 10} more` : ''}.`;
  }
  appendUpdateLog_(new Date(), status, trackedRows.length, 0, Date.now() - started, message, DRAFT_LIVE_CONFIG.sourceUrl, getCurrentSnapshotHash_(spreadsheet));
  spreadsheet.toast(message, 'Draft War Room', 8);
}

function repairKnownIssues() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const done = [];
  const skipped = [];
  const repairs = [
    ['start here status', repairStartHereStatus_],
    ['tracker act columns', repairTrackerActualColumns_],
    ['updates counters', repairUpdatesCounters_],
    ['analytics sources', repairAnalyticsSources_],
    ['team view sources', repairTeamViewSources_],
    ['mock lab order', repairMockLabOrder_],
    ['board by position', repairBoardByPositionProjection_],
    ['team report header', repairTeamReportHeader_],
    ['commissioner dashboard', repairCommissionerDashboardStray_],
    ['player compare', repairPlayerCompareSelectors_],
    ['player compare delta', repairPlayerCompareDeltaRow_],
    ['player compare bio links', repairPlayerCompareHeaderLinks_],
    ['draft actual selector', repairDraftActualSelector_],
    ['trade value curve', repairTradeValueCurve_],
    ['nfl info divisions', repairNflInfoDivisionColumn_],
    ['college cohort blocks', repairCollegeCohortDuplicates_],
  ];
  repairs.forEach(([label, repair]) => {
    try {
      repair(spreadsheet, done, skipped);
    } catch (error) {
      skipped.push(`${label} failed: ${error.message}`);
    }
  });
  // A run where every repair threw must never log PASS: status reflects failures first, so the
  // Update Log distinguishes "already clean" from "nothing worked".
  const failures = skipped.filter(entry => entry.includes('failed'));
  const message = done.length === 0
    ? `REPAIR: nothing to fix, all known issues already resolved.${failures.length ? ` Review: ${failures.join('; ')}.` : ''}`
    : `REPAIR: ${done.join('; ')}.${skipped.length ? ` Skipped: ${skipped.join('; ')}.` : ''}`;
  const status = failures.length > 0 ? 'CHECK' : (done.length === 0 ? 'PASS' : 'REPAIRED');
  appendUpdateLog_(new Date(), status, getCurrentPickCount_(spreadsheet), 0, 0, message, 'workbook-repair', getCurrentSnapshotHash_(spreadsheet));
  SpreadsheetApp.flush();
  spreadsheet.toast(message, 'Draft War Room', 10);
}

function repairStartHereStatus_(spreadsheet, done, skipped) {
  const sheet = findSheetByNames_(spreadsheet, NAMED_SHEETS.startHere);
  if (!sheet) {
    skipped.push('Start Here sheet not found');
    return;
  }
  const labels = sheet.getRange('A1:A20').getDisplayValues().flat();
  const row = labels.findIndex(label => label === 'Workbook status') + 1;
  if (row === 0) {
    skipped.push('Workbook status row not found on Start Here');
    return;
  }
  if (sheet.getRange(row, 2).getFormula().includes(DRAFT_LIVE_CONFIG.actualsSheetName)) {
    skipped.push('Start Here status already derives from actuals');
    return;
  }
  sheet.getRange(row, 2).setFormula(startHereStatusFormula_(spreadsheet));
  done.push('Start Here workbook status now derives from the official actuals count');
}

function startHereStatusFormula_(spreadsheet) {
  const playerColumn = actualsColumnRef_(spreadsheet, 'E');
  return `=IF(COUNTA(${playerColumn})>=${DRAFT_LIVE_CONFIG.totalPicks},"COMPLETE",COUNTA(${playerColumn})&" of ${DRAFT_LIVE_CONFIG.totalPicks} picks loaded")`;
}

// Column ref into the _actuals staging sheet (Round, Pick, Overall, Team, Player in A:E).
// Ensures the sheet exists so a formula built from this ref never dangles.
function actualsColumnRef_(spreadsheet, letter) {
  ensureActualsSheet_(spreadsheet);
  const lastDataRow = DRAFT_LIVE_CONFIG.firstDataRow + DRAFT_LIVE_CONFIG.totalPicks - 1;
  return `${quoteSheetName_(DRAFT_LIVE_CONFIG.actualsSheetName)}!${letter}${DRAFT_LIVE_CONFIG.firstDataRow}:${letter}${lastDataRow}`;
}

function repairBoardByPositionProjection_(spreadsheet, done, skipped) {
  const sheet = findSheetByNames_(spreadsheet, NAMED_SHEETS.boardByPosition);
  if (!sheet) {
    skipped.push('Board-By Position sheet not found');
    return;
  }
  const state = boardByPositionState_(sheet);
  if (state === 'ok') {
    skipped.push('Board-By Position projection already clean');
    return;
  }
  if (state === 'unrecognized') {
    skipped.push('Board-By Position layout not recognized, left untouched');
    return;
  }
  const bigBoard = findSheetByNames_(spreadsheet, NAMED_SHEETS.bigBoard);
  if (!bigBoard) {
    skipped.push('Big Board sheet not found, cannot rebuild Board-By Position');
    return;
  }
  const headerRow = findRowByFirstCell_(sheet, 'Board Rank', 12);
  const header = sheet.getRange(headerRow, 1, 1, BOARD_BY_POSITION_HEADER.length).getDisplayValues()[0];
  if (BOARD_BY_POSITION_HEADER.some((label, index) => header[index] !== label)) {
    skipped.push('Board-By Position header order differs from the documented contract, left untouched');
    return;
  }
  const selectorRow = findRowByFirstCell_(sheet, 'Position:', Math.max(headerRow - 1, 1));
  if (selectorRow === 0) {
    skipped.push('Board-By Position selector row not found');
    return;
  }
  const selectorCell = sheet.getRange(selectorRow, 2);
  if (!selectorCell.getDataValidation()) {
    selectorCell.setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(POSITION_GROUPS, true).setAllowInvalid(false).build()
    );
  }
  if (!POSITION_GROUPS.includes(selectorCell.getDisplayValue())) {
    selectorCell.setValue('All');
  }
  const dataRow = headerRow + 1;
  ensureRows_(sheet, dataRow + 423);
  const board = quoteSheetName_(bigBoard.getName());
  const selectorA1 = '$' + selectorCell.getA1Notation().replace(/(\d+)$/, '$$$1');
  const boardCol = letter => `${board}!${letter}2:${letter}424`;
  const columns = ['A', 'B', 'D', 'E', 'F', 'C', 'I', 'J', 'M', 'N', 'O', 'L'].map(boardCol).join(',');
  sheet.getRange(dataRow, 1, 424, BOARD_BY_POSITION_HEADER.length).clearContent();
  sheet.getRange(dataRow, 1).setFormula(
    `=IFERROR(SORT(FILTER({${columns}},${boardCol('A')}<>"",IF(${selectorA1}="All",${boardCol('A')}<>"",${boardCol('E')}=${selectorA1})),1,TRUE),"No prospects match this position group.")`
  );
  done.push('Board-By Position rebuilt with the Big Board projection column instead of source URLs');
}

// The live Players-College Cohorts carries two stray duplicate cohort blocks below the
// contract block (extra "College Selector" labels in column H). Their rosters render another
// school's players under their own headings, and by occupying H21 down they also cap the
// contract roster at 12 rows, which is fewer than the largest cohort on the board.
function repairCollegeCohortDuplicates_(spreadsheet, done, skipped) {
  const sheet = findSheetByNames_(spreadsheet, [DRAFT_LIVE_CONFIG.collegeHistorySheetLabel])
    || findSheetById_(spreadsheet, DRAFT_LIVE_CONFIG.collegeHistorySheetId);
  if (!sheet) {
    skipped.push('Players-College Cohorts sheet not found');
    return;
  }
  const scanRows = Math.min(sheet.getMaxRows ? sheet.getMaxRows() : 200, 200);
  const columnH = sheet.getRange(1, 8, scanRows, 1).getDisplayValues().flat();
  const selectorRows = [];
  columnH.forEach((value, index) => {
    if (String(value).trim() === 'College Selector') {
      selectorRows.push(index + 1);
    }
  });
  if (selectorRows.length <= 1) {
    skipped.push('Players-College Cohorts has a single cohort block already');
    return;
  }
  const firstDuplicate = selectorRows[1];
  const clearRows = scanRows - firstDuplicate + 1;
  sheet.getRange(firstDuplicate, 8, clearRows, 7).clearContent();
  done.push(`Players-College Cohorts: cleared ${selectorRows.length - 1} duplicate cohort block${selectorRows.length === 2 ? '' : 's'} from row ${firstDuplicate} down, freeing the roster to expand`);
}

function repairTeamReportHeader_(spreadsheet, done, skipped) {
  const sheet = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.teamReportSheetId, DRAFT_LIVE_CONFIG.teamReportSheetLabel);
  const a4 = sheet.getRange('A4').getDisplayValue();
  const a7 = sheet.getRange('A7').getDisplayValue();
  if (a4 === 'Round' && a7 === 'Round') {
    sheet.getRange('A4:I4').clearContent();
    done.push('Team Report duplicate header row cleared');
  } else {
    skipped.push('Team Report header already clean');
  }
}

function repairCommissionerDashboardStray_(spreadsheet, done, skipped) {
  const sheet = findSheetByNames_(spreadsheet, NAMED_SHEETS.commissionerDashboard);
  if (!sheet) {
    skipped.push('Commissioner Dashboard sheet not found');
    return;
  }
  // Anchored on the readiness label rather than a fixed row window: the live orphaned counter
  // sits above the old hardcoded rows 8-14, so that window found nothing and reported clean.
  const readinessRow = findRowByFirstCell_(sheet, 'Rule Readiness', 20);
  if (readinessRow === 0) {
    skipped.push('Commissioner Dashboard readiness row not found, left untouched');
    return;
  }
  const gridRows = sheet.getMaxRows ? sheet.getMaxRows() : readinessRow + 10;
  const gridColumns = sheet.getMaxColumns ? sheet.getMaxColumns() : 8;
  const firstRow = readinessRow;
  const rowCount = Math.max(1, Math.min(10, gridRows - firstRow + 1));
  const columnCount = Math.min(8, gridColumns);
  const values = sheet.getRange(firstRow, 1, rowCount, columnCount).getDisplayValues();
  const ratioPattern = /^\d+\/\d+$/;
  const toClear = [];
  values.forEach((rowValues, rowIndex) => {
    const ratioColumns = [];
    let hasOtherContent = false;
    rowValues.forEach((value, columnIndex) => {
      if (ratioPattern.test(value)) {
        ratioColumns.push(columnIndex + 1);
      } else if (value !== '') {
        hasOtherContent = true;
      }
    });
    if (ratioColumns.length === 0 || hasOtherContent) {
      return;
    }
    const rowRange = sheet.getRange(firstRow + rowIndex, 1, 1, columnCount);
    const merged = rowRange.getMergedRanges ? rowRange.getMergedRanges() : [];
    if (merged.length > 0) {
      return;
    }
    ratioColumns.forEach(column => toClear.push([firstRow + rowIndex, column]));
  });
  toClear.forEach(([row, column]) => sheet.getRange(row, column).clearContent());
  if (toClear.length > 0) {
    done.push(`Commissioner Dashboard: cleared ${toClear.length} orphaned counter cell${toClear.length === 1 ? '' : 's'}`);
  } else {
    skipped.push('Commissioner Dashboard already clean');
  }
}

const STRAY_COMPARE_HEADER = Object.freeze(['Actual Overall', 'Actual Vs Projected', 'Draft Team']);

function repairPlayerCompareSelectors_(spreadsheet, done, skipped) {
  const sheet = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.playerCompareSheetId, DRAFT_LIVE_CONFIG.playerCompareSheetLabel);
  // Scanned rather than pinned to K7:M7: the live fragment sits at K9:M9, so the fixed address
  // never matched. Only clears a triple with nothing beneath it, so a real K:M section survives.
  const scanRows = Math.min(30, sheet.getMaxRows ? sheet.getMaxRows() : 30);
  const strayGrid = sheet.getRange(1, 11, scanRows, 3).getDisplayValues();
  const strayIndex = strayGrid.findIndex((rowValues, index) =>
    STRAY_COMPARE_HEADER.every((label, column) => String(rowValues[column]).trim() === label)
    && (index + 1 >= strayGrid.length || strayGrid[index + 1].every(value => value === '')));
  if (strayIndex >= 0) {
    const strayRow = strayIndex + 1;
    sheet.getRange(strayRow, 11, 1, 3).clearContent();
    done.push(`Players-Compare orphaned header fragment cleared from K${strayRow}:M${strayRow}`);
  } else {
    skipped.push('Players-Compare has no orphaned header fragment in K:M');
  }
  const selectorCells = resolvePlayerCompareSelectorCells_(sheet);
  const selectorValues = selectorCells.map(cell => sheet.getRange(cell.row, cell.column).getDisplayValue());
  if (selectorValues.every(value => value === '')) {
    const bigBoard = findSheetByNames_(spreadsheet, NAMED_SHEETS.bigBoard);
    if (!bigBoard) {
      skipped.push('Big Board sheet not found, Players-Compare selectors left empty');
      return;
    }
    const topFive = bigBoard.getRange('B2:B6').getDisplayValues().flat();
    selectorCells.forEach((cell, index) => sheet.getRange(cell.row, cell.column).setValue(topFive[index] || ''));
    done.push('Players-Compare selectors defaulted to the top five Big Board prospects');
  } else {
    skipped.push('Players-Compare selectors already populated');
  }
}

// Live Players-Compare uses vertical selectors labeled Player 1 through Player 5 in column A
// with the editable cell beside each label. The original horizontal B2..J2 row remains the
// fallback so a restored legacy layout keeps working.
function resolvePlayerCompareSelectorCells_(sheet) {
  const scanRows = Math.min(12, sheet.getMaxRows ? sheet.getMaxRows() : 12);
  const labels = sheet.getRange(1, 1, scanRows, 1).getDisplayValues().flat();
  const cells = [];
  for (let index = 1; index <= 5; index += 1) {
    const row = labels.findIndex(label => String(label).trim() === `Player ${index}`) + 1;
    if (row === 0) {
      return [
        {row: 2, column: 2},
        {row: 2, column: 4},
        {row: 2, column: 6},
        {row: 2, column: 8},
        {row: 2, column: 10},
      ];
    }
    cells.push({row, column: 2});
  }
  return cells;
}

// Maps requested Big Board header labels (each entry is an alias list, first alias wins as the
// result key) to live 1-based columns. Returns null when any label is missing or duplicated.
function resolveBigBoardColumns_(bigBoard, labelGroups) {
  const width = Math.max(bigBoard.getLastColumn(), 1);
  const header = bigBoard.getRange(1, 1, 1, width).getDisplayValues()[0].map(value => String(value).trim());
  const resolved = {};
  for (let index = 0; index < labelGroups.length; index += 1) {
    const aliases = labelGroups[index];
    let column = 0;
    aliases.some(alias => {
      const first = header.indexOf(alias);
      if (first >= 0 && header.indexOf(alias, first + 1) < 0) {
        column = first + 1;
        return true;
      }
      return false;
    });
    if (column === 0) {
      return null;
    }
    resolved[aliases[0]] = column;
  }
  return resolved;
}

function repairPlayerCompareDeltaRow_(spreadsheet, done, skipped) {
  const sheet = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.playerCompareSheetId, DRAFT_LIVE_CONFIG.playerCompareSheetLabel);
  const headerRow = findRowByFirstCell_(sheet, 'Metric', 14);
  if (headerRow === 0) {
    skipped.push('Players-Compare metric grid not found');
    return;
  }
  const scanRows = Math.min(headerRow + 20, sheet.getMaxRows ? sheet.getMaxRows() : headerRow + 20);
  const labels = sheet.getRange(1, 1, scanRows, 1).getDisplayValues().flat();
  const deltaRow = labels.findIndex(label => String(label).trim() === 'Actual Vs Projected') + 1;
  if (deltaRow <= headerRow) {
    skipped.push('Players-Compare Actual Vs Projected row not found');
    return;
  }
  if (sheet.getRange(deltaRow, 2).getFormula() !== '') {
    skipped.push('Players-Compare Actual Vs Projected already formula-driven');
    return;
  }
  const bigBoard = findSheetByNames_(spreadsheet, NAMED_SHEETS.bigBoard);
  const columns = bigBoard
    ? resolveBigBoardColumns_(bigBoard, [['Player'], ['Delta Act-Projected', 'Actual Vs Projected']])
    : null;
  if (!columns) {
    skipped.push('Big Board player and delta columns not resolvable, Actual Vs Projected left blank');
    return;
  }
  if (sheet.getRange(headerRow + 1, 2).getFormula() !== '') {
    // Spill-style grid: each player column is one MAP/XLOOKUP anchored on the first metric row
    // that matches the labels in column A against Big Board headers. Writing into the delta row
    // would break every column spill, so repair the label instead: the live Big Board header is
    // Delta Act-Projected, and relabeling the metric restores the lookup.
    const deltaHeader = bigBoard.getRange(1, columns['Delta Act-Projected']).getDisplayValue();
    if (deltaHeader === 'Actual Vs Projected') {
      skipped.push('Players-Compare metric grid is formula-driven and its label already matches Big Board');
      return;
    }
    sheet.getRange(deltaRow, 1).setValue(deltaHeader);
    done.push(`Players-Compare metric label renamed to ${deltaHeader} so the formula grid finds the Big Board column again`);
    return;
  }
  const board = quoteSheetName_(bigBoard.getName());
  const playerLetter = columnLetter_(columns.Player);
  const deltaLetter = columnLetter_(columns['Delta Act-Projected']);
  const formulas = [[]];
  for (let column = 2; column <= 6; column += 1) {
    const headerA1 = `${columnLetter_(column)}$${headerRow}`;
    formulas[0].push(`=IF(${headerA1}="","",IFERROR(VLOOKUP(${headerA1},{${board}!$${playerLetter}$2:$${playerLetter}$424,${board}!$${deltaLetter}$2:$${deltaLetter}$424},2,FALSE),""))`);
  }
  sheet.getRange(deltaRow, 2, 1, 5).setFormulas(formulas);
  done.push('Players-Compare Actual Vs Projected now pulls the Big Board delta for each compared player');
}

function repairPlayerCompareHeaderLinks_(spreadsheet, done, skipped) {
  const sheet = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.playerCompareSheetId, DRAFT_LIVE_CONFIG.playerCompareSheetLabel);
  const headerRow = findRowByFirstCell_(sheet, 'Metric', 14);
  if (headerRow === 0) {
    skipped.push('Players-Compare metric grid not found for bio links');
    return;
  }
  const bioParts = playerBioLinkParts_(spreadsheet);
  if (!bioParts) {
    skipped.push('Player-Bios sheet not found, compare headers left unlinked');
    return;
  }
  if (sheet.getRange(headerRow, 2).getFormula().includes('HYPERLINK')) {
    skipped.push('Players-Compare headers already link to bios');
    return;
  }
  const selectors = resolvePlayerCompareSelectorCells_(sheet);
  const formulas = [[]];
  selectors.forEach(cell => {
    const selectorA1 = `$${columnLetter_(cell.column)}$${cell.row}`;
    formulas[0].push(`=IF(${selectorA1}="","",IFERROR(HYPERLINK("#gid=${bioParts.gid}&range=A"&MATCH(${selectorA1},${bioParts.nameColumn},0),${selectorA1}),${selectorA1}))`);
  });
  sheet.getRange(headerRow, 2, 1, 5).setFormulas(formulas);
  done.push('Players-Compare grid headers now open each compared player bio when clicked');
}

function repairDraftActualSelector_(spreadsheet, done, skipped) {
  const sheet = findSheetByNames_(spreadsheet, NAMED_SHEETS.draftActual);
  if (!sheet) {
    skipped.push('Draft-Actual sheet not found');
    return;
  }
  const selectorRow = findRowByFirstCell_(sheet, 'NFL Team Selector', 8);
  if (selectorRow === 0) {
    skipped.push('Draft-Actual selector row not found');
    return;
  }
  const selectorCell = sheet.getRange(selectorRow, 2);
  if (selectorCell.getDisplayValue() !== '') {
    skipped.push('Draft-Actual selector already set');
    return;
  }
  const nflInfo = findSheetByNames_(spreadsheet, NAMED_SHEETS.nflInfo);
  const firstTeam = nflInfo ? nflInfo.getRange('B2').getDisplayValue() : '';
  if (firstTeam === '') {
    skipped.push('Draft-Actual selector left empty because _nfl_info has no teams');
    return;
  }
  selectorCell.setValue(firstTeam);
  done.push(`Draft-Actual selector defaulted to ${firstTeam}`);
}

function repairTradeValueCurve_(spreadsheet, done, skipped) {
  const sheet = findSheetByNames_(spreadsheet, NAMED_SHEETS.tradeCalculator);
  if (!sheet) {
    skipped.push('Trade Calculator sheet not found');
    return;
  }
  const headerRow = findRowByFirstCell_(sheet, 'Overall Pick', 16);
  if (headerRow === 0) {
    skipped.push('Trade Calculator pick table not found');
    return;
  }
  ensureRows_(sheet, headerRow + DRAFT_LIVE_CONFIG.totalPicks);
  const curveRange = sheet.getRange(headerRow + 1, 2, DRAFT_LIVE_CONFIG.totalPicks, 1);
  const existing = curveRange.getDisplayValues().flat();
  if (existing.some(value => value !== '')) {
    skipped.push('Trade Calculator custom points already present');
    return;
  }
  const values = buildDefaultPickValues_().map(value => [value]);
  curveRange.setValues(values).setNumberFormat('0.0');
  done.push('Trade Calculator filled with the Jimmy Johnson value curve for all 257 picks (editable)');
}

function repairNflInfoDivisionColumn_(spreadsheet, done, skipped) {
  const sheet = findSheetByNames_(spreadsheet, NAMED_SHEETS.nflInfo);
  if (!sheet) {
    skipped.push('_nfl_info sheet not found');
    return;
  }
  const f1 = sheet.getRange('F1').getDisplayValue();
  const g1 = sheet.getRange('G1').getDisplayValue();
  const gColumn = sheet.getRange('G2:G33').getDisplayValues().flat();
  if (f1 === 'Owner' && g1 === 'Owner' && gColumn.every(value => value === '')) {
    sheet.getRange('G1').setValue('Division');
    const teams = sheet.getRange('B2:B33').getDisplayValues().flat();
    sheet.getRange('G2:G33').setValues(teams.map(team => [NFL_DIVISIONS[team] || '']));
    done.push('_nfl_info duplicate Owner column repurposed as Division with all 32 divisions filled');
  } else {
    skipped.push('_nfl_info columns already clean');
  }
}

function repairTrackerActualColumns_(spreadsheet, done, skipped) {
  const tracker = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.trackerSheetId, DRAFT_LIVE_CONFIG.trackerSheetLabel);
  const resolved = resolveTrackerColumns_(tracker);
  if (!resolved) {
    skipped.push('tracker layout not recognized, act columns left untouched');
    return;
  }
  if (tracker.getRange(DRAFT_LIVE_CONFIG.firstDataRow, resolved.actPick).getFormula().includes(DRAFT_LIVE_CONFIG.actualsSheetName)) {
    skipped.push('tracker act columns already formula-driven');
    return;
  }
  ensureActualsSheet_(spreadsheet);
  ensureRows_(tracker, DRAFT_LIVE_CONFIG.firstDataRow + DRAFT_LIVE_CONFIG.totalPicks - 1);
  const letters = trackerColumnLetters_(resolved);
  const rows = DRAFT_LIVE_CONFIG.totalPicks;
  const columns = [
    [resolved.actPick, row => trackerActFormula_(row, 'B', letters)],
    [resolved.actTeam, row => trackerActFormula_(row, 'D', letters)],
    [resolved.actRound, row => trackerActFormula_(row, 'A', letters)],
    [resolved.valueVsRank, row => trackerValueFormula_(row, letters)],
  ];
  columns.forEach(([column, build]) => {
    const formulas = [];
    for (let index = 0; index < rows; index += 1) {
      formulas.push([build(DRAFT_LIVE_CONFIG.firstDataRow + index)]);
    }
    tracker.getRange(DRAFT_LIVE_CONFIG.firstDataRow, column, rows, 1).setFormulas(formulas);
  });
  tracker.getRange(DRAFT_LIVE_CONFIG.firstDataRow, resolved.nflGrade, rows, 1).setNumberFormat('0.00');
  [resolved.projPick, resolved.actPick, resolved.boardRank, resolved.valueVsRank]
    .forEach(column => tracker.getRange(DRAFT_LIVE_CONFIG.firstDataRow, column, rows, 1).setNumberFormat('0'));
  done.push('tracker Act Pick, Act Team, Act Round, and Value vs Rank now calculate from _actuals and stay blank until actuals exist');
}

function trackerActFormula_(row, actualsColumn, letters) {
  const actuals = quoteSheetName_(DRAFT_LIVE_CONFIG.actualsSheetName);
  const lastRow = DRAFT_LIVE_CONFIG.firstDataRow + DRAFT_LIVE_CONFIG.totalPicks - 1;
  const player = `$${letters.player}${row}`;
  return `=IF(${player}="","",IFNA(XLOOKUP(${player},${actuals}!$E$2:$E$${lastRow},${actuals}!$${actualsColumn}$2:$${actualsColumn}$${lastRow}),""))`;
}

function trackerValueFormula_(row, letters) {
  const actuals = quoteSheetName_(DRAFT_LIVE_CONFIG.actualsSheetName);
  const lastRow = DRAFT_LIVE_CONFIG.firstDataRow + DRAFT_LIVE_CONFIG.totalPicks - 1;
  const player = `$${letters.player}${row}`;
  const overall = `XLOOKUP(${player},${actuals}!$E$2:$E$${lastRow},${actuals}!$C$2:$C$${lastRow})`;
  return `=IF(OR(${player}="",$${letters.actPick}${row}=""),"",IFNA(${overall},"")-$${letters.boardRank}${row})`;
}

function repairUpdatesCounters_(spreadsheet, done, skipped) {
  const sheet = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.statusSheetId, DRAFT_LIVE_CONFIG.statusSheetLabel);
  const labels = sheet.getRange('A1:A20').getDisplayValues().flat();
  const lastRow = DRAFT_LIVE_CONFIG.firstDataRow + DRAFT_LIVE_CONFIG.totalPicks - 1;
  const actuals = quoteSheetName_(DRAFT_LIVE_CONFIG.actualsSheetName);
  const targets = [
    ['Picks loaded', `=COUNTA(${actuals}!E2:E${lastRow})`],
    ['Newest overall pick', `=IFERROR(MAX(${actuals}!C2:C${lastRow}),0)`],
  ];
  const pending = targets.filter(([label, formula]) => {
    const row = labels.findIndex(value => value === label) + 1;
    return row > 0 && sheet.getRange(row, 2).getFormula() !== formula;
  });
  if (pending.length === 0) {
    skipped.push('_updates counters already point at actuals');
    return;
  }
  ensureActualsSheet_(spreadsheet);
  pending.forEach(([label, formula]) => {
    const row = labels.findIndex(value => value === label) + 1;
    sheet.getRange(row, 2).setFormula(formula);
  });
  done.push(`_updates pick counters now derive from ${DRAFT_LIVE_CONFIG.actualsSheetName}`);
}

function repairAnalyticsSources_(spreadsheet, done, skipped) {
  const analytics = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.analyticsSheetId, DRAFT_LIVE_CONFIG.analyticsSheetLabel);
  if (analytics.getRange('B5').getFormula().includes(DRAFT_LIVE_CONFIG.actualsSheetName)) {
    skipped.push('analytics already sourced from actuals');
    return;
  }
  const bigBoard = findSheetByNames_(spreadsheet, NAMED_SHEETS.bigBoard);
  const nflInfo = findSheetByNames_(spreadsheet, NAMED_SHEETS.nflInfo);
  if (!bigBoard || !nflInfo) {
    skipped.push('analytics rewrite needs Big Board and _nfl_info');
    return;
  }
  const tracker = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.trackerSheetId, DRAFT_LIVE_CONFIG.trackerSheetLabel);
  const resolved = resolveTrackerColumns_(tracker);
  if (!resolved) {
    skipped.push('analytics rewrite needs a recognized tracker layout');
    return;
  }
  ensureActualsSheet_(spreadsheet);
  const letters = trackerColumnLetters_(resolved);
  const actuals = quoteSheetName_(DRAFT_LIVE_CONFIG.actualsSheetName);
  const lastRow = DRAFT_LIVE_CONFIG.firstDataRow + DRAFT_LIVE_CONFIG.totalPicks - 1;
  const board = quoteSheetName_(bigBoard.getName());
  const trackerRef = quoteSheetName_(tracker.getName());
  const players = `${actuals}!$E$2:$E$${lastRow}`;
  const anyActuals = `COUNTA(${players})`;
  const valueColumn = `${trackerRef}!$${letters.valueVsRank}$2:$${letters.valueVsRank}$${lastRow}`;
  const actRoundColumn = `${trackerRef}!$${letters.actRound}$2:$${letters.actRound}$${lastRow}`;

  analytics.getRange('B5').setFormula(`=COUNTA(${actuals}!E2:E${lastRow})`);
  analytics.getRange('B9').setFormula(`=IF(${anyActuals}=0,"",IFERROR(ROUND(AVERAGE(${valueColumn}),1),""))`);

  const rounds = [1, 2, 3, 4, 5, 6, 7];
  analytics.getRange('H5:I20').clearContent();
  analytics.getRange(5, 8, 7, 1).setValues(rounds.map(round => [round]));
  analytics.getRange(5, 9, 7, 1).setFormulas(rounds.map((round, index) =>
    [`=IF(${anyActuals}=0,"",COUNTIF(${actuals}!$A$2:$A$${lastRow},$H$${5 + index}))`]
  ));

  analytics.getRange('K5:L40').clearContent();
  analytics.getRange('K5').setFormula(`=SORT(${quoteSheetName_(nflInfo.getName())}!B2:B33)`);
  const teamFormulas = [];
  for (let index = 0; index < 32; index += 1) {
    teamFormulas.push([`=IF($K$${5 + index}="","",IF(${anyActuals}=0,"",COUNTIF(${actuals}!$D$2:$D$${lastRow},$K$${5 + index})))`]);
  }
  analytics.getRange(5, 12, 32, 1).setFormulas(teamFormulas);

  analytics.getRange('Q5:R24').clearContent();
  analytics.getRange('Q5').setFormula(`=SORT(UNIQUE(FILTER(${board}!D2:D424,${board}!D2:D424<>"")))`);
  const positionFormulas = [];
  for (let index = 0; index < 20; index += 1) {
    positionFormulas.push([`=IF($Q$${5 + index}="","",IF(${anyActuals}=0,"",SUMPRODUCT(--(IFNA(XLOOKUP(${players},${board}!$B$2:$B$424,${board}!$D$2:$D$424),"")=$Q$${5 + index}))))`]);
  }
  analytics.getRange(5, 18, 20, 1).setFormulas(positionFormulas);

  analytics.getRange('S5:T20').clearContent();
  analytics.getRange(5, 19, 7, 1).setValues(rounds.map(round => [round]));
  analytics.getRange(5, 20, 7, 1).setFormulas(rounds.map((round, index) =>
    [`=IF(${anyActuals}=0,"",IFERROR(ROUND(AVERAGEIFS(${valueColumn},${actRoundColumn},$S$${5 + index}),1),""))`]
  ));
  done.push('analytics round, team, position, and value blocks now derive from _actuals and stay blank until actuals exist');
}

function repairTeamViewSources_(spreadsheet, done, skipped) {
  const bigBoard = findSheetByNames_(spreadsheet, NAMED_SHEETS.bigBoard);
  if (!bigBoard) {
    skipped.push('team views need Big Board');
    return;
  }
  ensureActualsSheet_(spreadsheet);
  const board = bigBoard.getName();
  let updated = 0;

  const teamReport = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.teamReportSheetId, DRAFT_LIVE_CONFIG.teamReportSheetLabel);
  if (!teamReport.getRange('A8').getFormula().includes(DRAFT_LIVE_CONFIG.actualsSheetName)) {
    ensureRows_(teamReport, 48);
    teamReport.getRange('A8:I48').clearContent();
    teamReport.getRange('A8').setFormula(teamClassFormula_(board, '$B$3'));
    teamReport.getRange('B5').setFormula('=IF(COUNTA($D$8:$D$48)=0,"",COUNTA($D$8:$D$48))');
    teamReport.getRange('D5').setFormula('=IFERROR(ROUND(AVERAGE($H$8:$H$48),2),"")');
    teamReport.getRange('F5').setFormula('=IFERROR(ROUND(AVERAGE($I$8:$I$48),1),"")');
    updated += 1;
  }

  const teamCompare = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.teamCompareSheetId, DRAFT_LIVE_CONFIG.teamCompareSheetLabel);
  const compareBlocks = detectTeamCompareBlocks_(teamCompare);
  if (compareBlocks.length === 0) {
    skipped.push('Team-Compare layout not recognized, left untouched');
  } else {
    // Bottom-up so inserting room inside one block cannot move the blocks above it.
    for (let index = compareBlocks.length - 1; index >= 0; index -= 1) {
      const block = compareBlocks[index];
      try {
        const anchor = teamCompare.getRange(block.anchorRow, 1);
        if (anchor.getFormula().includes(DRAFT_LIVE_CONFIG.actualsSheetName)) {
          continue;
        }
        ensureColumns_(teamCompare, TEAM_VIEW_HEADER.length);
        ensureRows_(teamCompare, block.anchorRow + block.rows - 1);
        teamCompare.getRange(block.anchorRow, 1, block.rows, TEAM_VIEW_HEADER.length).clearContent();
        anchor.setFormula(teamClassFormula_(board, block.selector));
        updated += 1;
      } catch (error) {
        skipped.push(`Team-Compare ${block.label} failed: ${error.message}`);
      }
    }
  }

  const draftActual = findSheetByNames_(spreadsheet, NAMED_SHEETS.draftActual);
  if (draftActual) {
    const headerRow = findRowByFirstCell_(draftActual, 'Round', 14);
    if (headerRow > 0) {
      const anchor = draftActual.getRange(headerRow + 1, 1);
      if (!anchor.getFormula().includes(DRAFT_LIVE_CONFIG.actualsSheetName)) {
        ensureRows_(draftActual, headerRow + 58);
        draftActual.getRange(headerRow + 1, 1, 58, 9).clearContent();
        anchor.setFormula(teamClassFormula_(board, '$B$3'));
        const summaryLabels = draftActual.getRange('A1:A9').getDisplayValues().flat();
        const summaryTargets = [
          ['Selections', `=IF(COUNTA($D$${headerRow + 1}:$D$${headerRow + 58})=0,"",COUNTA($D$${headerRow + 1}:$D$${headerRow + 58}))`],
          ['Average NFL Grade', `=IFERROR(ROUND(AVERAGE($H$${headerRow + 1}:$H$${headerRow + 58}),2),"")`],
          ['Average Value Vs Rank', `=IFERROR(ROUND(AVERAGE($I$${headerRow + 1}:$I$${headerRow + 58}),1),"")`],
        ];
        summaryTargets.forEach(([label, formula]) => {
          const row = summaryLabels.findIndex(value => value === label) + 1;
          if (row > 0) {
            draftActual.getRange(row, 2).setFormula(formula);
          }
        });
        updated += 1;
      }
    }
  }

  if (updated > 0) {
    done.push(`team views rebuilt from _actuals (${updated} block${updated === 1 ? '' : 's'}), blank until actuals exist`);
  } else {
    skipped.push('team views already sourced from actuals');
  }
}

const TEAM_VIEW_HEADER = Object.freeze([
  'Round', 'Pick', 'Overall', 'Player', 'Pos', 'College', 'Board Rank', 'NFL Grade', 'Value Vs Rank',
]);

// The owner's Team-Compare stacks its team blocks vertically in A:I: a "Team n" label row
// carrying the selector in column B, a blank row, a header row, then the picks. Positions are
// discovered rather than assumed, and a block is only rewritten when its header row matches
// TEAM_VIEW_HEADER, so an unrecognized layout is left completely untouched instead of cleared.
function detectTeamCompareBlocks_(sheet) {
  const scanRows = Math.min(sheet.getMaxRows ? sheet.getMaxRows() : 200, 200);
  const columnA = sheet.getRange(1, 1, scanRows, 1).getDisplayValues().flat();
  const width = Math.min(TEAM_VIEW_HEADER.length, sheet.getMaxColumns ? sheet.getMaxColumns() : TEAM_VIEW_HEADER.length);
  if (width < TEAM_VIEW_HEADER.length) {
    return [];
  }
  const labelRows = [];
  columnA.forEach((value, index) => {
    if (/^Team \d+$/.test(String(value).trim())) {
      labelRows.push(index + 1);
    }
  });
  const blocks = [];
  labelRows.forEach((labelRow, index) => {
    const headerRow = labelRow + 2;
    if (headerRow + 1 > scanRows) {
      return;
    }
    const header = sheet.getRange(headerRow, 1, 1, TEAM_VIEW_HEADER.length).getDisplayValues()[0];
    if (TEAM_VIEW_HEADER.some((label, column) => String(header[column]).trim() !== label)) {
      return;
    }
    const anchorRow = headerRow + 1;
    const nextLabelRow = labelRows[index + 1];
    const rows = nextLabelRow ? Math.max(nextLabelRow - 1 - anchorRow, 1) : Math.max(scanRows - anchorRow + 1, 1);
    blocks.push({label: String(columnA[labelRow - 1]).trim(), labelRow, anchorRow, rows, selector: `$B$${labelRow}`});
  });
  return blocks;
}

function teamClassFormula_(bigBoardName, selectorAbs) {
  const actuals = quoteSheetName_(DRAFT_LIVE_CONFIG.actualsSheetName);
  const board = quoteSheetName_(bigBoardName);
  const lastRow = DRAFT_LIVE_CONFIG.firstDataRow + DRAFT_LIVE_CONFIG.totalPicks - 1;
  const key = `${actuals}!$E$2:$E$${lastRow}`;
  const boardPlayers = `${board}!$B$2:$B$424`;
  const join = column => `IFNA(XLOOKUP(${key},${boardPlayers},${board}!$${column}$2:$${column}$424),"")`;
  const columns = [
    `${actuals}!$A$2:$A$${lastRow}`,
    `${actuals}!$B$2:$B$${lastRow}`,
    `${actuals}!$C$2:$C$${lastRow}`,
    key,
    join('D'),
    join('F'),
    join('A'),
    join('C'),
    `IFERROR(${actuals}!$C$2:$C$${lastRow}-XLOOKUP(${key},${boardPlayers},${board}!$A$2:$A$424),"")`,
  ];
  return `=IFERROR(SORT(FILTER({${columns.join(',')}},${actuals}!$D$2:$D$${lastRow}=${selectorAbs}),3,TRUE),"")`;
}

function repairMockLabOrder_(spreadsheet, done, skipped) {
  const sheet = findSheetByNames_(spreadsheet, NAMED_SHEETS.mockLab);
  if (!sheet) {
    skipped.push('Mock Lab sheet not found');
    return;
  }
  const headerRow = findRowByFirstCell_(sheet, 'Overall', 10);
  if (headerRow === 0) {
    skipped.push('Mock Lab layout not recognized');
    return;
  }
  const dataRow = headerRow + 1;
  const firstCell = sheet.getRange(dataRow, 1).getDisplayValue();
  if (/^\d+$/.test(firstCell) && sheet.getRange(dataRow, 2).getFormula() !== '') {
    skipped.push('Mock Lab order already live');
    return;
  }
  const tracker = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.trackerSheetId, DRAFT_LIVE_CONFIG.trackerSheetLabel);
  const resolved = resolveTrackerColumns_(tracker);
  if (!resolved) {
    skipped.push('Mock Lab rebuild needs a recognized tracker layout');
    return;
  }
  const letters = trackerColumnLetters_(resolved);
  const trackerRef = quoteSheetName_(tracker.getName());
  const lastRow = DRAFT_LIVE_CONFIG.firstDataRow + DRAFT_LIVE_CONFIG.totalPicks - 1;
  ensureRows_(sheet, dataRow + DRAFT_LIVE_CONFIG.totalPicks - 1);
  const trackerColumn = letter => `${trackerRef}!$${letter}$2:$${letter}$${lastRow}`;
  const overalls = [];
  const teamFormulas = [];
  const roundFormulas = [];
  const pickFormulas = [];
  for (let index = 0; index < DRAFT_LIVE_CONFIG.totalPicks; index += 1) {
    const row = dataRow + index;
    overalls.push([index + 1]);
    teamFormulas.push([`=IF($A${row}="","",IFERROR(INDEX(${trackerColumn(letters.projTeam)},$A${row}),""))`]);
    roundFormulas.push([`=IF($A${row}="","",IFERROR(INDEX(${trackerColumn(letters.projRound)},$A${row}),""))`]);
    pickFormulas.push([`=IF($A${row}="","",IFERROR(INDEX(${trackerColumn(letters.projPick)},$A${row}),""))`]);
  }
  sheet.getRange(dataRow, 1, DRAFT_LIVE_CONFIG.totalPicks, 1).setValues(overalls);
  sheet.getRange(dataRow, 2, DRAFT_LIVE_CONFIG.totalPicks, 1).setFormulas(teamFormulas);
  sheet.getRange(dataRow, 3, DRAFT_LIVE_CONFIG.totalPicks, 1).setFormulas(roundFormulas);
  sheet.getRange(dataRow, 4, DRAFT_LIVE_CONFIG.totalPicks, 1).setFormulas(pickFormulas);
  done.push('Mock Lab order rebuilt from the tracker projection columns');
}

function applyWorkbookTheme() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const issues = [];
  const tracker = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.trackerSheetId, DRAFT_LIVE_CONFIG.trackerSheetLabel);
  const trackerColumns = resolveTrackerColumns_(tracker);
  const trackerLastRow = DRAFT_LIVE_CONFIG.firstDataRow + DRAFT_LIVE_CONFIG.totalPicks - 1;
  let trackerFormats = [];
  if (trackerColumns) {
    const letters = trackerColumnLetters_(trackerColumns);
    trackerFormats = [
      [`${letters.nflGrade}2:${letters.nflGrade}${trackerLastRow}`, '0.00'],
      [`${letters.valueVsRank}2:${letters.valueVsRank}${trackerLastRow}`, '0'],
    ];
  } else {
    issues.push(`${tracker.getName()}: tracker layout not recognized, number formats skipped`);
  }
  spreadsheet.getSheets().forEach(sheet => {
    try {
      sheet.getDataRange().setFontFamily('Arial');
    } catch (error) {
      issues.push(`${sheet.getName()}: ${error.message}`);
    }
  });
  const tables = [
    {sheet: tracker, headerLabel: 'Player', freezeColumns: 1, formats: trackerFormats},
    {sheet: findSheetByNames_(spreadsheet, NAMED_SHEETS.bigBoard), headerLabel: 'Rank', freezeColumns: 2, formats: [['C2:C424', '0.00']]},
    {sheet: findSheetByNames_(spreadsheet, NAMED_SHEETS.playerBios), headerLabel: 'Player', freezeColumns: 1, formats: []},
    {sheet: findSheetByNames_(spreadsheet, NAMED_SHEETS.boardByPosition), headerLabel: 'Board Rank', freezeColumns: 0, formats: []},
    {sheet: findSheetByNames_(spreadsheet, NAMED_SHEETS.draftActual), headerLabel: 'Round', freezeColumns: 0, formats: []},
    {sheet: findSheetByNames_(spreadsheet, NAMED_SHEETS.teamNeeds), headerLabel: 'NFL Team', freezeColumns: 1, formats: []},
    {sheet: findSheetByNames_(spreadsheet, NAMED_SHEETS.mockLab), headerLabel: 'Overall', freezeColumns: 0, formats: []},
    {sheet: findSheetByNames_(spreadsheet, NAMED_SHEETS.tradeCalculator), headerLabel: 'Overall Pick', freezeColumns: 0, formats: []},
    {sheet: findSheetByNames_(spreadsheet, NAMED_SHEETS.nflInfo), headerLabel: 'Logo', freezeColumns: 2, formats: []},
    {sheet: findSheetByNames_(spreadsheet, NAMED_SHEETS.draftHistory), headerLabel: 'Draft Year', freezeColumns: 0, formats: []},
    {sheet: requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.analysisSheetId, DRAFT_LIVE_CONFIG.analysisSheetLabel), headerLabel: 'Analysis Name', freezeColumns: 0, formats: []},
    {sheet: requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.logSheetId, DRAFT_LIVE_CONFIG.logSheetLabel), headerLabel: 'Timestamp', freezeColumns: 0, formats: []},
  ];
  tables.forEach(table => {
    if (!table.sheet) {
      return;
    }
    try {
      styleDataTable_(table.sheet, table.headerLabel, table.freezeColumns, table.formats);
    } catch (error) {
      issues.push(`${table.sheet.getName()}: ${error.message}`);
    }
  });
  try {
    const analytics = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.analyticsSheetId, DRAFT_LIVE_CONFIG.analyticsSheetLabel);
    analytics.getRange('A4:T4').setFontWeight('bold');
    analytics.getRange('F5:F13').setNumberFormat('0.00');
    analytics.getRange('T5:T11').setNumberFormat('0.0');
    analytics.getRange('B7:B8').setNumberFormat('0.00');
  } catch (error) {
    issues.push(`Analytics: ${error.message}`);
  }
  const message = issues.length === 0
    ? 'THEME: consistent fonts, headers, freezes, banding, and number formats applied.'
    : `THEME: applied with issues on ${issues.join('; ')}.`;
  appendUpdateLog_(new Date(), issues.length === 0 ? 'PASS' : 'CHECK', getCurrentPickCount_(spreadsheet), 0, 0, message, 'workbook-theme', getCurrentSnapshotHash_(spreadsheet));
  spreadsheet.toast(message, 'Draft War Room', 8);
}

function styleDataTable_(sheet, headerLabel, freezeColumns, formats) {
  const headerRow = findRowByFirstCell_(sheet, headerLabel, 14);
  if (headerRow === 0) {
    throw new Error(`header row "${headerLabel}" not found`);
  }
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const lastRow = Math.max(sheet.getLastRow(), headerRow);
  const header = sheet.getRange(headerRow, 1, 1, lastColumn);
  header.setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#1C2A39').setVerticalAlignment('middle');
  if (headerRow > 1) {
    sheet.getRange('A1').setFontWeight('bold').setFontSize(14);
  }
  sheet.setFrozenRows(headerRow);
  sheet.setFrozenColumns(freezeColumns);
  if (lastRow > headerRow) {
    sheet.getBandings().forEach(banding => banding.remove());
    sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastColumn)
      .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
  }
  formats.forEach(([a1, format]) => sheet.getRange(a1).setNumberFormat(format));
}

function rebuildDashboardCharts() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.dashboardSheetId, DRAFT_LIVE_CONFIG.dashboardSheetLabel);
  const analytics = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.analyticsSheetId, DRAFT_LIVE_CONFIG.analyticsSheetLabel);
  const bigBoard = findSheetByNames_(spreadsheet, NAMED_SHEETS.bigBoard);
  const label = dashboard.getRange('A23');
  if (label.getDisplayValue() === '' || label.getDisplayValue() === 'Visual Story') {
    label.setValue('Visual Story').setFontWeight('bold').setFontSize(12);
  }
  const charts = [
    {type: Charts.ChartType.COLUMN, ranges: [analytics.getRange('H4:I11')], title: 'Selections by Round', row: 24, column: 1},
    {type: Charts.ChartType.BAR, ranges: [analytics.getRange('Q4:R20')], title: 'Official Selections by Position', row: 24, column: 7},
    {type: Charts.ChartType.BAR, ranges: [analytics.getRange('K4:L36')], title: 'Draft Volume by NFL Team', row: 43, column: 1, height: 640},
    {type: Charts.ChartType.COLUMN, ranges: [analytics.getRange('S4:T11')], title: 'Average Value vs Rank by Round', row: 43, column: 7},
    {type: Charts.ChartType.COLUMN, ranges: [analytics.getRange('D4:E13'), analytics.getRange('G4:G13')], title: 'Prospects vs Drafted by Group', row: 62, column: 7},
  ];
  if (bigBoard) {
    charts.push({type: Charts.ChartType.HISTOGRAM, ranges: [bigBoard.getRange('C1:C424')], title: 'NFL Grade Distribution', row: 80, column: 7});
  }
  const seasonForecast = findSheetByNames_(spreadsheet, NAMED_SHEETS.seasonForecast);
  if (seasonForecast && seasonForecast.getRange('A5').getDisplayValue() === 'Fantasy Team') {
    const forecastTeams = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.configSheetId, DRAFT_LIVE_CONFIG.configSheetLabel)
      .getRange('F2:F13').getDisplayValues().flat().filter(team => team !== '');
    if (forecastTeams.length >= 2) {
      const layout = forecastLayout_(forecastTeams.length);
      charts.push({
        type: Charts.ChartType.BAR,
        ranges: [
          seasonForecast.getRange(`A${layout.tableTop - 1}:A${layout.tableBottom}`),
          seasonForecast.getRange(`G${layout.tableTop - 1}:G${layout.tableBottom}`),
        ],
        title: 'Championship Odds',
        row: 80,
        column: 1,
      });
    }
  }
  const analysisIndex = findSheetById_(spreadsheet, DRAFT_LIVE_CONFIG.analysisSheetId);
  if (analysisIndex) {
    const analysisHeaderRow = findRowByFirstCell_(analysisIndex, ANALYSIS_SNAPSHOT.indexHeaderLabel, 14);
    const savedCount = analysisHeaderRow > 0 ? analysisIndex.getLastRow() - analysisHeaderRow : 0;
    if (savedCount > 0) {
      charts.push({
        type: Charts.ChartType.COLUMN,
        ranges: [
          analysisIndex.getRange(analysisHeaderRow, 1, savedCount + 1, 1),
          analysisIndex.getRange(analysisHeaderRow, ANALYSIS_SNAPSHOT.picksAtSaveColumn, savedCount + 1, 1),
          analysisIndex.getRange(analysisHeaderRow, ANALYSIS_SNAPSHOT.draftedNowColumn, savedCount + 1, 1),
        ],
        title: 'Saved Analysis Performance',
        row: 99,
        column: 1,
      });
    }
  }
  // Replace only the charts this function owns, matched by title. A chart the owner added by
  // hand is left in place instead of being deleted on every rebuild.
  const ownedTitles = charts.map(spec => spec.title);
  let removed = 0;
  dashboard.getCharts().forEach(chart => {
    const options = chart.getOptions ? chart.getOptions() : null;
    const title = options && options.get ? options.get('title') : null;
    if (ownedTitles.indexOf(title) >= 0) {
      dashboard.removeChart(chart);
      removed += 1;
    }
  });
  charts.forEach(spec => {
    const builder = dashboard.newChart().setChartType(spec.type);
    spec.ranges.forEach(range => builder.addRange(range));
    builder
      .setPosition(spec.row, spec.column, 0, 0)
      .setOption('title', spec.title)
      .setOption('width', 520)
      .setOption('height', spec.height || 320)
      .setNumHeaders(1);
    dashboard.insertChart(builder.build());
  });
  const message = `CHARTS: rebuilt ${charts.length} dashboard charts covering the draft, saved analyses, and the season forecast where available (${removed} replaced, charts added by hand kept).`;
  appendUpdateLog_(new Date(), 'PASS', getCurrentPickCount_(spreadsheet), 0, 0, message, 'dashboard-charts', getCurrentSnapshotHash_(spreadsheet));
  spreadsheet.toast(message, 'Draft War Room', 8);
}

const START_HERE_TEXT = Object.freeze({
  title: '2026 NFL DRAFT WAR ROOM',
  subtitle: 'Built from the official NFL 2026 Draft Tracker and inspired by the NYGB Draft Tracker workbook.',
  description: 'A native Google Sheets command center for final results, live-reactive analysis, custom scouting, mocks, trades, history, and visual storytelling.',
});

const MENU_GUIDE = Object.freeze([
  ['Refresh now', 'Any time after installation', 'Pulls the official NFL snapshot, validates it, and updates the Draft Tracker.'],
  ['Save current analysis', 'From the view you want to keep', 'Names the analysis, saves a values-only Saved tab, and logs it in Analysis-Saved.'],
  ['Run system checks', 'After setup and after configuration changes', 'Validates data, formulas, and league settings, and scans the workbook for errors.'],
  ['Repair known issues', 'Once after attaching the script', 'Applies the audited fixes; safe to rerun, skips anything already clean.'],
  ['Apply workbook theme', 'After repair', 'Applies consistent fonts, headers, freezes, banding, and number formats.'],
  ['Rebuild dashboard charts', 'After the theme pass', 'Places the six-chart visual story on Dashboard.'],
  ['Update Start Here guide', 'After tab or menu changes', 'Rewrites this tab with current navigation links and instructions.'],
  ['Rebuild mobile view', 'After setup and after the draft', 'Rebuilds the phone-friendly Mobile tab in draft or season mode.'],
  ['Build season forecast', 'At season start, then as needed', 'Builds head-to-head odds, expected wins, and champion odds from editable power ratings.'],
  ['Build recommendations', 'After the draft and during the season', 'Builds live ranked options: free-agent targets, value picks, reaches, contenders, dark horses, and matchup calls.'],
  ['Build draft optimizer', 'Before the league draft', 'Builds a snake draft board that recommends the optimal pick from who is still available.'],
  ['Open report builder', 'Whenever you want a composed report', 'Opens the Report Builder tab to pick sections, focus values, and output mode.'],
  ['Generate report from builder', 'After composing on Report Builder', 'Writes a live Report tab or a frozen Saved tab and logs it in Analysis-Saved.'],
  ['Link player names to bios', 'Once after setup', 'Turns player names on the Big Board and Draft Tracker into clickable links to Player-Bios.'],
  ['Install one-minute updates', 'Commissioner, on draft day', 'Schedules the live poller; it stops itself after all 257 picks validate.'],
  ['Remove scheduled updates', 'Early stop only', 'Removes the live poller before completion.'],
]);

const SAVE_ANALYSIS_GUIDE = Object.freeze([
  ['Step 1', 'Open the analysis view and set its selectors', 'Team Compare, Player Compare, College History, Mock Lab, or any custom view.'],
  ['Step 2', 'Choose Draft War Room, then Save current analysis', 'The analysis type is detected from the tab you are on.'],
  ['Step 3', 'Name the analysis and add optional notes', 'The name becomes the grey Saved tab name.'],
  ['Step 4', 'Reopen it any time from Saved Analyses', 'The index logs who saved it, when, the selectors, and an Open snapshot link.'],
]);

const FIRST_TIME_SETUP_GUIDE = Object.freeze([
  ['Step 1', 'Configure the league in _config', 'Teams, managers, draft slots, and scoring feed the shared views.'],
  ['Step 2', 'Assign the commissioner in _config!B3', 'The durable account that owns automation.'],
  ['Step 3', 'Review Draft Rules', 'Resolve every required input until the readiness check passes.'],
  ['Step 4', 'Attach apps-script/code.gs and authorize it', 'Extensions, then Apps Script, as the commissioner account.'],
  ['Step 5', 'Run Repair known issues, Apply workbook theme, Rebuild dashboard charts, Rebuild mobile view', 'One-time cleanup and formatting pass from the Draft War Room menu.'],
  ['Step 6', 'Run system checks', 'Rerun after any significant configuration change.'],
]);

function updateStartHereGuide() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = findSheetByNames_(spreadsheet, NAMED_SHEETS.startHere);
  if (!sheet) {
    throw new Error('Missing required sheet: Start Here.');
  }
  const guide = buildStartHereGuide_(spreadsheet);
  const clearRows = Math.max(sheet.getLastRow(), guide.rows.length);
  sheet.getRange(1, 1, clearRows, Math.max(sheet.getLastColumn(), 3)).clearContent();
  sheet.getRange(1, 1, guide.rows.length, 3).setValues(guide.rows);
  guide.formulas.forEach(item => sheet.getRange(item.row, item.column).setFormula(item.formula));
  guide.boldRows.forEach(row => sheet.getRange(row, 1, 1, 3).setFontWeight('bold'));
  sheet.getRange('A1').setFontSize(14);
  const message = `GUIDE: Start Here rebuilt with ${guide.navCount} navigation links and menu instructions.`;
  appendUpdateLog_(new Date(), 'PASS', getCurrentPickCount_(spreadsheet), 0, 0, message, 'start-here-guide', getCurrentSnapshotHash_(spreadsheet));
  spreadsheet.toast(message, 'Draft War Room', 6);
}

function buildStartHereGuide_(spreadsheet) {
  const rows = [];
  const formulas = [];
  const boldRows = [];
  const pushRow = values => {
    rows.push(values);
    return rows.length;
  };
  const pushSection = values => {
    const row = pushRow(values);
    boldRows.push(row);
    return row;
  };

  pushSection([START_HERE_TEXT.title, '', '']);
  pushRow(['', START_HERE_TEXT.subtitle, '']);
  pushRow(['', START_HERE_TEXT.description, '']);
  pushRow(['', '', '']);
  pushSection(['At A Glance', 'Value', 'Notes']);
  pushRow(['Official selections', DRAFT_LIVE_CONFIG.totalPicks, 'Every pick from all seven rounds.']);
  pushRow(['Prospect profiles', 423, 'NFL.com scouting profiles, measurements, drills, bios, college history, grades, and analysis.']);
  pushRow(['Teams', 32, 'Conference, division, team color, and pick-level analysis.']);
  const statusRow = pushRow(['Workbook status', '', 'All dashboards and reports update when source tables change.']);
  formulas.push({row: statusRow, column: 2, formula: startHereStatusFormula_(spreadsheet)});
  pushRow(['', '', '']);

  pushSection(['Quick Navigation', 'Open', 'Purpose']);
  const navTargets = startHereNavTargets_(spreadsheet);
  navTargets.forEach(target => {
    const row = pushRow([target.label, 'Open', target.purpose]);
    formulas.push({row, column: 2, formula: `=HYPERLINK("#gid=${target.sheet.getSheetId()}","Open")`});
  });
  pushRow(['', '', '']);

  pushSection(['Draft War Room Menu', 'When To Run', 'What It Does']);
  MENU_GUIDE.forEach(entry => pushRow(entry.slice()));
  pushRow(['', '', '']);

  pushSection(['Save An Analysis', 'Do', 'Detail']);
  SAVE_ANALYSIS_GUIDE.forEach(entry => pushRow(entry.slice()));
  pushRow(['', '', '']);

  pushSection(['First-Time Setup', 'Do', 'Detail']);
  FIRST_TIME_SETUP_GUIDE.forEach(entry => pushRow(entry.slice()));

  return {rows, formulas, boldRows, navCount: navTargets.length};
}

function startHereNavTargets_(spreadsheet) {
  const byId = sheetId => findSheetById_(spreadsheet, sheetId);
  const byName = names => findSheetByNames_(spreadsheet, names);
  return [
    {sheet: byId(DRAFT_LIVE_CONFIG.dashboardSheetId), label: 'Dashboard', purpose: 'Executive view of the draft class.'},
    {sheet: byId(DRAFT_LIVE_CONFIG.trackerSheetId), label: 'Draft Tracker', purpose: 'All 257 selections with value-over-rank scoring.'},
    {sheet: byName(NAMED_SHEETS.bigBoard), label: 'Big Board', purpose: 'Official NFL grade-based board for 423 prospects.'},
    {sheet: byName(NAMED_SHEETS.playerBios), label: 'Player Profiles', purpose: 'Deep bios, measurements, combine data, strengths, weaknesses, and sources.'},
    {sheet: byName(NAMED_SHEETS.boardByPosition), label: 'Positional Board', purpose: 'Interactive position filter and available-player board.'},
    {sheet: byId(DRAFT_LIVE_CONFIG.playerCompareSheetId), label: 'Player Compare', purpose: 'Side-by-side player profile and athletic comparison.'},
    {sheet: byId(DRAFT_LIVE_CONFIG.collegeHistorySheetId), label: 'College History', purpose: 'School output, draft capital, and top-player analysis.'},
    {sheet: byId(DRAFT_LIVE_CONFIG.teamReportSheetId), label: 'Team Report', purpose: 'Interactive draft report for NFL and fantasy teams.'},
    {sheet: byId(DRAFT_LIVE_CONFIG.teamCompareSheetId), label: 'Team Compare', purpose: 'Three-team NFL and three-team fantasy comparison.'},
    {sheet: byName(NAMED_SHEETS.teamNeeds), label: 'Team Needs', purpose: 'Editable needs board with automatic fit scoring.'},
    {sheet: byName(NAMED_SHEETS.draftActual), label: 'Actual Team Drafts', purpose: 'Pick-by-pick results for one selected NFL team.'},
    {sheet: byName(NAMED_SHEETS.mockLab), label: 'Mock Lab', purpose: 'Build and score a first-round mock against the final draft.'},
    {sheet: byName(NAMED_SHEETS.tradeCalculator), label: 'Trade Calculator', purpose: 'Compare pick packages with a 257-pick value curve.'},
    {sheet: byId(DRAFT_LIVE_CONFIG.analyticsSheetId), label: 'Analytics', purpose: 'Position, round, class, conference, and grade summaries.'},
    {sheet: byId(DRAFT_LIVE_CONFIG.analysisSheetId), label: 'Saved Analyses', purpose: 'Index of saved analyses with links to their snapshot tabs.'},
    {sheet: byName(NAMED_SHEETS.mobileView), label: 'Mobile', purpose: 'Phone-friendly vertical view of draft status, availability, and the season.'},
    {sheet: byName(NAMED_SHEETS.seasonForecast), label: 'Season Forecast', purpose: 'Head-to-head odds, expected wins, and champion odds from editable power ratings.'},
    {sheet: byName(NAMED_SHEETS.recommendations), label: 'Recommendations', purpose: 'Live ranked options: free agents, value picks, contenders, dark horses, and matchup calls.'},
    {sheet: byName(NAMED_SHEETS.draftOptimizer), label: 'Draft Optimizer', purpose: 'Snake draft board that recommends the optimal pick from who is still available.'},
    {sheet: byName(NAMED_SHEETS.reportBuilder), label: 'Report Builder', purpose: 'Compose custom reports across every workbook dimension, saved live or frozen.'},
    {sheet: byId(DRAFT_LIVE_CONFIG.draftRulesSheetId), label: 'Draft Rules', purpose: 'League rules and the readiness check.'},
    {sheet: byName(NAMED_SHEETS.commissionerDashboard), label: 'Commissioner Dashboard', purpose: 'League readiness and quality rollup for the commissioner.'},
    {sheet: byName(NAMED_SHEETS.draftHistory), label: 'Draft History', purpose: 'Recent first-overall history and class context.'},
    {sheet: byName(NAMED_SHEETS.sourceCenter), label: 'Source Center', purpose: 'Source URLs, refresh timestamp, and data-quality checks.'},
  ].filter(target => target.sheet);
}

function rebuildMobileView() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const mode = getMobileViewMode_();
  rebuildMobileView_(spreadsheet, mode);
  const message = `MOBILE: Mobile view rebuilt in ${mode.toLowerCase()} mode.`;
  appendUpdateLog_(new Date(), 'PASS', getCurrentPickCount_(spreadsheet), 0, 0, message, 'mobile-view', getCurrentSnapshotHash_(spreadsheet));
  spreadsheet.toast(message, 'Draft War Room', 6);
}

function rebuildMobileView_(spreadsheet, mode) {
  let sheet = findSheetByNames_(spreadsheet, NAMED_SHEETS.mobileView);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(NAMED_SHEETS.mobileView[0]);
  }
  const guide = buildMobileViewGuide_(spreadsheet, mode);
  const clearRows = Math.max(sheet.getLastRow(), guide.rows.length);
  sheet.getRange(1, 1, clearRows, Math.max(sheet.getLastColumn(), 1)).clearContent();
  sheet.getRange(1, 1, guide.rows.length, 1).setValues(guide.rows);
  guide.formulas.forEach(item => sheet.getRange(item.row, item.column).setFormula(item.formula));
  guide.boldRows.forEach(row => sheet.getRange(row, 1).setFontWeight('bold'));
  sheet.getRange('A1').setFontSize(14);
  sheet.setColumnWidth(1, 360);
  return sheet;
}

function buildMobileViewGuide_(spreadsheet, mode) {
  const rows = [];
  const formulas = [];
  const boldRows = [];
  const pushRow = value => {
    rows.push([value]);
    return rows.length;
  };
  const pushSection = value => {
    const row = pushRow(value);
    boldRows.push(row);
    return row;
  };
  const pushFormula = formula => {
    const row = pushRow('');
    formulas.push({row, column: 1, formula});
    return row;
  };

  const playerColumn = actualsColumnRef_(spreadsheet, 'E');
  const overallColumn = actualsColumnRef_(spreadsheet, 'C');
  const teamColumn = actualsColumnRef_(spreadsheet, 'D');
  const updatesRef = quoteSheetName_(requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.statusSheetId, DRAFT_LIVE_CONFIG.statusSheetLabel).getName());
  const configRef = quoteSheetName_(requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.configSheetId, DRAFT_LIVE_CONFIG.configSheetLabel).getName());
  const bigBoard = findSheetByNames_(spreadsheet, NAMED_SHEETS.bigBoard);

  pushSection(START_HERE_TEXT.title);
  pushSection(mode === 'SEASON' ? 'SEASON MODE' : 'DRAFT MODE');
  pushRow('');

  const draftStatusSection = () => {
    pushSection(mode === 'SEASON' ? 'Draft Recap' : 'Draft Status');
    pushFormula(`="Feed: "&${updatesRef}!B2`);
    pushFormula(`=COUNTA(${playerColumn})&" of ${DRAFT_LIVE_CONFIG.totalPicks} picks in"`);
    pushFormula(`=IFERROR(SPARKLINE(COUNTA(${playerColumn}),{"charttype","bar";"max",${DRAFT_LIVE_CONFIG.totalPicks};"color1","#1C2A39"}),"")`);
    pushFormula(`=IFERROR("Last: #"&INDEX(FILTER(${overallColumn},${playerColumn}<>""),COUNTA(${playerColumn}))&" "&INDEX(FILTER(${playerColumn},${playerColumn}<>""),COUNTA(${playerColumn}))&" ("&INDEX(FILTER(${teamColumn},${playerColumn}<>""),COUNTA(${playerColumn}))&")","Last: none yet")`);
    pushFormula(`=IF(${updatesRef}!B3="","Updated: never",IFERROR("Updated: "&TEXT(${updatesRef}!B3,"mmm d h:mm am/pm"),"Updated: never"))`);
    pushRow('');
  };

  const availableSection = () => {
    pushSection(mode === 'SEASON' ? 'Undrafted Free Agents' : 'Top Available');
    if (bigBoard) {
      const board = quoteSheetName_(bigBoard.getName());
      const bioParts = playerBioLinkParts_(spreadsheet);
      const availableCondition = `${board}!B2:B424<>"",${board}!Q2:Q424=""`;
      const lineText = `${board}!A2:A424&". "&${board}!B2:B424&" ("&${board}!E2:E424&")"`;
      pushFormula(bioParts
        ? `=IFERROR(ARRAY_CONSTRAIN(ARRAYFORMULA(HYPERLINK("#gid=${bioParts.gid}&range=A"&IFNA(MATCH(FILTER(${board}!B2:B424,${availableCondition}),${bioParts.nameColumn},0),1),FILTER(${lineText},${availableCondition}))),15,1),"Everyone on the board is drafted.")`
        : `=IFERROR(ARRAY_CONSTRAIN(FILTER(${lineText},${availableCondition}),15,1),"Everyone on the board is drafted.")`);
      for (let filler = 1; filler < 15; filler += 1) {
        pushRow('');
      }
    } else {
      pushRow('Big Board sheet not found.');
    }
    pushRow('');
  };

  const seasonSection = () => {
    pushSection('Season');
    pushFormula(`=IF(COUNTA(${playerColumn})>=${DRAFT_LIVE_CONFIG.totalPicks},"Draft complete. On to the season.","Draft not complete yet.")`);
    const forecastSheet = findSheetByNames_(spreadsheet, NAMED_SHEETS.seasonForecast);
    if (forecastSheet && forecastSheet.getRange('A5').getDisplayValue() === 'Fantasy Team') {
      const forecastTeams = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.configSheetId, DRAFT_LIVE_CONFIG.configSheetLabel)
        .getRange('F2:F13').getDisplayValues().flat().filter(team => team !== '');
      if (forecastTeams.length >= 2) {
        const layout = forecastLayout_(forecastTeams.length);
        const forecastRef = quoteSheetName_(forecastSheet.getName());
        pushRow('Champion odds by team:');
        pushFormula(`=IFERROR(SPARKLINE(${forecastRef}!G${layout.tableTop}:G${layout.tableBottom},{"charttype","column";"color","#1C2A39"}),"")`);
      }
    }
    pushRow('League teams and managers:');
    pushFormula(`=IFERROR(FILTER(${configRef}!F2:F13&" - "&${configRef}!G2:G13,${configRef}!F2:F13<>""),"League not configured yet.")`);
    for (let filler = 1; filler < 12; filler += 1) {
      pushRow('');
    }
    pushRow('');
  };

  const shortcutsSection = () => {
    pushSection('Shortcuts');
    [
      {sheet: findSheetByNames_(spreadsheet, NAMED_SHEETS.seasonForecast), label: 'Open Season Forecast'},
      {sheet: findSheetByNames_(spreadsheet, NAMED_SHEETS.recommendations), label: 'Open Recommendations'},
      {sheet: findSheetByNames_(spreadsheet, NAMED_SHEETS.draftOptimizer), label: 'Open Draft Optimizer'},
      {sheet: findSheetById_(spreadsheet, DRAFT_LIVE_CONFIG.teamReportSheetId), label: 'Open Team Report'},
      {sheet: findSheetById_(spreadsheet, DRAFT_LIVE_CONFIG.teamCompareSheetId), label: 'Open Team Compare'},
      {sheet: findSheetById_(spreadsheet, DRAFT_LIVE_CONFIG.dashboardSheetId), label: 'Open Dashboard'},
      {sheet: findSheetById_(spreadsheet, DRAFT_LIVE_CONFIG.draftRulesSheetId), label: 'Open Draft Rules'},
    ].filter(target => target.sheet).forEach(target => {
      pushFormula(`=HYPERLINK("#gid=${target.sheet.getSheetId()}","${target.label}")`);
    });
  };

  if (mode === 'SEASON') {
    seasonSection();
    draftStatusSection();
    availableSection();
  } else {
    draftStatusSection();
    availableSection();
    seasonSection();
  }
  shortcutsSection();

  return {rows, formulas, boldRows};
}

function getMobileViewMode_() {
  return PropertiesService.getScriptProperties().getProperty(SEASON_FOCUS.modeKey) === 'SEASON' ? 'SEASON' : 'DRAFT';
}

// Latches draft completion and arms the daily season-focus check exactly once. The flip sets
// seasonFocusDoneKey, so later refreshes never re-arm a trigger that has already run and
// rebuilt the season view. Never let a trigger-API failure here fail the ingest that called it.
function recordDraftCompletion_(now) {
  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty(SEASON_FOCUS.completedAtKey)) {
    properties.setProperty(SEASON_FOCUS.completedAtKey, now.toISOString());
  }
  if (properties.getProperty(SEASON_FOCUS.doneKey) === 'true') {
    return;
  }
  const installed = ScriptApp.getProjectTriggers().some(trigger => trigger.getHandlerFunction() === SEASON_FOCUS.triggerHandler);
  if (!installed) {
    ScriptApp.newTrigger(SEASON_FOCUS.triggerHandler).timeBased().everyDays(1).create();
  }
}

function seasonFocusCheck() {
  const properties = PropertiesService.getScriptProperties();
  const completedAt = properties.getProperty(SEASON_FOCUS.completedAtKey);
  if (!completedAt) {
    return;
  }
  if (Date.now() - new Date(completedAt).getTime() < SEASON_FOCUS.delayMs) {
    return;
  }
  properties.setProperty(SEASON_FOCUS.modeKey, 'SEASON');
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!findSheetByNames_(spreadsheet, NAMED_SHEETS.seasonForecast)) {
    buildSeasonForecast_(spreadsheet);
  }
  if (!findSheetByNames_(spreadsheet, NAMED_SHEETS.recommendations)) {
    buildRecommendations_(spreadsheet);
  }
  const mobile = rebuildMobileView_(spreadsheet, 'SEASON');
  spreadsheet.setActiveSheet(mobile);
  spreadsheet.moveActiveSheet(1);
  properties.setProperty(SEASON_FOCUS.doneKey, 'true');
  removeTriggersByHandler_(SEASON_FOCUS.triggerHandler);
  appendUpdateLog_(new Date(), 'SEASON', getCurrentPickCount_(spreadsheet), 0, 0, 'Season focus: Mobile view rebuilt in season mode and moved to the front, one week after draft completion.', 'season-focus', getCurrentSnapshotHash_(spreadsheet));
}

function buildSeasonForecast() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = buildSeasonForecast_(spreadsheet);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Configure at least two fantasy teams in _config!F2:G13 before building the season forecast.');
    return;
  }
  const message = 'FORECAST: Season Forecast rebuilt; edit Power Rating and Actual Wins to keep it current.';
  appendUpdateLog_(new Date(), 'PASS', getCurrentPickCount_(spreadsheet), 0, 0, message, 'season-forecast', getCurrentSnapshotHash_(spreadsheet));
  spreadsheet.toast(message, 'Draft War Room', 8);
}

function buildSeasonForecast_(spreadsheet) {
  const config = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.configSheetId, DRAFT_LIVE_CONFIG.configSheetLabel);
  const teamRows = config.getRange('F2:G13').getDisplayValues().filter(([team]) => team !== '');
  if (teamRows.length < 2) {
    return null;
  }
  let sheet = findSheetByNames_(spreadsheet, NAMED_SHEETS.seasonForecast);
  const preserved = sheet ? readForecastInputs_(sheet) : {games: 14, teams: {}};
  if (!sheet) {
    sheet = spreadsheet.insertSheet(NAMED_SHEETS.seasonForecast[0]);
  }
  const teamCount = teamRows.length;
  const width = Math.max(9, teamCount + 1);
  const rows = [];
  const formulas = [];
  const boldRows = [];
  const pushRow = values => {
    rows.push(values.concat(Array.from({length: width - values.length}, () => '')));
    return rows.length;
  };
  const pushSection = values => {
    const row = pushRow(values);
    boldRows.push(row);
    return row;
  };

  pushSection(['SEASON FORECAST']);
  pushRow(['Edit Power Rating and Actual Wins as the season progresses; expected wins, head-to-head odds, and champion odds recalculate live.']);
  pushRow(['Regular season games', preserved.games]);
  pushRow([]);
  pushSection(['Fantasy Team', 'Manager', 'Power Rating', 'Exp Wins', 'Actual Wins', 'Forecast Delta', 'Champion %', 'Fair Decimal Odds', 'Fair American Odds']);
  const tableTop = rows.length + 1;
  const tableBottom = tableTop + teamCount - 1;
  teamRows.forEach(([team, manager]) => {
    const saved = preserved.teams[team] || {};
    pushRow([team, manager, saved.rating === undefined || saved.rating === '' ? 50 : saved.rating, '', saved.actualWins === undefined ? '' : saved.actualWins]);
  });
  pushRow([]);
  pushSection(['Head To Head Win Probability (row team beats column team)']);
  const matrixHeaderRow = pushSection([''].concat(teamRows.map(([team]) => team)));
  const matrixTop = rows.length + 1;
  teamRows.forEach(([team]) => pushRow([team]));

  const lastMatrixColumn = columnLetter_(teamCount + 1);
  for (let index = 0; index < teamCount; index += 1) {
    const teamRow = tableTop + index;
    const matrixRow = matrixTop + index;
    formulas.push({row: teamRow, column: 4, formula: `=IFERROR(ROUND(SUM(B${matrixRow}:${lastMatrixColumn}${matrixRow})/${teamCount - 1}*$B$3,1),"")`});
    formulas.push({row: teamRow, column: 6, formula: `=IF(E${teamRow}="","",ROUND(E${teamRow}-D${teamRow},1))`});
    formulas.push({row: teamRow, column: 7, formula: `=EXP(C${teamRow}/10)/SUMPRODUCT(EXP($C$${tableTop}:$C$${tableBottom}/10))`});
    formulas.push({row: teamRow, column: 8, formula: `=IF(G${teamRow}=0,"",ROUND(1/G${teamRow},2))`});
    formulas.push({row: teamRow, column: 9, formula: `=IF(G${teamRow}=0,"",IF(G${teamRow}>=0.5,ROUND(-100*G${teamRow}/(1-G${teamRow}),0),ROUND(100*(1-G${teamRow})/G${teamRow},0)))`});
    for (let opponent = 0; opponent < teamCount; opponent += 1) {
      const column = opponent + 2;
      const columnRef = columnLetter_(column);
      formulas.push({
        row: matrixRow,
        column,
        formula: `=IF($A${matrixRow}=${columnRef}$${matrixHeaderRow},"",ROUND(1/(1+10^((VLOOKUP(${columnRef}$${matrixHeaderRow},$A$${tableTop}:$C$${tableBottom},3,FALSE)-VLOOKUP($A${matrixRow},$A$${tableTop}:$C$${tableBottom},3,FALSE))/25)),2))`,
      });
    }
  }

  const clearRows = Math.max(sheet.getLastRow(), rows.length);
  sheet.getRange(1, 1, clearRows, Math.max(sheet.getLastColumn(), width)).clearContent();
  sheet.getRange(1, 1, rows.length, width).setValues(rows);
  formulas.forEach(item => sheet.getRange(item.row, item.column).setFormula(item.formula));
  boldRows.forEach(row => sheet.getRange(row, 1, 1, width).setFontWeight('bold'));
  sheet.getRange('A1').setFontSize(14);
  sheet.getRange(tableTop, 7, teamCount, 1).setNumberFormat('0.0%');
  sheet.getCharts().forEach(chart => sheet.removeChart(chart));
  const chartTop = matrixTop + teamCount + 2;
  const headerRowIndex = tableTop - 1;
  [
    {type: Charts.ChartType.BAR, columns: [1, 7], title: 'Championship Odds', row: chartTop, column: 1},
    {type: Charts.ChartType.COLUMN, columns: [1, 4, 5], title: 'Expected Vs Actual Wins', row: chartTop, column: 7},
  ].forEach(spec => {
    const builder = sheet.newChart().setChartType(spec.type);
    spec.columns.forEach(column => builder.addRange(sheet.getRange(headerRowIndex, column, teamCount + 1, 1)));
    builder
      .setPosition(spec.row, spec.column, 0, 0)
      .setOption('title', spec.title)
      .setOption('width', 520)
      .setOption('height', 320)
      .setNumHeaders(1);
    sheet.insertChart(builder.build());
  });
  return sheet;
}

function readForecastInputs_(sheet) {
  const inputs = {games: 14, teams: {}};
  if (sheet.getRange('A5').getDisplayValue() !== 'Fantasy Team') {
    return inputs;
  }
  const games = sheet.getRange('B3').getValue();
  if (typeof games === 'number' && games > 0) {
    inputs.games = games;
  }
  const block = sheet.getRange(6, 1, 12, 5).getValues();
  for (const [team, , rating, , actualWins] of block) {
    if (team === '') {
      break;
    }
    inputs.teams[String(team)] = {rating, actualWins};
  }
  return inputs;
}

// Row offsets of the Season Forecast layout for a given team count. Must stay in
// step with buildSeasonForecast_, which writes the layout these offsets describe.
function forecastLayout_(teamCount) {
  return {
    tableTop: 6,
    tableBottom: 5 + teamCount,
    matrixHeaderRow: 8 + teamCount,
    matrixTop: 9 + teamCount,
  };
}

function playerBioLinkParts_(spreadsheet) {
  const bios = findSheetByNames_(spreadsheet, NAMED_SHEETS.playerBios);
  if (!bios) {
    return null;
  }
  return {gid: bios.getSheetId(), nameColumn: `${quoteSheetName_(bios.getName())}!$A:$A`};
}

function bioLinkFormulaForName_(bioParts, name) {
  const literal = `"${String(name).replace(/"/g, '""')}"`;
  return `=IFERROR(HYPERLINK("#gid=${bioParts.gid}&range=A"&MATCH(${literal},${bioParts.nameColumn},0),${literal}),${literal})`;
}

function linkPlayerNamesToBios() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const bioParts = playerBioLinkParts_(spreadsheet);
  if (!bioParts) {
    SpreadsheetApp.getUi().alert('Player-Bios sheet not found; nothing to link.');
    return;
  }
  const targets = [];
  const bigBoard = findSheetByNames_(spreadsheet, NAMED_SHEETS.bigBoard);
  if (bigBoard) {
    targets.push({sheet: bigBoard, column: 2, firstRow: 2, rows: 423});
  }
  const tracker = findSheetById_(spreadsheet, DRAFT_LIVE_CONFIG.trackerSheetId);
  if (tracker && tracker.getRange(1, TRACKER_COLUMNS.player).getDisplayValue() === 'Player') {
    targets.push({sheet: tracker, column: TRACKER_COLUMNS.player, firstRow: DRAFT_LIVE_CONFIG.firstDataRow, rows: DRAFT_LIVE_CONFIG.totalPicks});
  }
  let converted = 0;
  targets.forEach(target => {
    const range = target.sheet.getRange(target.firstRow, target.column, target.rows, 1);
    const values = range.getValues();
    const formulas = range.getFormulas();
    const next = values.map((rowValues, index) => {
      const existing = formulas[index][0];
      if (existing !== '') {
        return [existing];
      }
      const name = rowValues[0];
      if (name === '' || name === null || name === undefined) {
        return [''];
      }
      converted += 1;
      return [bioLinkFormulaForName_(bioParts, name)];
    });
    range.setFormulas(next);
  });
  const message = `LINKS: ${converted} player name${converted === 1 ? '' : 's'} now open Player-Bios when clicked; linked and formula cells left untouched.`;
  appendUpdateLog_(new Date(), 'PASS', getCurrentPickCount_(spreadsheet), 0, 0, message, 'player-links', getCurrentSnapshotHash_(spreadsheet));
  spreadsheet.toast(message, 'Draft War Room', 8);
}

function buildRecommendations() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  buildRecommendations_(spreadsheet);
  const message = 'RECOMMEND: Recommendations rebuilt; every list reranks live as results and ratings change.';
  appendUpdateLog_(new Date(), 'PASS', getCurrentPickCount_(spreadsheet), 0, 0, message, 'recommendations', getCurrentSnapshotHash_(spreadsheet));
  spreadsheet.toast(message, 'Draft War Room', 8);
}

function buildRecommendations_(spreadsheet) {
  let sheet = findSheetByNames_(spreadsheet, NAMED_SHEETS.recommendations);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(NAMED_SHEETS.recommendations[0]);
  }
  const width = 5;
  const rows = [];
  const formulas = [];
  const boldRows = [];
  const formats = [];
  const pushRow = values => {
    rows.push(values.concat(Array.from({length: width - values.length}, () => '')));
    return rows.length;
  };
  const pushSection = values => {
    const row = pushRow(values);
    boldRows.push(row);
    return row;
  };
  const reserve = count => {
    for (let filler = 0; filler < count; filler += 1) {
      pushRow([]);
    }
  };

  const bigBoard = findSheetByNames_(spreadsheet, NAMED_SHEETS.bigBoard);
  const bioParts = playerBioLinkParts_(spreadsheet);

  pushSection(['RECOMMENDATIONS']);
  pushRow(['Live recommendation options; every list reranks as results and ratings change.']);
  pushRow([]);

  let stealsHeaderRow = 0;
  if (bigBoard) {
    const board = quoteSheetName_(bigBoard.getName());
    const playerList = (count, condition, restColumns, sortColumn, ascending, emptyText) => {
      const nameExpr = `FILTER(${board}!B2:B424,${condition})`;
      const restExpr = `FILTER({${restColumns}},${condition})`;
      const sortExpr = `FILTER(${sortColumn},${condition})`;
      const order = ascending ? 'TRUE' : 'FALSE';
      const startRow = pushRow([]);
      reserve(count - 1);
      formulas.push({
        row: startRow,
        column: 1,
        formula: bioParts
          ? `=IFERROR(ARRAY_CONSTRAIN(ARRAYFORMULA(HYPERLINK("#gid=${bioParts.gid}&range=A"&IFNA(MATCH(SORT(${nameExpr},${sortExpr},${order}),${bioParts.nameColumn},0),1),SORT(${nameExpr},${sortExpr},${order}))),${count},1),"${emptyText}")`
          : `=IFERROR(ARRAY_CONSTRAIN(SORT(${nameExpr},${sortExpr},${order}),${count},1),"${emptyText}")`,
      });
      formulas.push({
        row: startRow,
        column: 2,
        formula: `=IFERROR(ARRAY_CONSTRAIN(SORT(${restExpr},${sortExpr},${order}),${count},${width - 1}),"")`,
      });
    };

    const undraftedCondition = `${board}!B2:B424<>"",${board}!Q2:Q424=""`;
    const draftedCondition = `${board}!Q2:Q424<>""`;
    const slide = `${board}!Q2:Q424-${board}!A2:A424`;

    pushSection(['Undrafted Free Agent Targets']);
    pushSection(['Player', 'Group', 'Board Rank', 'NFL Grade']);
    playerList(10, undraftedCondition, `${board}!E2:E424,${board}!A2:A424,${board}!C2:C424`, `${board}!C2:C424`, false, 'Everyone on the board was drafted.');
    pushRow([]);

    pushSection(['Best Value Picks (slid furthest past board rank)']);
    stealsHeaderRow = pushSection(['Player', 'Group', 'Board Rank', 'Actual Overall', 'Slide']);
    playerList(5, draftedCondition, `${board}!E2:E424,${board}!A2:A424,${board}!Q2:Q424,${slide}`, slide, false, 'No picks loaded yet.');
    pushRow([]);

    pushSection(['Biggest Reaches (taken furthest above board rank)']);
    pushSection(['Player', 'Group', 'Board Rank', 'Actual Overall', 'Slide']);
    playerList(5, draftedCondition, `${board}!E2:E424,${board}!A2:A424,${board}!Q2:Q424,${slide}`, slide, true, 'No picks loaded yet.');
    pushRow([]);
  } else {
    pushSection(['Draft Recommendations']);
    pushRow(['Big Board sheet not found; draft lists unavailable.']);
    pushRow([]);
  }

  const forecastSheet = findSheetByNames_(spreadsheet, NAMED_SHEETS.seasonForecast);
  const config = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.configSheetId, DRAFT_LIVE_CONFIG.configSheetLabel);
  const teamRows = config.getRange('F2:G13').getDisplayValues().filter(([team]) => team !== '');
  if (forecastSheet && teamRows.length >= 2) {
    const layout = forecastLayout_(teamRows.length);
    const forecastRef = quoteSheetName_(forecastSheet.getName());
    const oddsTable = `{${forecastRef}!A${layout.tableTop}:A${layout.tableBottom},${forecastRef}!G${layout.tableTop}:G${layout.tableBottom},${forecastRef}!H${layout.tableTop}:H${layout.tableBottom}}`;
    pushSection(['Title Contenders']);
    pushSection(['Fantasy Team', 'Champion %', 'Fair Decimal Odds']);
    const contendersRow = pushRow([]);
    reserve(2);
    formulas.push({row: contendersRow, column: 1, formula: `=IFERROR(ARRAY_CONSTRAIN(SORT(${oddsTable},2,FALSE),3,3),"Build the season forecast first.")`});
    formats.push({row: contendersRow, column: 2, numRows: 3, format: '0.0%'});
    pushRow([]);
    pushSection(['Dark Horse Value Plays (best payout outside the top three)']);
    pushSection(['Fantasy Team', 'Champion %', 'Fair Decimal Odds']);
    const darkRow = pushRow([]);
    reserve(2);
    formulas.push({row: darkRow, column: 1, formula: `=IFERROR(QUERY(SORT(${oddsTable},2,FALSE),"select * limit 3 offset 3"),"Not enough teams for dark horses.")`});
    formats.push({row: darkRow, column: 2, numRows: 3, format: '0.0%'});
    pushRow([]);
    pushSection(['Tightest Matchups (closest to a coin flip)']);
    pushSection(['Fantasy Team', 'Toughest Call Opponent', 'Win Probability']);
    const lastMatrixColumn = columnLetter_(teamRows.length + 1);
    teamRows.forEach(([team], index) => {
      const matrixRow = layout.matrixTop + index;
      const rowRange = `${forecastRef}!B${matrixRow}:${lastMatrixColumn}${matrixRow}`;
      const headerRange = `${forecastRef}!$B$${layout.matrixHeaderRow}:$${lastMatrixColumn}$${layout.matrixHeaderRow}`;
      const distance = `ARRAYFORMULA(ABS(IF(${rowRange}="",9,${rowRange})-0.5))`;
      // Both ranges are single-row, so the match index is a COLUMN offset: INDEX(range, 1, n).
      // INDEX(range, n) asks for row n of a one-row range and errors for every n above 1.
      const row = pushRow([team]);
      formulas.push({row, column: 2, formula: `=IFERROR(INDEX(${headerRange},1,MATCH(MIN(${distance}),${distance},0)),"")`});
      formulas.push({row, column: 3, formula: `=IFERROR(INDEX(${rowRange},1,MATCH(MIN(${distance}),${distance},0)),"")`});
      formats.push({row, column: 3, numRows: 1, format: '0.00'});
    });
  } else {
    pushSection(['Season Recommendations']);
    pushRow(['Build the season forecast (Draft War Room menu) to unlock title contenders, dark horses, and matchup calls.']);
  }

  const clearRows = Math.max(sheet.getLastRow(), rows.length);
  sheet.getRange(1, 1, clearRows, Math.max(sheet.getLastColumn(), width)).clearContent();
  sheet.getRange(1, 1, rows.length, width).setValues(rows);
  formulas.forEach(item => sheet.getRange(item.row, item.column).setFormula(item.formula));
  boldRows.forEach(row => sheet.getRange(row, 1, 1, width).setFontWeight('bold'));
  formats.forEach(item => sheet.getRange(item.row, item.column, item.numRows, 1).setNumberFormat(item.format));
  sheet.getRange('A1').setFontSize(14);
  sheet.getCharts().forEach(chart => sheet.removeChart(chart));
  if (bigBoard && stealsHeaderRow > 0) {
    const builder = sheet.newChart().setChartType(Charts.ChartType.BAR);
    builder.addRange(sheet.getRange(stealsHeaderRow, 1, 6, 1));
    builder.addRange(sheet.getRange(stealsHeaderRow, 5, 6, 1));
    builder
      .setPosition(rows.length + 2, 1, 0, 0)
      .setOption('title', 'Draft Value Board')
      .setOption('width', 520)
      .setOption('height', 320)
      .setNumHeaders(1);
    sheet.insertChart(builder.build());
  }
  return sheet;
}

// Fixed row anchors of the Draft Optimizer layout; the draft board grows below boardTop.
const DRAFT_OPTIMIZER_LAYOUT = Object.freeze({
  roundsRow: 3,
  onClockRow: 6,
  recommendedTop: 10,
  groupTop: 18,
  scarcityTop: 30,
  boardHeaderRow: 41,
  boardTop: 42,
  defaultRounds: 15,
  qualityGrade: 6.5,
});

function buildDraftOptimizer() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = buildDraftOptimizer_(spreadsheet);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Draft Optimizer needs the Big Board and at least two fantasy teams in _config!F2:G13.');
    return;
  }
  const message = 'OPTIMIZER: Draft Optimizer rebuilt; record each pick in the Player column and the recommendations rerank live.';
  appendUpdateLog_(new Date(), 'PASS', getCurrentPickCount_(spreadsheet), 0, 0, message, 'draft-optimizer', getCurrentSnapshotHash_(spreadsheet));
  spreadsheet.toast(message, 'Draft War Room', 8);
}

function buildDraftOptimizer_(spreadsheet) {
  const bigBoard = findSheetByNames_(spreadsheet, NAMED_SHEETS.bigBoard);
  const config = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.configSheetId, DRAFT_LIVE_CONFIG.configSheetLabel);
  const teams = config.getRange('F2:F13').getDisplayValues().flat().filter(team => team !== '');
  if (!bigBoard || teams.length < 2) {
    return null;
  }
  let sheet = findSheetByNames_(spreadsheet, NAMED_SHEETS.draftOptimizer);
  const preserved = sheet ? readOptimizerInputs_(sheet) : {rounds: DRAFT_OPTIMIZER_LAYOUT.defaultRounds, picks: {}};
  if (!sheet) {
    sheet = spreadsheet.insertSheet(NAMED_SHEETS.draftOptimizer[0]);
  }
  const layout = DRAFT_OPTIMIZER_LAYOUT;
  const rounds = preserved.rounds;
  const totalPicks = rounds * teams.length;
  const boardBottom = layout.boardTop + totalPicks - 1;
  const pickRange = `$A$${layout.boardTop}:$A$${boardBottom}`;
  const teamRange = `$C$${layout.boardTop}:$C$${boardBottom}`;
  const playerRange = `$D$${layout.boardTop}:$D$${boardBottom}`;
  const board = quoteSheetName_(bigBoard.getName());
  const bioParts = playerBioLinkParts_(spreadsheet);
  const availableCondition = `${board}!B2:B424<>"",ISNA(MATCH(${board}!B2:B424,${playerRange},0))`;
  const groups = POSITION_GROUPS.slice(1);

  const width = 4;
  const rows = [];
  const formulas = [];
  const boldRows = [];
  const pushRow = values => {
    rows.push(values.concat(Array.from({length: width - values.length}, () => '')));
    return rows.length;
  };
  const pushSection = values => {
    const row = pushRow(values);
    boldRows.push(row);
    return row;
  };

  pushSection(['DRAFT OPTIMIZER']);
  pushRow(['Record each fantasy pick in the Player column of the Draft Board; every recommendation reranks live. Edit Rounds and rebuild to resize the board.']);
  pushRow(['Rounds', preserved.rounds]);
  pushRow([]);
  pushSection(['On The Clock']);
  const onClockRow = pushRow([]);
  formulas.push({
    row: onClockRow,
    column: 1,
    formula: `=IFERROR("Pick "&INDEX(${pickRange},MATCH(TRUE,ARRAYFORMULA(${playerRange}=""),0))&" of ${totalPicks}: "&INDEX(${teamRange},MATCH(TRUE,ARRAYFORMULA(${playerRange}=""),0))&" is on the clock.","Draft complete.")`,
  });
  pushRow([]);
  pushSection(['Recommended Now (best available by NFL grade)']);
  pushSection(['Player', 'Group', 'Board Rank', 'NFL Grade']);
  const recommendedRow = pushRow([]);
  pushRow([]);
  pushRow([]);
  pushRow([]);
  pushRow([]);
  const nameExpr = `FILTER(${board}!B2:B424,${availableCondition})`;
  const sortExpr = `FILTER(${board}!C2:C424,${availableCondition})`;
  formulas.push({
    row: recommendedRow,
    column: 1,
    formula: bioParts
      ? `=IFERROR(ARRAY_CONSTRAIN(ARRAYFORMULA(HYPERLINK("#gid=${bioParts.gid}&range=A"&IFNA(MATCH(SORT(${nameExpr},${sortExpr},FALSE),${bioParts.nameColumn},0),1),SORT(${nameExpr},${sortExpr},FALSE))),5,1),"No players left.")`
      : `=IFERROR(ARRAY_CONSTRAIN(SORT(${nameExpr},${sortExpr},FALSE),5,1),"No players left.")`,
  });
  formulas.push({
    row: recommendedRow,
    column: 2,
    formula: `=IFERROR(ARRAY_CONSTRAIN(SORT(FILTER({${board}!E2:E424,${board}!A2:A424,${board}!C2:C424},${availableCondition}),${sortExpr},FALSE),5,3),"")`,
  });
  pushRow([]);
  pushSection(['Best Available By Group']);
  pushSection(['Group', 'Player', 'NFL Grade']);
  groups.forEach(group => {
    const groupCondition = `${board}!E2:E424="${group}",${availableCondition}`;
    const bestName = `INDEX(SORT(FILTER(${board}!B2:B424,${groupCondition}),FILTER(${board}!C2:C424,${groupCondition}),FALSE),1)`;
    const bestGrade = `INDEX(SORT(FILTER(${board}!C2:C424,${groupCondition}),FILTER(${board}!C2:C424,${groupCondition}),FALSE),1)`;
    const row = pushRow([group]);
    formulas.push({
      row,
      column: 2,
      formula: bioParts
        ? `=IFERROR(HYPERLINK("#gid=${bioParts.gid}&range=A"&IFNA(MATCH(${bestName},${bioParts.nameColumn},0),1),${bestName}),"None left")`
        : `=IFERROR(${bestName},"None left")`,
    });
    formulas.push({row, column: 3, formula: `=IFERROR(ROUND(${bestGrade},2),"")`});
  });
  pushRow([]);
  pushSection([`Remaining Quality By Group (NFL grade ${layout.qualityGrade} or better)`]);
  pushSection(['Group', 'Remaining']);
  groups.forEach(group => {
    const row = pushRow([group]);
    formulas.push({
      row,
      column: 2,
      formula: `=SUMPRODUCT((${board}!E2:E424="${group}")*(${board}!C2:C424>=${layout.qualityGrade})*N(ISNA(MATCH(${board}!B2:B424,${playerRange},0))))`,
    });
  });
  pushRow([]);
  pushSection(['Draft Board']);
  pushSection(['Pick', 'Round', 'Fantasy Team', 'Player']);
  // Picks are restored by round and team, not by pick ordinal: if the league size changes, a
  // given ordinal belongs to a different team, and ordinal-keyed restore would silently hand
  // every recorded player to the wrong roster.
  for (let round = 1; round <= rounds; round += 1) {
    const order = round % 2 === 1 ? teams : teams.slice().reverse();
    order.forEach((team, slot) => {
      const pick = (round - 1) * teams.length + slot + 1;
      const preservedPick = preserved.picks[optimizerPickKey_(round, team)];
      pushRow([pick, round, team, preservedPick === undefined ? '' : preservedPick]);
    });
  }

  const clearRows = Math.max(sheet.getLastRow(), rows.length);
  sheet.getRange(1, 1, clearRows, Math.max(sheet.getLastColumn(), width)).clearContent();
  sheet.getRange(1, 1, rows.length, width).setValues(rows);
  formulas.forEach(item => sheet.getRange(item.row, item.column).setFormula(item.formula));
  boldRows.forEach(row => sheet.getRange(row, 1, 1, width).setFontWeight('bold'));
  sheet.getRange('A1').setFontSize(14);
  sheet.getRange(layout.boardTop, 4, totalPicks, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(bigBoard.getRange('B2:B424'), true).setAllowInvalid(true).build()
  );
  return sheet;
}

function readOptimizerInputs_(sheet) {
  const layout = DRAFT_OPTIMIZER_LAYOUT;
  const inputs = {rounds: layout.defaultRounds, picks: {}};
  if (sheet.getRange(layout.boardHeaderRow, 1).getDisplayValue() !== 'Pick') {
    return inputs;
  }
  const rounds = sheet.getRange(layout.roundsRow, 2).getValue();
  if (typeof rounds === 'number' && rounds >= 1 && rounds <= 30) {
    inputs.rounds = Math.floor(rounds);
  }
  const lastRow = sheet.getLastRow();
  if (lastRow >= layout.boardTop) {
    sheet.getRange(layout.boardTop, 1, lastRow - layout.boardTop + 1, 4).getValues().forEach(([pick, round, team, player]) => {
      if (typeof pick === 'number' && player !== '' && team !== '') {
        inputs.picks[optimizerPickKey_(round, team)] = player;
      }
    });
  }
  return inputs;
}

const REPORT_BUILDER = Object.freeze({
  reportPrefix: 'Report - ',
  maxSections: 8,
  nameRow: 3,
  modeRow: 4,
  notesRow: 5,
  sectionHeaderRow: 8,
  sectionTop: 9,
  defaultTopN: 10,
  maxTopN: 30,
});

const REPORT_SECTION_TYPES = Object.freeze([
  'Draft Overview',
  'NFL Team Draft',
  'Position Group Board',
  'College Cohort',
  'Player Spotlight',
  'Value Board',
  'Fantasy Team Outlook',
  'Season Forecast Summary',
  'Fantasy Draft Board',
  'Custom Range',
]);

function openReportBuilder() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = openReportBuilder_(spreadsheet);
  spreadsheet.setActiveSheet(sheet);
  appendUpdateLog_(new Date(), 'PASS', getCurrentPickCount_(spreadsheet), 0, 0, 'BUILDER: Report Builder ready; compose sections, then run Generate report from builder.', 'report-builder', getCurrentSnapshotHash_(spreadsheet));
  spreadsheet.toast('Compose sections on Report Builder, then run Generate report from builder.', 'Draft War Room', 8);
}

function openReportBuilder_(spreadsheet) {
  let sheet = findSheetByNames_(spreadsheet, NAMED_SHEETS.reportBuilder);
  const preserved = sheet ? readReportBuilderInputs_(sheet) : emptyReportBuilderInputs_();
  if (!sheet) {
    sheet = spreadsheet.insertSheet(NAMED_SHEETS.reportBuilder[0]);
  }
  const layout = REPORT_BUILDER;
  const width = 5;
  const rows = [];
  const formulas = [];
  const boldRows = [];
  const pushRow = values => {
    rows.push(values.concat(Array.from({length: width - values.length}, () => '')));
    return rows.length;
  };
  const pushSection = values => {
    const row = pushRow(values);
    boldRows.push(row);
    return row;
  };

  pushSection(['REPORT BUILDER']);
  pushRow(['Pick section types below, set a focus where one is needed, then run Draft War Room, Generate report from builder. Nothing here changes any other tab.']);
  pushRow(['Report name', preserved.name]);
  pushRow(['Output mode', preserved.mode]);
  pushRow(['Notes', preserved.notes]);
  pushRow([]);
  pushSection(['Report Sections (generated top to bottom)']);
  pushSection(['Slot', 'Section Type', 'Focus', 'Top N', 'Hint']);
  for (let index = 0; index < layout.maxSections; index += 1) {
    const slot = preserved.slots[index];
    pushRow([
      index + 1,
      slot.type,
      slot.focus,
      slot.topN,
      index === 0 ? 'Focus examples: Las Vegas Raiders, QB, Ohio State, a player name, a fantasy team, Analytics!A4:I11' : '',
    ]);
  }
  pushRow([]);
  pushSection(['Focus Choices']);
  const choicesHeaderRow = pushSection(['NFL Teams', 'Position Groups', 'Fantasy Teams', 'Colleges']);
  const choicesTop = choicesHeaderRow + 1;
  pushRow([]);
  const nflInfo = findSheetByNames_(spreadsheet, NAMED_SHEETS.nflInfo);
  if (nflInfo) {
    formulas.push({row: choicesTop, column: 1, formula: `=IFERROR(FILTER(${quoteSheetName_(nflInfo.getName())}!B2:B33,${quoteSheetName_(nflInfo.getName())}!B2:B33<>""),"")`});
  }
  formulas.push({row: choicesTop, column: 2, formula: `={"${POSITION_GROUPS.slice(1).join('";"')}"}`});
  const configRef = quoteSheetName_(requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.configSheetId, DRAFT_LIVE_CONFIG.configSheetLabel).getName());
  formulas.push({row: choicesTop, column: 3, formula: `=IFERROR(FILTER(${configRef}!F2:F13,${configRef}!F2:F13<>""),"")`});
  const bigBoard = findSheetByNames_(spreadsheet, NAMED_SHEETS.bigBoard);
  if (bigBoard) {
    const board = quoteSheetName_(bigBoard.getName());
    formulas.push({row: choicesTop, column: 4, formula: `=IFERROR(SORT(UNIQUE(FILTER(${board}!F2:F424,${board}!F2:F424<>""))),"")`});
  }

  const clearRows = Math.max(sheet.getLastRow(), rows.length + 40);
  sheet.getRange(1, 1, clearRows, Math.max(sheet.getLastColumn(), width)).clearContent();
  sheet.getRange(1, 1, rows.length, width).setValues(rows);
  formulas.forEach(item => sheet.getRange(item.row, item.column).setFormula(item.formula));
  boldRows.forEach(row => sheet.getRange(row, 1, 1, width).setFontWeight('bold'));
  sheet.getRange('A1').setFontSize(14);
  sheet.getRange(layout.modeRow, 2).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Live', 'Frozen'], true).setAllowInvalid(false).build()
  );
  sheet.getRange(layout.sectionTop, 2, layout.maxSections, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(REPORT_SECTION_TYPES.slice(), true).setAllowInvalid(false).build()
  );
  return sheet;
}

function emptyReportBuilderInputs_() {
  const inputs = {name: '', mode: 'Live', notes: '', slots: []};
  for (let index = 0; index < REPORT_BUILDER.maxSections; index += 1) {
    inputs.slots.push({type: '', focus: '', topN: ''});
  }
  return inputs;
}

function readReportBuilderInputs_(sheet) {
  const layout = REPORT_BUILDER;
  const inputs = emptyReportBuilderInputs_();
  if (sheet.getRange(layout.sectionHeaderRow, 1).getDisplayValue() !== 'Slot') {
    return inputs;
  }
  inputs.name = sheet.getRange(layout.nameRow, 2).getDisplayValue().trim();
  const mode = sheet.getRange(layout.modeRow, 2).getDisplayValue().trim();
  inputs.mode = mode === 'Frozen' ? 'Frozen' : 'Live';
  inputs.notes = sheet.getRange(layout.notesRow, 2).getDisplayValue().trim();
  sheet.getRange(layout.sectionTop, 2, layout.maxSections, 3).getValues().forEach((row, index) => {
    inputs.slots[index] = {type: String(row[0]).trim(), focus: String(row[1]).trim(), topN: row[2]};
  });
  return inputs;
}

function generateReportFromBuilder() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const builder = findSheetByNames_(spreadsheet, NAMED_SHEETS.reportBuilder);
  if (!builder || builder.getRange(REPORT_BUILDER.sectionHeaderRow, 1).getDisplayValue() !== 'Slot') {
    SpreadsheetApp.getUi().alert('Run Open report builder first, then choose sections.');
    return;
  }
  const inputs = readReportBuilderInputs_(builder);
  const sections = inputs.slots.filter(slot => slot.type !== '');
  if (sections.length === 0) {
    SpreadsheetApp.getUi().alert('Choose at least one section type on Report Builder before generating.');
    return;
  }
  const reportName = sanitizeAnalysisName_(inputs.name) || 'Untitled Report';
  const content = buildReportContent_(spreadsheet, reportName, sections);
  const target = writeReport_(spreadsheet, reportName, inputs.mode, content);
  appendReportIndexRow_(spreadsheet, reportName, inputs.mode, inputs.notes, target);
  const message = `REPORT: ${inputs.mode === 'Frozen' ? 'frozen' : 'live'} report "${reportName}" generated with ${sections.length} section${sections.length === 1 ? '' : 's'} on ${target.getName()}.`;
  appendUpdateLog_(new Date(), 'PASS', getCurrentPickCount_(spreadsheet), 0, 0, message, 'report-builder', getCurrentSnapshotHash_(spreadsheet));
  spreadsheet.toast(message, 'Draft War Room', 8);
}

function buildReportContent_(spreadsheet, reportName, sections) {
  const width = 6;
  const rows = [];
  const formulas = [];
  const boldRows = [];
  const formats = [];
  const pushRow = values => {
    rows.push(values.concat(Array.from({length: width - values.length}, () => '')));
    return rows.length;
  };
  const pushSection = values => {
    const row = pushRow(values);
    boldRows.push(row);
    return row;
  };
  const pushFormula = (column, formula) => {
    const row = pushRow([]);
    formulas.push({row, column, formula});
    return row;
  };
  const reserve = count => {
    for (let filler = 0; filler < count; filler += 1) {
      pushRow([]);
    }
  };

  const bigBoard = findSheetByNames_(spreadsheet, NAMED_SHEETS.bigBoard);
  const board = bigBoard ? quoteSheetName_(bigBoard.getName()) : null;
  const bioParts = playerBioLinkParts_(spreadsheet);
  const playerColumn = actualsColumnRef_(spreadsheet, 'E');
  const overallColumn = actualsColumnRef_(spreadsheet, 'C');
  const teamColumn = actualsColumnRef_(spreadsheet, 'D');
  const roundColumn = actualsColumnRef_(spreadsheet, 'A');
  const pickColumn = actualsColumnRef_(spreadsheet, 'B');
  const updatesRef = quoteSheetName_(requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.statusSheetId, DRAFT_LIVE_CONFIG.statusSheetLabel).getName());
  const config = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.configSheetId, DRAFT_LIVE_CONFIG.configSheetLabel);
  const fantasyTeams = config.getRange('F2:F13').getDisplayValues().flat().filter(team => team !== '');
  const nflInfo = findSheetByNames_(spreadsheet, NAMED_SHEETS.nflInfo);
  const nflTeams = nflInfo ? nflInfo.getRange('B2:B33').getDisplayValues().flat().filter(team => team !== '') : [];
  const forecastSheet = findSheetByNames_(spreadsheet, NAMED_SHEETS.seasonForecast);
  const optimizerSheet = findSheetByNames_(spreadsheet, NAMED_SHEETS.draftOptimizer);
  const boardValues = bigBoard ? bigBoard.getRange('B2:F424').getDisplayValues() : [];
  const boardPlayers = boardValues.map(row => row[0]).filter(value => value !== '');
  const boardColleges = boardValues.map(row => row[4]).filter(value => value !== '');
  const linkName = expression => (bioParts
    ? `HYPERLINK("#gid=${bioParts.gid}&range=A"&IFNA(MATCH(${expression},${bioParts.nameColumn},0),1),${expression})`
    : expression);
  const resolveFocus = (focus, choices) => {
    const wanted = focus.toLowerCase();
    return choices.find(choice => choice.toLowerCase() === wanted) || null;
  };
  const warn = (section, focus) => {
    pushRow([`Focus "${focus}" was not found for ${section}. Check Focus Choices on Report Builder.`]);
    pushRow([]);
  };
  const topNOf = slot => (typeof slot.topN === 'number' && slot.topN >= 1
    ? Math.min(Math.floor(slot.topN), REPORT_BUILDER.maxTopN)
    : REPORT_BUILDER.defaultTopN);

  pushSection([reportName.toUpperCase()]);
  pushRow(['Generated by the Draft War Room report builder; see Analysis-Saved for the registry entry.']);
  pushRow([]);

  sections.forEach(slot => {
    const topN = topNOf(slot);
    switch (slot.type) {
      case 'Draft Overview': {
        pushSection(['Draft Overview']);
        pushFormula(1, `="Feed: "&${updatesRef}!B2`);
        pushFormula(1, `=COUNTA(${playerColumn})&" of ${DRAFT_LIVE_CONFIG.totalPicks} picks in"`);
        pushFormula(1, `=IFERROR(SPARKLINE(COUNTA(${playerColumn}),{"charttype","bar";"max",${DRAFT_LIVE_CONFIG.totalPicks};"color1","#1C2A39"}),"")`);
        pushFormula(1, `=IFERROR("Last: #"&INDEX(FILTER(${overallColumn},${playerColumn}<>""),COUNTA(${playerColumn}))&" "&INDEX(FILTER(${playerColumn},${playerColumn}<>""),COUNTA(${playerColumn}))&" ("&INDEX(FILTER(${teamColumn},${playerColumn}<>""),COUNTA(${playerColumn}))&")","Last: none yet")`);
        pushRow([]);
        break;
      }
      case 'NFL Team Draft': {
        const team = resolveFocus(slot.focus, nflTeams);
        pushSection([`NFL Team Draft: ${team || slot.focus}`]);
        if (!team) {
          warn(slot.type, slot.focus);
          break;
        }
        pushSection(['Overall', 'Player', 'Round', 'Pick', 'NFL Grade']);
        const condition = `${teamColumn}="${team.replace(/"/g, '""')}",${playerColumn}<>""`;
        const start = pushRow([]);
        reserve(14);
        formulas.push({row: start, column: 1, formula: `=IFERROR(ARRAY_CONSTRAIN(FILTER(${overallColumn},${condition}),15,1),"No picks recorded for this team yet.")`});
        formulas.push({row: start, column: 2, formula: `=IFERROR(ARRAY_CONSTRAIN(ARRAYFORMULA(${linkName(`FILTER(${playerColumn},${condition})`)}),15,1),"")`});
        formulas.push({row: start, column: 3, formula: `=IFERROR(ARRAY_CONSTRAIN(FILTER({${roundColumn},${pickColumn}},${condition}),15,2),"")`});
        if (board) {
          formulas.push({row: start, column: 5, formula: `=IFERROR(ARRAY_CONSTRAIN(ARRAYFORMULA(IFERROR(VLOOKUP(FILTER(${playerColumn},${condition}),{${board}!B2:B424,${board}!C2:C424},2,FALSE),"")),15,1),"")`});
        }
        pushRow([]);
        break;
      }
      case 'Position Group Board': {
        const group = resolveFocus(slot.focus, POSITION_GROUPS.slice(1));
        pushSection([`Position Group Board: ${group || slot.focus}`]);
        if (!group || !board) {
          warn(slot.type, slot.focus);
          break;
        }
        pushSection(['Player', 'Board Rank', 'NFL Grade', 'Actual Overall']);
        const condition = `${board}!E2:E424="${group}",${board}!B2:B424<>""`;
        const sortExpr = `FILTER(${board}!C2:C424,${condition})`;
        const start = pushRow([]);
        reserve(topN - 1);
        formulas.push({row: start, column: 1, formula: `=IFERROR(ARRAY_CONSTRAIN(ARRAYFORMULA(${linkName(`SORT(FILTER(${board}!B2:B424,${condition}),${sortExpr},FALSE)`)}),${topN},1),"No prospects in this group.")`});
        formulas.push({row: start, column: 2, formula: `=IFERROR(ARRAY_CONSTRAIN(SORT(FILTER({${board}!A2:A424,${board}!C2:C424,${board}!Q2:Q424},${condition}),${sortExpr},FALSE),${topN},3),"")`});
        pushRow([]);
        break;
      }
      case 'College Cohort': {
        const college = resolveFocus(slot.focus, boardColleges);
        pushSection([`College Cohort: ${college || slot.focus}`]);
        if (!college || !board) {
          warn(slot.type, slot.focus);
          break;
        }
        pushSection(['Player', 'Group', 'Board Rank', 'Actual Overall']);
        const condition = `${board}!F2:F424="${college.replace(/"/g, '""')}",${board}!B2:B424<>""`;
        const sortExpr = `FILTER(${board}!A2:A424,${condition})`;
        const start = pushRow([]);
        reserve(topN - 1);
        formulas.push({row: start, column: 1, formula: `=IFERROR(ARRAY_CONSTRAIN(ARRAYFORMULA(${linkName(`SORT(FILTER(${board}!B2:B424,${condition}),${sortExpr},TRUE)`)}),${topN},1),"No prospects from this school.")`});
        formulas.push({row: start, column: 2, formula: `=IFERROR(ARRAY_CONSTRAIN(SORT(FILTER({${board}!E2:E424,${board}!A2:A424,${board}!Q2:Q424},${condition}),${sortExpr},TRUE),${topN},3),"")`});
        pushRow([]);
        break;
      }
      case 'Player Spotlight': {
        const player = resolveFocus(slot.focus, boardPlayers);
        pushSection([`Player Spotlight: ${player || slot.focus}`]);
        if (!player || !board) {
          warn(slot.type, slot.focus);
          break;
        }
        const lookup = column => `IFERROR(VLOOKUP("${player.replace(/"/g, '""')}",{${board}!B2:B424,${board}!${column}2:${column}424},2,FALSE),"")`;
        const spotlight = [
          ['Board rank', 'A'], ['NFL grade', 'C'], ['Position', 'D'], ['Group', 'E'], ['College', 'F'], ['Actual overall', 'Q'],
        ];
        spotlight.forEach(([label, column]) => {
          const row = pushRow([label]);
          formulas.push({row, column: 2, formula: `=${lookup(column)}`});
        });
        if (bioParts) {
          pushFormula(1, `=HYPERLINK("#gid=${bioParts.gid}&range=A"&IFNA(MATCH("${player.replace(/"/g, '""')}",${bioParts.nameColumn},0),1),"Open full bio")`);
        }
        pushRow([]);
        break;
      }
      case 'Value Board': {
        pushSection(['Value Board']);
        if (!board) {
          warn(slot.type, slot.focus || 'Big Board');
          break;
        }
        const drafted = `${board}!Q2:Q424<>""`;
        const slide = `${board}!Q2:Q424-${board}!A2:A424`;
        [['Best Value Picks', 'FALSE'], ['Biggest Reaches', 'TRUE']].forEach(([label, ascending]) => {
          pushSection([label]);
          pushSection(['Player', 'Group', 'Board Rank', 'Actual Overall', 'Slide']);
          const start = pushRow([]);
          reserve(topN - 1);
          formulas.push({row: start, column: 1, formula: `=IFERROR(ARRAY_CONSTRAIN(ARRAYFORMULA(${linkName(`SORT(FILTER(${board}!B2:B424,${drafted}),FILTER(${slide},${drafted}),${ascending})`)}),${topN},1),"No picks loaded yet.")`});
          formulas.push({row: start, column: 2, formula: `=IFERROR(ARRAY_CONSTRAIN(SORT(FILTER({${board}!E2:E424,${board}!A2:A424,${board}!Q2:Q424,${slide}},${drafted}),FILTER(${slide},${drafted}),${ascending}),${topN},4),"")`});
          pushRow([]);
        });
        break;
      }
      case 'Fantasy Team Outlook': {
        const team = resolveFocus(slot.focus, fantasyTeams);
        pushSection([`Fantasy Team Outlook: ${team || slot.focus}`]);
        if (!team || !forecastSheet || fantasyTeams.length < 2) {
          warn(slot.type, slot.focus);
          break;
        }
        const layout = forecastLayout_(fantasyTeams.length);
        const forecastRef = quoteSheetName_(forecastSheet.getName());
        const tableRef = `${forecastRef}!$A$${layout.tableTop}:$I$${layout.tableBottom}`;
        const literal = `"${team.replace(/"/g, '""')}"`;
        [['Power rating', 3], ['Expected wins', 4], ['Actual wins', 5], ['Champion odds', 7], ['Fair decimal odds', 8]].forEach(([label, column]) => {
          const row = pushRow([label]);
          formulas.push({row, column: 2, formula: `=IFERROR(VLOOKUP(${literal},${tableRef},${column},FALSE),"")`});
          if (label === 'Champion odds') {
            formats.push({row, column: 2, numRows: 1, format: '0.0%'});
          }
        });
        const teamIndex = fantasyTeams.indexOf(team);
        const matrixRow = layout.matrixTop + teamIndex;
        const lastMatrixColumn = columnLetter_(fantasyTeams.length + 1);
        const rowRange = `${forecastRef}!B${matrixRow}:${lastMatrixColumn}${matrixRow}`;
        const headerRange = `${forecastRef}!$B$${layout.matrixHeaderRow}:$${lastMatrixColumn}$${layout.matrixHeaderRow}`;
        const distance = `ARRAYFORMULA(ABS(IF(${rowRange}="",9,${rowRange})-0.5))`;
        const tightRow = pushRow(['Tightest matchup']);
        formulas.push({row: tightRow, column: 2, formula: `=IFERROR(INDEX(${headerRange},1,MATCH(MIN(${distance}),${distance},0)),"")`});
        if (optimizerSheet) {
          const optimizerRef = quoteSheetName_(optimizerSheet.getName());
          const boardTop = DRAFT_OPTIMIZER_LAYOUT.boardTop;
          const picksRow = pushRow(['Drafted so far']);
          formulas.push({row: picksRow, column: 2, formula: `=IFERROR(TEXTJOIN(", ",TRUE,FILTER(${optimizerRef}!D${boardTop}:D,${optimizerRef}!C${boardTop}:C=${literal},${optimizerRef}!D${boardTop}:D<>"")),"None yet")`});
        }
        pushRow([]);
        break;
      }
      case 'Season Forecast Summary': {
        pushSection(['Season Forecast Summary']);
        if (!forecastSheet || fantasyTeams.length < 2) {
          warn(slot.type, slot.focus || 'Season Forecast');
          break;
        }
        const layout = forecastLayout_(fantasyTeams.length);
        const forecastRef = quoteSheetName_(forecastSheet.getName());
        pushSection(['Fantasy Team', 'Champion %', 'Fair Decimal Odds']);
        const count = Math.min(topN, fantasyTeams.length);
        const start = pushRow([]);
        reserve(count - 1);
        formulas.push({row: start, column: 1, formula: `=IFERROR(ARRAY_CONSTRAIN(SORT({${forecastRef}!A${layout.tableTop}:A${layout.tableBottom},${forecastRef}!G${layout.tableTop}:G${layout.tableBottom},${forecastRef}!H${layout.tableTop}:H${layout.tableBottom}},2,FALSE),${count},3),"Build the season forecast first.")`});
        formats.push({row: start, column: 2, numRows: count, format: '0.0%'});
        pushRow([]);
        break;
      }
      case 'Fantasy Draft Board': {
        pushSection(['Fantasy Draft Board']);
        if (!optimizerSheet) {
          warn(slot.type, slot.focus || 'Draft Optimizer');
          break;
        }
        const optimizerRef = quoteSheetName_(optimizerSheet.getName());
        const boardTop = DRAFT_OPTIMIZER_LAYOUT.boardTop;
        pushSection(['Pick', 'Round', 'Fantasy Team', 'Player']);
        const start = pushRow([]);
        reserve(29);
        formulas.push({row: start, column: 1, formula: `=IFERROR(ARRAY_CONSTRAIN(FILTER(${optimizerRef}!A${boardTop}:D,${optimizerRef}!D${boardTop}:D<>""),30,4),"No picks recorded yet.")`});
        pushRow([]);
        break;
      }
      case 'Custom Range': {
        pushSection([`Custom Range: ${slot.focus}`]);
        const bang = slot.focus.indexOf('!');
        const sourceSheetName = bang > 0 ? slot.focus.slice(0, bang).replace(/^'|'$/g, '') : '';
        const rangePart = bang > 0 ? slot.focus.slice(bang + 1) : '';
        const source = sourceSheetName === '' ? null : findSheetByNames_(spreadsheet, [sourceSheetName]);
        if (!source || !/^\$?[A-Za-z]{1,3}\$?\d+(:\$?[A-Za-z]{1,3}\$?\d+)?$/.test(rangePart)) {
          warn(slot.type, slot.focus);
          break;
        }
        const rangeRef = `${quoteSheetName_(source.getName())}!${rangePart}`;
        const start = pushRow([]);
        reserve(29);
        formulas.push({row: start, column: 1, formula: `=IFERROR(ARRAY_CONSTRAIN(ARRAYFORMULA({${rangeRef}}),30,${width}),"Range not found: ${rangeRef}")`});
        pushRow([]);
        break;
      }
      default: {
        pushSection([`Unknown section: ${slot.type}`]);
        pushRow(['Choose a listed section type on Report Builder.']);
        pushRow([]);
      }
    }
  });

  return {width, rows, formulas, boldRows, formats};
}

function writeReport_(spreadsheet, reportName, mode, content) {
  let sheet;
  if (mode === 'Frozen') {
    const baseName = ANALYSIS_SNAPSHOT.namePrefix + reportName;
    let targetName = baseName;
    let suffix = 2;
    while (spreadsheet.getSheets().some(candidate => candidate.getName() === targetName)) {
      targetName = `${baseName} (${suffix})`;
      suffix += 1;
    }
    sheet = spreadsheet.insertSheet(targetName);
  } else {
    const liveName = REPORT_BUILDER.reportPrefix + reportName;
    sheet = findSheetByNames_(spreadsheet, [liveName]) || spreadsheet.insertSheet(liveName);
  }
  const clearRows = Math.max(sheet.getLastRow(), content.rows.length);
  const clearTarget = sheet.getRange(1, 1, clearRows, Math.max(sheet.getLastColumn(), content.width));
  clearTarget.clearContent();
  clearTarget.clearFormat();
  sheet.getRange(1, 1, content.rows.length, content.width).setValues(content.rows);
  content.formulas.forEach(item => sheet.getRange(item.row, item.column).setFormula(item.formula));
  content.boldRows.forEach(row => sheet.getRange(row, 1, 1, content.width).setFontWeight('bold'));
  content.formats.forEach(item => sheet.getRange(item.row, item.column, item.numRows, 1).setNumberFormat(item.format));
  sheet.getRange('A1').setFontSize(14);
  if (mode === 'Frozen') {
    SpreadsheetApp.flush();
    const dataRange = sheet.getDataRange();
    dataRange.copyTo(dataRange, SpreadsheetApp.CopyPasteType.PASTE_VALUES, false);
    sheet.setTabColor(ANALYSIS_SNAPSHOT.tabColor);
  }
  return sheet;
}

function appendReportIndexRow_(spreadsheet, reportName, mode, notes, target) {
  const analysisSheet = requireSheet_(spreadsheet, DRAFT_LIVE_CONFIG.analysisSheetId, DRAFT_LIVE_CONFIG.analysisSheetLabel);
  ensureAnalysisSnapshotHeader_(analysisSheet);
  analysisSheet.appendRow([
    reportName,
    'Custom Report',
    '', '', '', '', '', '', '', '', '',
    String(notes || '').trim(),
    Session.getActiveUser().getEmail() || '',
    new Date(),
  ]);
  const indexRow = analysisSheet.getLastRow();
  analysisSheet.getRange(indexRow, 14).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  analysisSheet.getRange(indexRow, ANALYSIS_SNAPSHOT.snapshotColumn)
    .setFormula(`=HYPERLINK("#gid=${target.getSheetId()}","Open ${mode === 'Frozen' ? 'frozen' : 'live'} report")`);
  analysisSheet.getRange(indexRow, ANALYSIS_SNAPSHOT.picksAtSaveColumn).setValue(getCurrentPickCount_(spreadsheet));
}

function optimizerPickKey_(round, team) {
  return `${round}::${String(team).trim()}`;
}

function scheduledDraftRefresh() {
  refreshDraftSnapshot_({initiator: 'SCHEDULED', showToast: false});
}

function refreshDraftSnapshot_(options) {
  const started = Date.now();
  const now = new Date();
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    setLiveAttempt_(now);
    appendUpdateLog_(
      now,
      'SKIPPED',
      getCurrentPickCount_(spreadsheet),
      0,
      Date.now() - started,
      'Another refresh is already running.',
      DRAFT_LIVE_CONFIG.sourceUrl,
      getCurrentSnapshotHash_(spreadsheet)
    );
    return;
  }

  try {
    setLiveStatus_('REFRESHING', null, now);
    const snapshot = fetchOfficialDraftSnapshot_();
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const actualsSheet = ensureActualsSheet_(spreadsheet);
    const currentValues = actualsSheet
      .getRange(DRAFT_LIVE_CONFIG.firstDataRow, 1, DRAFT_LIVE_CONFIG.totalPicks, DRAFT_LIVE_CONFIG.liveColumns)
      .getValues();
    const currentPickCount = currentValues.filter(row => row[4] !== '').length;
    if (snapshot.rows.length < currentPickCount) {
      throw new Error(`Official snapshot regressed from ${currentPickCount} to ${snapshot.rows.length} picks.`);
    }

    const paddedRows = snapshot.rows.concat(
      Array.from({length: DRAFT_LIVE_CONFIG.totalPicks - snapshot.rows.length}, () => ['', '', '', '', ''])
    );
    const changedRows = countChangedRows_(currentValues, paddedRows);
    if (changedRows > 0) {
      actualsSheet
        .getRange(DRAFT_LIVE_CONFIG.firstDataRow, 1, DRAFT_LIVE_CONFIG.totalPicks, DRAFT_LIVE_CONFIG.liveColumns)
        .setValues(paddedRows);
    }

    PropertiesService.getScriptProperties().setProperty(DRAFT_LIVE_CONFIG.snapshotHashKey, snapshot.hash);
    const draftComplete = snapshot.rows.length >= DRAFT_LIVE_CONFIG.totalPicks;
    // COMPLETE is terminal: once the full class has landed, a later manual refresh must not
    // demote the feed back to LIVE, because only the now-removed poller ever wrote COMPLETE.
    setLiveStatus_(draftComplete ? 'COMPLETE' : 'LIVE', now, now);
    appendUpdateLog_(
      now,
      'SUCCESS',
      snapshot.rows.length,
      changedRows,
      Date.now() - started,
      `${options.initiator}: validated official snapshot.`,
      DRAFT_LIVE_CONFIG.sourceUrl,
      snapshot.hash
    );
    // Trigger bookkeeping is a side effect of a already-successful ingest. A ScriptApp failure
    // here must be logged, never rethrown, or a perfect refresh would be recorded as an ERROR
    // and the status cell left lying about data that actually landed.
    if (draftComplete) {
      try {
        recordDraftCompletion_(now);
        if (options.initiator === 'SCHEDULED') {
          removeDraftDayAutomation();
          appendUpdateLog_(
            now,
            'COMPLETE',
            snapshot.rows.length,
            0,
            Date.now() - started,
            'Draft complete: all picks loaded, scheduled updates removed automatically.',
            DRAFT_LIVE_CONFIG.sourceUrl,
            snapshot.hash
          );
        }
      } catch (completionError) {
        appendUpdateLog_(
          now,
          'CHECK',
          snapshot.rows.length,
          0,
          Date.now() - started,
          `Snapshot landed but completion bookkeeping failed: ${completionError.message}`,
          DRAFT_LIVE_CONFIG.sourceUrl,
          snapshot.hash
        );
      }
    }
    SpreadsheetApp.flush();
    if (options.showToast) {
      spreadsheet.toast(`${snapshot.rows.length} picks loaded, ${changedRows} rows changed.`, 'Draft War Room', 6);
    }
  } catch (error) {
    setLiveStatus_('ERROR', null, now);
    appendUpdateLog_(
      now,
      'ERROR',
      '',
      0,
      Date.now() - started,
      `${options.initiator}: ${error.message}`,
      DRAFT_LIVE_CONFIG.sourceUrl,
      PropertiesService.getScriptProperties().getProperty(DRAFT_LIVE_CONFIG.snapshotHashKey) || ''
    );
    if (options.showToast) {
      SpreadsheetApp.getActiveSpreadsheet().toast(error.message, 'Draft refresh failed', 10);
    }
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function fetchOfficialDraftSnapshot_() {
  const response = UrlFetchApp.fetch(DRAFT_LIVE_CONFIG.sourceUrl, {
    followRedirects: true,
    muteHttpExceptions: true,
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'Mozilla/5.0 (compatible; NFLDraftGoogleSheet/2026)',
    },
  });
  const statusCode = response.getResponseCode();
  if (statusCode !== 200) {
    throw new Error(`NFL source returned HTTP ${statusCode}.`);
  }

  const flightData = decodeNextFlightData_(response.getContentText());
  const profilesQuery = parseQueryState_(flightData, 'useFetchProspectsProfiles');
  const teamsQuery = parseQueryState_(flightData, 'useFetchExperienceTeams');
  const profiles = profilesQuery.state && profilesQuery.state.data && profilesQuery.state.data.profiles;
  if (!Array.isArray(profiles) || profiles.length < 250) {
    throw new Error('NFL source did not return a valid prospect pool.');
  }

  const rawTeamData = teamsQuery.state && teamsQuery.state.data;
  const teamRecords = Array.isArray(rawTeamData)
    ? rawTeamData
    : Array.isArray(rawTeamData && rawTeamData.teams)
      ? rawTeamData.teams
      : Object.values((rawTeamData && rawTeamData.teams) || rawTeamData || {});
  const teamsById = {};
  teamRecords.forEach(team => {
    if (team && team.id && team.teamType === 'TEAM') {
      teamsById[team.id] = team;
    }
  });
  // A shape change in the teams payload otherwise surfaces as a per-row "missing team" error
  // that reads like bad draft data. Name the real cause before validation obscures it.
  if (Object.keys(teamsById).length < 32) {
    throw new Error(`NFL teams payload resolved only ${Object.keys(teamsById).length} of 32 franchises; the source shape likely changed.`);
  }

  const drafted = profiles
    .filter(profile => Number.isInteger(profile.draftOverallPick) && profile.draftOverallPick > 0)
    .sort((left, right) => left.draftOverallPick - right.draftOverallPick)
    .map(profile => {
      const team = teamsById[profile.draftTeamId] || {};
      const person = profile.person || {};
      return [
        profile.draftRound,
        profile.draftPick,
        profile.draftOverallPick,
        team.fullName || '',
        person.displayName || '',
      ];
    });

  validateDraftRows_(drafted);
  const hash = digestHex_(JSON.stringify(drafted));
  return {rows: drafted, hash};
}

function decodeNextFlightData_(html) {
  const pattern = /<script[^>]*>\s*self\.__next_f\.push\(\[1,("(?:\\.|[^"\\])*")\]\)\s*<\/script>/g;
  const chunks = [];
  let match;
  while ((match = pattern.exec(html)) !== null) {
    chunks.push(JSON.parse(match[1]));
  }
  if (chunks.length === 0) {
    throw new Error('NFL source did not expose server-rendered draft data.');
  }
  return chunks.join('');
}

function parseQueryState_(flightData, queryName) {
  const queryIndex = flightData.indexOf(queryName);
  if (queryIndex < 0) {
    throw new Error(`NFL source is missing ${queryName}.`);
  }
  const start = flightData.lastIndexOf('{"state":', queryIndex);
  if (start < 0) {
    throw new Error(`NFL source has an unreadable ${queryName} payload.`);
  }
  return JSON.parse(extractBalancedObject_(flightData, start));
}

function extractBalancedObject_(text, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }
    if (character === '"') {
      inString = true;
    } else if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }
  throw new Error('NFL source contained an incomplete query payload.');
}

function validateDraftRows_(rows) {
  if (rows.length > DRAFT_LIVE_CONFIG.totalPicks) {
    throw new Error(`NFL source returned ${rows.length} picks, above the expected maximum.`);
  }
  const seen = new Set();
  rows.forEach((row, index) => {
    const [round, pick, overall, team, player] = row;
    if (!Number.isInteger(round) || round < 1 || round > 7) {
      throw new Error(`Invalid round at snapshot row ${index + 1}.`);
    }
    if (!Number.isInteger(pick) || pick < 1 || !Number.isInteger(overall) || overall < 1 || overall > DRAFT_LIVE_CONFIG.totalPicks) {
      throw new Error(`Invalid pick number at snapshot row ${index + 1}.`);
    }
    if (seen.has(overall)) {
      throw new Error(`Duplicate overall pick ${overall}.`);
    }
    if (!team || !player) {
      throw new Error(`Missing team or player at overall pick ${overall}.`);
    }
    seen.add(overall);
  });
}

function countChangedRows_(currentRows, nextRows) {
  return nextRows.reduce((count, row, index) => {
    return count + (JSON.stringify(row) === JSON.stringify(currentRows[index]) ? 0 : 1);
  }, 0);
}

function digestHex_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value)
    .map(byte => (byte + 256).toString(16).slice(-2))
    .join('');
}

function setLiveStatus_(status, successfulAt, attemptedAt) {
  const sheet = requireSheet_(SpreadsheetApp.getActiveSpreadsheet(), DRAFT_LIVE_CONFIG.statusSheetId, DRAFT_LIVE_CONFIG.statusSheetLabel);
  sheet.getRange('B2').setValue(status);
  if (successfulAt) {
    sheet.getRange('B3').setValue(successfulAt).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  }
  if (attemptedAt) {
    sheet.getRange('B4').setValue(attemptedAt).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  }
}

function setLiveAttempt_(attemptedAt) {
  requireSheet_(SpreadsheetApp.getActiveSpreadsheet(), DRAFT_LIVE_CONFIG.statusSheetId, DRAFT_LIVE_CONFIG.statusSheetLabel)
    .getRange('B4')
    .setValue(attemptedAt)
    .setNumberFormat('yyyy-mm-dd hh:mm:ss');
}

function ensureActualsSheet_(spreadsheet) {
  const existing = findSheetByNames_(spreadsheet, [DRAFT_LIVE_CONFIG.actualsSheetName]);
  if (existing) {
    // Size an existing sheet too: a manually shortened _actuals would otherwise make every
    // refresh and every menu action throw a range error.
    ensureRows_(existing, DRAFT_LIVE_CONFIG.firstDataRow + DRAFT_LIVE_CONFIG.totalPicks - 1);
    ensureColumns_(existing, DRAFT_LIVE_CONFIG.liveColumns);
    return existing;
  }
  const sheet = spreadsheet.insertSheet(DRAFT_LIVE_CONFIG.actualsSheetName);
  ensureRows_(sheet, DRAFT_LIVE_CONFIG.firstDataRow + DRAFT_LIVE_CONFIG.totalPicks - 1);
  sheet.getRange(1, 1, 1, DRAFT_LIVE_CONFIG.liveColumns)
    .setValues([['Round', 'Pick', 'Overall', 'Team', 'Player']])
    .setFontWeight('bold');
  return sheet;
}

function getActualRows_(spreadsheet) {
  const sheet = findSheetByNames_(spreadsheet, [DRAFT_LIVE_CONFIG.actualsSheetName]);
  if (!sheet) {
    return [];
  }
  return sheet
    .getRange(DRAFT_LIVE_CONFIG.firstDataRow, 1, DRAFT_LIVE_CONFIG.totalPicks, DRAFT_LIVE_CONFIG.liveColumns)
    .getValues()
    .filter(([, , , , player]) => player !== '');
}

function getCurrentPickCount_(spreadsheet) {
  return getActualRows_(spreadsheet).length;
}

function getCurrentSnapshotHash_(spreadsheet) {
  const storedHash = PropertiesService.getScriptProperties().getProperty(DRAFT_LIVE_CONFIG.snapshotHashKey);
  if (storedHash) {
    return storedHash;
  }
  return digestHex_(JSON.stringify(getActualRows_(spreadsheet)));
}

function appendUpdateLog_(timestamp, status, picks, changedRows, durationMs, message, source, hash) {
  const sheet = requireSheet_(SpreadsheetApp.getActiveSpreadsheet(), DRAFT_LIVE_CONFIG.logSheetId, DRAFT_LIVE_CONFIG.logSheetLabel);
  sheet.appendRow([timestamp, status, picks, changedRows, durationMs, message, source, hash]);
  sheet.getRange(sheet.getLastRow(), 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
}

function hasFormulaErrors_(sheet, a1Notations) {
  const errorPattern = /^#(REF!|DIV\/0!|NUM!|N\/A|VALUE!|NAME\?|ERROR!|NULL!)/;
  return sheet.getRangeList(a1Notations).getRanges().some(range => errorPattern.test(range.getDisplayValue()));
}

function scanWorkbookForErrors_(spreadsheet) {
  const errorPattern = /^#(REF!|DIV\/0!|NUM!|N\/A|VALUE!|NAME\?|ERROR!|NULL!)/;
  const found = [];
  spreadsheet.getSheets().forEach(sheet => {
    const values = sheet.getDataRange().getDisplayValues();
    values.forEach((rowValues, rowIndex) => {
      rowValues.forEach((value, columnIndex) => {
        if (errorPattern.test(value)) {
          found.push(`${sheet.getName()}!${columnLetter_(columnIndex + 1)}${rowIndex + 1}`);
        }
      });
    });
  });
  return found;
}

function boardByPositionState_(sheet) {
  const headerRow = findRowByFirstCell_(sheet, 'Board Rank', 12);
  if (headerRow === 0) {
    return 'unrecognized';
  }
  const header = sheet.getRange(headerRow, 1, 1, Math.max(sheet.getLastColumn(), 1)).getDisplayValues()[0];
  const projectionColumn = header.indexOf('Projection') + 1;
  if (projectionColumn === 0) {
    return 'unrecognized';
  }
  return /^https?:/.test(sheet.getRange(headerRow + 1, projectionColumn).getDisplayValue()) ? 'broken' : 'ok';
}

function tradeCurvePopulated_(sheet) {
  const headerRow = findRowByFirstCell_(sheet, 'Overall Pick', 16);
  if (headerRow === 0) {
    return false;
  }
  const gridRows = sheet.getMaxRows ? sheet.getMaxRows() : headerRow + DRAFT_LIVE_CONFIG.totalPicks;
  const available = Math.max(1, Math.min(DRAFT_LIVE_CONFIG.totalPicks, gridRows - headerRow));
  return sheet.getRange(headerRow + 1, 2, available, 1)
    .getDisplayValues()
    .flat()
    .some(value => value !== '');
}

function startHereStatusHealthy_(sheet) {
  const labels = sheet.getRange('A1:A20').getDisplayValues().flat();
  const row = labels.findIndex(label => label === 'Workbook status') + 1;
  if (row === 0) {
    return false;
  }
  const status = sheet.getRange(row, 2).getDisplayValue();
  return status === 'COMPLETE' || /picks loaded$/.test(status);
}

function buildDefaultPickValues_() {
  const tail = [];
  const tailCount = DRAFT_LIVE_CONFIG.totalPicks - JIMMY_JOHNSON_VALUES.length;
  for (let index = 0; index < tailCount; index += 1) {
    tail.push(Math.round((1.9 - index * (0.9 / Math.max(tailCount - 1, 1))) * 10) / 10);
  }
  return JIMMY_JOHNSON_VALUES.concat(tail);
}

function ensureRows_(sheet, rows) {
  if (!sheet.getMaxRows || !sheet.insertRowsAfter) {
    return;
  }
  const maxRows = sheet.getMaxRows();
  if (maxRows < rows) {
    sheet.insertRowsAfter(maxRows, rows - maxRows);
  }
}

function ensureColumns_(sheet, columns) {
  if (!sheet.getMaxColumns || !sheet.insertColumnsAfter) {
    return;
  }
  const maxColumns = sheet.getMaxColumns();
  if (maxColumns < columns) {
    sheet.insertColumnsAfter(maxColumns, columns - maxColumns);
  }
}

function findRowByFirstCell_(sheet, label, maxRows) {
  const gridRows = sheet.getMaxRows ? sheet.getMaxRows() : maxRows;
  const scanRows = Math.max(1, Math.min(maxRows, gridRows));
  const values = sheet.getRange(1, 1, scanRows, 1).getDisplayValues().flat();
  return values.findIndex(value => value === label) + 1;
}

function findSheetByNames_(spreadsheet, names) {
  const sheets = spreadsheet.getSheets();
  for (const name of names) {
    const exact = sheets.find(sheet => sheet.getName() === name);
    if (exact) {
      return exact;
    }
  }
  for (const name of names) {
    const relaxed = sheets.find(sheet => sheet.getName().toLowerCase() === name.toLowerCase());
    if (relaxed) {
      return relaxed;
    }
  }
  return null;
}

function quoteSheetName_(name) {
  return `'${name.replace(/'/g, "''")}'`;
}

function columnLetter_(column) {
  let letter = '';
  let remaining = column;
  while (remaining > 0) {
    const modulo = (remaining - 1) % 26;
    letter = String.fromCharCode(65 + modulo) + letter;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return letter;
}

function findSheetById_(spreadsheet, sheetId) {
  return spreadsheet.getSheets().find(candidate => candidate.getSheetId() === sheetId) || null;
}

function requireSheet_(spreadsheet, sheetId, sheetLabel) {
  const sheet = findSheetById_(spreadsheet, sheetId);
  if (!sheet) {
    throw new Error(`Missing required sheet: ${sheetLabel || sheetId}.`);
  }
  return sheet;
}
