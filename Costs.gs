function applyCostFormulas_() {
  const sheet = getSheet_(PAL.SHEETS.COSTS);
  const lastRow = Math.max(sheet.getLastRow(), 2);
  for (let row = 2; row <= lastRow; row++) {
    if (sheet.getRange(row, 1).getValue()) sheet.getRange(row, 7).setFormula('=IF(OR(E' + row + '="",F' + row + '="",F' + row + '=0),"",E' + row + '/F' + row + ')');
    if (sheet.getRange(row, 10).getValue()) sheet.getRange(row, 16).setFormula('=IF(J' + row + '="","",SUM(L' + row + ':O' + row + '))');
  }
  if (lastRow >= 2) {
    sheet.getRange(2, 5, lastRow - 1, 1).setNumberFormat('$0.00');
    sheet.getRange(2, 7, lastRow - 1, 1).setNumberFormat('$0.00');
    sheet.getRange(2, 12, lastRow - 1, 5).setNumberFormat('$0.00');
  }
}

function addCost(token, cost) {
  requireSession_(token, 'owner');
  const date = cost && cost.date ? new Date(cost.date + 'T12:00:00') : new Date();
  if (isNaN(date.getTime())) throw new Error('Invalid cost date.');
  const category = cleanString_(cost.category, 80);
  const product = cleanString_(cost.product, 100);
  const description = cleanString_(cost.description, 200);
  const total = positiveNumber_(cost.total, 'Total cost', true);
  const quantity = cost.quantity === '' || cost.quantity == null ? '' : positiveNumber_(cost.quantity, 'Quantity associated', false);
  const notes = cleanString_(cost.notes, 500);
  if (!category || !description) throw new Error('Cost category and description are required.');
  const sheet = getSheet_(PAL.SHEETS.COSTS);
  sheet.appendRow([date, category, product, description, total, quantity, '', notes]);
  applyCostFormulas_();
  return true;
}

function updateProductCost(token, productId, parts) {
  requireSession_(token, 'owner');
  const id = cleanString_(productId, 50);
  const product = getProductRows_().find(row => String(row['Product ID']) === id);
  if (!product) throw new Error('Product not found.');
  ensureCostModelProduct_(id, String(product['Product Name']));
  const model = getCostModelRows_().find(row => row.productId === id);
  const values = ['raw', 'label', 'bag', 'other'].map(key => positiveNumber_(parts[key], key + ' cost', true));
  getSheet_(PAL.SHEETS.COSTS).getRange(model._row, 12, 1, 4).setValues([values]);
  applyCostFormulas_();
  SpreadsheetApp.flush();
  return true;
}

function getCostsForOwner(token) {
  requireSession_(token, 'owner');
  return rowsAsObjects_(getSheet_(PAL.SHEETS.COSTS), getSheetSpecs_().COSTS).map(row => ({
    date: jsonDate_(row.Date), category: String(row['Cost Category'] || ''), product: String(row.Product || ''),
    description: String(row.Description || ''), total: Number(row['Total Cost']) || 0,
    quantity: row['Quantity Associated'] === '' ? '' : Number(row['Quantity Associated']), unitCost: Number(row['Cost Per Unit']) || 0,
    notes: String(row.Notes || '')
  })).reverse().slice(0, 200);
}
