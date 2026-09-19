function applyInventoryFormulas_() {
  const sheet = getSheet_(PAL.SHEETS.INVENTORY);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  for (let row = 2; row <= lastRow; row++) {
    if (!sheet.getRange(row, 1).getValue()) continue;
    sheet.getRange(row, 4).setFormula('=IF(A' + row + '="","",SUMIFS(PRODUCTION!F:F,PRODUCTION!C:C,A' + row + ',PRODUCTION!I:I,"Completed"))');
    sheet.getRange(row, 5).setFormula('=IF(A' + row + '="","",SUMIFS(SALES!G:G,SALES!E:E,A' + row + ',SALES!S:S,"<>VOIDED",SALES!S:S,"<>SUPERSEDED"))');
    sheet.getRange(row, 6).setFormula('=IF(A' + row + '="","",C' + row + '+D' + row + '-E' + row + '+SUMIF(ADJUSTMENTS!E:E,A' + row + ',ADJUSTMENTS!G:G))');
  }
  sheet.getRange(2, 3, lastRow - 1, 5).setNumberFormat('0');
  const rules = [SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$F2<=$G2').setBackground('#f4cccc').setFontColor('#990000').setRanges([sheet.getRange(2, 1, lastRow - 1, 8)]).build()];
  sheet.setConditionalFormatRules(rules);
}

function updateInventory(token, productId, values) {
  requireSession_(token, 'owner');
  const sheet = getSheet_(PAL.SHEETS.INVENTORY);
  const row = findRowById_(sheet, cleanString_(productId, 50), 1);
  if (!row) throw new Error('Inventory record not found.');
  const starting = wholeNumber_(values.starting, 'Opening inventory', true);
  const reorder = wholeNumber_(values.reorder, 'Reorder level', true);
  const sold = Number(sheet.getRange(row, 5).getValue()) || 0;
  const produced = Number(sheet.getRange(row, 4).getValue()) || 0;
  const adjustmentRows = rowsAsObjects_(getSheet_(PAL.SHEETS.ADJUSTMENTS), getSheetSpecs_().ADJUSTMENTS);
  const adjustments = adjustmentRows.filter(item => String(item['Product ID']) === String(productId)).reduce((sum, item) => sum + (Number(item['Quantity Change']) || 0), 0);
  if (starting + produced - sold + adjustments < 0) throw new Error('That opening inventory would make current inventory negative.');
  sheet.getRange(row, 3).setValue(starting);
  sheet.getRange(row, 7, 1, 2).setValues([[reorder, new Date()]]);
  applyInventoryFormulas_();
  SpreadsheetApp.flush();
  return true;
}

function getAvailableInventoryMap_() {
  SpreadsheetApp.flush();
  const map = {};
  getInventoryRows_().forEach(row => map[String(row['Product ID'])] = Number(row['Current Inventory']) || 0);
  return map;
}

function recordStockAdjustment(token, request) {
  const session = requireSession_(token);
  if (!request) throw new Error('Adjustment details are required.');
  const productId = cleanString_(request.productId, 50);
  const seller = cleanString_(request.seller, 60);
  const reason = cleanString_(request.reason, 40);
  const notes = cleanString_(request.notes, 300);
  const quantity = wholeNumber_(request.quantity, 'Quantity', false);
  const sellerReasons = ['Sample', 'Personal use', 'Damaged'];
  const ownerReasons = sellerReasons.concat(['Restock', 'Inventory correction']);
  const allowed = session.role === 'owner' ? ownerReasons : sellerReasons;
  if (allowed.indexOf(reason) < 0) throw new Error('Select a valid adjustment reason.');
  if (session.role === 'seller' && getSettingList_('SELLER_NAME').indexOf(seller) < 0) throw new Error('Select your seller name.');
  const products = getSellableProducts_();
  const product = products.find(item => item.id === productId);
  if (!product) throw new Error('Product not found or inactive.');
  const positive = reason === 'Restock';
  const delta = positive ? quantity : -quantity;
  if (delta < 0 && quantity > product.available) throw new Error(product.name + ' has only ' + product.available + ' bag(s) available.');
  const now = new Date();
  const zone = Session.getScriptTimeZone();
  const id = 'ADJ-' + Utilities.formatDate(now, zone, 'yyyyMMdd-HHmmss') + '-' + Utilities.getUuid().slice(0, 4).toUpperCase();
  getSheet_(PAL.SHEETS.ADJUSTMENTS).appendRow([
    id, Utilities.formatDate(now, zone, 'yyyy-MM-dd'), Utilities.formatDate(now, zone, 'HH:mm:ss'),
    seller || 'Owner', product.id, product.displayName, delta, reason, notes
  ]);
  applyInventoryFormulas_();
  SpreadsheetApp.flush();
  return { adjustmentId: id, quantityChange: delta, product: product.displayName };
}

function getRecentAdjustments(token) {
  requireSession_(token);
  const rows = rowsAsObjects_(getSheet_(PAL.SHEETS.ADJUSTMENTS), getSheetSpecs_().ADJUSTMENTS);
  return rows.slice(-30).reverse().map(row => ({
    id: String(row['Adjustment ID']), date: jsonDate_(row.Date), time: String(row.Time), seller: String(row.Seller),
    product: String(row['Product Name']), quantity: Number(row['Quantity Change']) || 0,
    reason: String(row.Reason), notes: String(row.Notes || '')
  }));
}
