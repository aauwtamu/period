/* tamuperiod. writer. Deploy as the owner; see README.md for Script Properties.
 * All app writes must use this deployment so the same ScriptLock covers them.
 * Never log e, payload, or Script Properties: they contain the shared secret.
 */
var BATHROOM_HEADERS = ['ID', 'Building', 'Room', 'Floor', 'Pads', 'Tampons', 'Liners', 'Other', 'Supplier', 'Socials', 'Needs Restock', 'Latitude', 'Longitude', 'Last Updated'];
var LOG_HEADERS = ['Timestamp', 'Bathroom ID', 'Item', 'Event', 'Request ID', 'Reason'];
var PRODUCT_COLUMNS = { pads: 'Pads', tampons: 'Tampons', liners: 'Liners', other: 'Other' };

function jsonResponse(result) {
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock;
  var acquired = false;
  try {
    var props = PropertiesService.getScriptProperties();
    var secret = props.getProperty('SHEETS_WRITER_SECRET');
    var spreadsheetId = props.getProperty('SPREADSHEET_ID');
    if (!secret || !spreadsheetId) return jsonResponse({ ok: false, code: 'CONFIG' });
    var contents = e && e.postData && e.postData.contents;
    if (!contents || contents.length > 4096) return jsonResponse({ ok: false, code: 'INVALID' });
    var input;
    try { input = JSON.parse(contents); } catch (_) { return jsonResponse({ ok: false, code: 'INVALID' }); }
    if (!input || input.secret !== secret) return jsonResponse({ ok: false, code: 'UNAUTHORIZED' });
    if (!validInput(input)) return jsonResponse({ ok: false, code: 'INVALID' });
    lock = LockService.getScriptLock();
    acquired = lock.tryLock(8000);
    if (!acquired) return jsonResponse({ ok: false, code: 'BUSY' });
    return jsonResponse(applyInventoryOperation(spreadsheetId, input));
  } catch (_) {
    // A transport failure after batchUpdate may have committed. Retry the same ID.
    return jsonResponse({ ok: false, code: 'UNKNOWN' });
  } finally {
    if (acquired) lock.releaseLock();
  }
}

function validInput(input) {
  if (typeof input.bathroomId !== 'string' || !input.bathroomId.trim() || input.bathroomId.length > 100) return false;
  if (typeof input.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) return false;
  return input.event === 'take' ? Object.prototype.hasOwnProperty.call(PRODUCT_COLUMNS, input.item) :
    input.event === 'report' && input.reason === 'restock';
}

function columnMap(headers) {
  var map = Object.create(null);
  headers.forEach(function (h, i) { map[String(h).trim()] = i; });
  return map;
}

function validBathroomRows(values) {
  var headers = values[0] || [];
  if (!BATHROOM_HEADERS.every(function (h) { return headers.filter(function (v) { return String(v).trim() === h; }).length === 1; })) return false;
  var map = columnMap(headers);
  var ids = Object.create(null);
  return values.slice(1).every(function (row) {
    if (!row.some(function (v, i) { return i !== map['Needs Restock'] && String(v).trim(); })) return true;
    var id = String(row[map.ID] || '').trim();
    if (!id || Object.prototype.hasOwnProperty.call(ids, id) || !row[map.Building] || !row[map.Room]) return false;
    ids[id] = true;
    var flag = String(row[map['Needs Restock']] || '').toLowerCase();
    if (['true', 'false', 'yes', 'no', ''].indexOf(flag) === -1) return false;
    return Object.keys(PRODUCT_COLUMNS).every(function (item) {
      var raw = row[map[PRODUCT_COLUMNS[item]]];
      return (typeof raw === 'number' || typeof raw === 'string') && String(raw).trim() !== '' && Number.isSafeInteger(Number(raw)) && Number(raw) >= 0;
    });
  });
}

function applyInventoryOperation(spreadsheetId, input) {
  var meta = Sheets.Spreadsheets.get(spreadsheetId, { fields: 'sheets.properties' });
  var bathroomSheet = meta.sheets.find(function (s) { return s.properties.title === 'Bathrooms'; });
  var logSheet = meta.sheets.find(function (s) { return s.properties.title === 'Log'; });
  if (!bathroomSheet || !logSheet) return { ok: false, code: 'CONFIG' };
  var data = Sheets.Spreadsheets.Values.batchGet(spreadsheetId, { ranges: ["'Bathrooms'!A:Z", "'Log'!A:F"] });
  var values = data.valueRanges[0].values || [];
  var log = data.valueRanges[1].values || [];
  if (!validBathroomRows(values) || JSON.stringify(log[0]) !== JSON.stringify(LOG_HEADERS)) return { ok: false, code: 'DATA' };
  var columns = columnMap(values[0]);
  var rowIndex = values.findIndex(function (row, i) { return i > 0 && String(row[columns.ID] || '').trim() === input.bathroomId; });
  if (rowIndex < 1) return { ok: false, code: 'NOT_FOUND' };
  var distributed = log.slice(1).filter(function (row) { return row[3] === 'take'; }).length;
  var prior = log.slice(1).find(function (row) { return row[4] === input.requestId; });
  function snapshot(applied) { return { ok: true, applied: applied, values: values, distributed: distributed, fetchedAt: Date.now() }; }
  if (prior) {
    if (prior[1] !== input.bathroomId || prior[3] !== input.event || (prior[2] || '') !== (input.item || '') || (prior[5] || '') !== (input.reason || '')) return { ok: false, code: 'INVALID' };
    return snapshot(false);
  }
  var row = values[rowIndex];
  var column;
  var next;
  if (input.event === 'take') {
    column = columns[PRODUCT_COLUMNS[input.item]];
    var count = Number(row[column]);
    if (count === 0) return { ok: false, code: 'EMPTY' };
    next = count - 1;
  } else {
    column = columns['Needs Restock'];
    if (['true', 'yes'].indexOf(String(row[column]).toLowerCase()) !== -1) return snapshot(false);
    next = true;
  }
  var timestamp = new Date().toISOString();
  function cell(value) {
    return { userEnteredValue: typeof value === 'number' ? { numberValue: value } : typeof value === 'boolean' ? { boolValue: value } : { stringValue: String(value) } };
  }
  function update(columnIndex, value) {
    return { updateCells: { start: { sheetId: bathroomSheet.properties.sheetId, rowIndex: rowIndex, columnIndex: columnIndex }, rows: [{ values: [cell(value)] }], fields: 'userEnteredValue' } };
  }
  Sheets.Spreadsheets.batchUpdate({ requests: [
    update(column, next),
    update(columns['Last Updated'], timestamp),
    { appendCells: { sheetId: logSheet.properties.sheetId, rows: [{ values: [timestamp, input.bathroomId, input.item || '', input.event, input.requestId, input.reason || ''].map(cell) }], fields: 'userEnteredValue' } },
  ] }, spreadsheetId);
  row[column] = next;
  row[columns['Last Updated']] = timestamp;
  if (input.event === 'take') distributed++;
  return snapshot(true);
}
