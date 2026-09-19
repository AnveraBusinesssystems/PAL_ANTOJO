const PAL = Object.freeze({
  SPREADSHEET_ID: '1_hqL5CySfkqEr4mlZeKG3OBFIoJH4UBs_NUGKA4eXAI',
  SHEETS: Object.freeze({
    PRODUCTS: 'PRODUCTS',
    PRODUCTION: 'PRODUCTION',
    INVENTORY: 'INVENTORY',
    COSTS: 'COSTS',
    SALES: 'SALES',
    ADJUSTMENTS: 'ADJUSTMENTS',
    CASH_DRAWER: 'CASH_DRAWER',
    SETTINGS: 'SETTINGS'
  }),
  SESSION_SECONDS: 21600
});

function doGet() {
  return HtmlService.createTemplateFromFile('AppShell')
    .evaluate()
    .setTitle('PAL ANTOJO')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getLogoDataUrl_() {
  const fileId = PropertiesService.getScriptProperties().getProperty('LOGO_FILE_ID');
  if (!fileId) return '';
  try {
    const blob = DriveApp.getFileById(fileId).getBlob();
    return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (error) {
    console.error('Logo could not be loaded: ' + error.message);
    return '';
  }
}

function setPalAntojoLogoFileId(token, fileId) {
  requireSession_(token, 'owner');
  const id = cleanString_(fileId, 100);
  if (!id) throw new Error('A Google Drive logo file ID is required.');
  DriveApp.getFileById(id).getName();
  PropertiesService.getScriptProperties().setProperty('LOGO_FILE_ID', id);
  return true;
}

function getSpreadsheet_() {
  const configured = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return SpreadsheetApp.openById(configured || PAL.SPREADSHEET_ID);
}

function getSheet_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet: ' + name + '. Run setupPalAntojoSystem().');
  return sheet;
}

function cleanString_(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength || 500);
}

function positiveNumber_(value, label, allowZero) {
  const number = Number(value);
  if (!Number.isFinite(number) || (allowZero ? number < 0 : number <= 0)) {
    throw new Error(label + ' must be ' + (allowZero ? 'zero or greater.' : 'greater than zero.'));
  }
  return number;
}

function wholeNumber_(value, label, allowZero) {
  const number = positiveNumber_(value, label, allowZero);
  if (!Number.isInteger(number)) throw new Error(label + ' must be a whole number.');
  return number;
}

function rowsAsObjects_(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values.map((row, index) => {
    const object = { _row: index + 2 };
    headers.forEach((header, i) => object[header] = row[i]);
    return object;
  }).filter(object => headers.some(header => object[header] !== ''));
}

function findRowById_(sheet, id, idColumn) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const values = sheet.getRange(2, idColumn || 1, lastRow - 1, 1).getDisplayValues();
  const target = String(id);
  const index = values.findIndex(row => row[0] === target);
  return index < 0 ? 0 : index + 2;
}

function jsonDate_(value) {
  if (!(value instanceof Date)) return value || '';
  return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function setupPalAntojoSystem() {
  const ss = getSpreadsheet_();
  const specs = getSheetSpecs_();
  Object.keys(specs).forEach(name => initializeSheet_(ss, name, specs[name]));
  seedSettings_();
  ensurePinProperties_();
  applyInventoryFormulas_();
  applyCostFormulas_();
  SpreadsheetApp.flush();
  return 'PAL ANTOJO is ready. Open the web app deployment to sign in.';
}

function getSheetSpecs_() {
  return {
    PRODUCTS: ['Product ID', 'Product Name', 'Flavor / Variation', 'Selling Price Per Bag', 'Active / Inactive', 'Notes'],
    PRODUCTION: ['Batch ID', 'Date', 'Product ID', 'Product Name', 'Planned Bags', 'Completed Bags', 'Grams / Bag', 'Waste / Scrap (g)', 'Status', 'Produced By', 'Lot Number', 'Best By Date', 'Notes', 'Completed At'],
    INVENTORY: ['Product ID', 'Product Name', 'Opening Inventory', 'Produced Bags', 'Units Sold', 'Current Inventory', 'Reorder Level', 'Last Updated'],
    COSTS: ['Date', 'Cost Category', 'Product', 'Description', 'Total Cost', 'Quantity Associated', 'Cost Per Unit', 'Notes'],
    SALES: ['Sale ID', 'Date', 'Time', 'Seller', 'Product ID', 'Product Name', 'Quantity', 'Unit Price', 'Line Subtotal', 'Total Bags', 'Regular Subtotal', 'Discount %', 'Discount Amount', 'Final Total', 'Payment Method', 'Notes', 'Estimated Unit Cost', 'Estimated COGS', 'Status', 'Last Edited'],
    ADJUSTMENTS: ['Adjustment ID', 'Date', 'Time', 'Seller', 'Product ID', 'Product Name', 'Quantity Change', 'Reason', 'Notes'],
    CASH_DRAWER: ['Entry ID', 'Date', 'Time', 'Seller', 'Type', 'Amount', 'Reason', 'Notes', 'Created At'],
    SETTINGS: ['Setting', 'Value', 'Type / Notes']
  };
}

function initializeSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  const existing = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
  headers.forEach((header, index) => {
    if (!existing[index]) sheet.getRange(1, index + 1).setValue(header);
  });
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#0b3519').setFontColor('#fbf8ef').setFontWeight('bold');
  sheet.setFrozenRows(1);
  if (!sheet.getFilter() && sheet.getMaxRows() > 1) {
    sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 2), headers.length).createFilter();
  }
  sheet.autoResizeColumns(1, headers.length);
  if (name === PAL.SHEETS.COSTS) initializeCostModelSection_(sheet);
}

function initializeCostModelSection_(sheet) {
  const headers = ['Product ID', 'Product Name', 'Raw Product / Bag', 'Label / Bag', 'Plastic Bag / Bag', 'Other Packaging / Bag', 'Estimated Finished Bag Cost'];
  const range = sheet.getRange(1, 10, 1, headers.length);
  const current = range.getDisplayValues()[0];
  headers.forEach((header, i) => { if (!current[i]) sheet.getRange(1, 10 + i).setValue(header); });
  range.setBackground('#b84412').setFontColor('#ffffff').setFontWeight('bold');
}

function ensurePinProperties_() {
  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty('OWNER_PIN')) properties.setProperty('OWNER_PIN', '1301');
  if (!properties.getProperty('SELLER_PIN')) properties.setProperty('SELLER_PIN', '1982');
  if (!properties.getProperty('LOGO_FILE_ID')) properties.setProperty('LOGO_FILE_ID', '1rN9iBZCc6J8-ue5zqa3Cb2-BwY-lTeQ6');
}
