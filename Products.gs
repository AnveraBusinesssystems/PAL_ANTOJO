function getProductRows_() {
  return rowsAsObjects_(getSheet_(PAL.SHEETS.PRODUCTS), getSheetSpecs_().PRODUCTS);
}

function getInventoryRows_() {
  return rowsAsObjects_(getSheet_(PAL.SHEETS.INVENTORY), getSheetSpecs_().INVENTORY);
}

function getCostModelRows_() {
  const sheet = getSheet_(PAL.SHEETS.COSTS);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 10, lastRow - 1, 7).getValues().map((row, index) => ({
    _row: index + 2,
    productId: String(row[0]),
    productName: String(row[1]),
    raw: Number(row[2]) || 0,
    label: Number(row[3]) || 0,
    bag: Number(row[4]) || 0,
    other: Number(row[5]) || 0,
    estimatedCost: Number(row[6]) || 0
  })).filter(row => row.productId);
}

function productDisplayName_(name, variation) {
  const base = cleanString_(name, 100);
  const flavor = cleanString_(variation, 100);
  return flavor ? base + ' — ' + flavor : base;
}

function getSellableProducts_() {
  const inventory = getInventoryRows_();
  const costs = getCostModelRows_();
  return getProductRows_().filter(row => String(row['Active / Inactive']).toLowerCase() === 'active').map(row => {
    const stock = inventory.find(item => String(item['Product ID']) === String(row['Product ID']));
    const cost = costs.find(item => item.productId === String(row['Product ID']));
    return {
      id: String(row['Product ID']),
      name: String(row['Product Name']),
      variation: String(row['Flavor / Variation'] || ''),
      displayName: productDisplayName_(row['Product Name'], row['Flavor / Variation']),
      packageSizeGrams: Number(row['Package Size (g)']) || 0,
      price: Number(row['Selling Price Per Bag']) || 0,
      available: stock ? Number(stock['Current Inventory']) || 0 : 0,
      estimatedCost: cost ? cost.estimatedCost : 0
    };
  });
}

function saveProduct(token, product) {
  requireSession_(token, 'owner');
  if (!product) throw new Error('Product details are required.');
  const sheet = getSheet_(PAL.SHEETS.PRODUCTS);
  const id = cleanString_(product.id, 50) || ('PROD-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  const name = cleanString_(product.name, 100);
  const variation = cleanString_(product.variation, 100);
  const packageSizeGrams = wholeNumber_(product.packageSizeGrams, 'Package size', false);
  const price = positiveNumber_(product.price, 'Selling price', true);
  const active = product.active === false ? 'Inactive' : 'Active';
  const notes = cleanString_(product.notes, 500);
  if (!name) throw new Error('Product name is required.');
  const row = findRowById_(sheet, id, 1);
  const values = [id, name, variation, price, active, notes, packageSizeGrams];
  if (row) sheet.getRange(row, 1, 1, values.length).setValues([values]);
  else sheet.appendRow(values);
  sheet.getRange(2, 4, Math.max(1, sheet.getLastRow() - 1), 1).setNumberFormat('$0.00');
  const displayName = productDisplayName_(name, variation);
  ensureInventoryProduct_(id, displayName);
  ensureCostModelProduct_(id, displayName);
  return { id: id, message: row ? 'Product updated.' : 'Product added.' };
}

function ensureInventoryProduct_(id, name) {
  const sheet = getSheet_(PAL.SHEETS.INVENTORY);
  const row = findRowById_(sheet, id, 1);
  if (row) {
    sheet.getRange(row, 2).setValue(name);
  } else {
    sheet.appendRow([id, name, 0, 0, '', '', 5, new Date()]);
  }
  applyInventoryFormulas_();
}

function ensureCostModelProduct_(id, name) {
  const sheet = getSheet_(PAL.SHEETS.COSTS);
  const models = getCostModelRows_();
  const existing = models.find(row => row.productId === id);
  if (existing) sheet.getRange(existing._row, 11).setValue(name);
  else sheet.getRange(Math.max(sheet.getLastRow() + 1, 2), 10, 1, 7).setValues([[id, name, 0, 0, 0, 0, '']]);
  applyCostFormulas_();
}

function syncProductReferenceNames_() {
  const products = getProductRows_();
  const inventorySheet = getSheet_(PAL.SHEETS.INVENTORY);
  const costSheet = getSheet_(PAL.SHEETS.COSTS);
  const costModels = getCostModelRows_();
  products.forEach(product => {
    const id = String(product['Product ID']);
    if (!id) return;
    const displayName = productDisplayName_(product['Product Name'], product['Flavor / Variation']);
    const inventoryRow = findRowById_(inventorySheet, id, 1);
    if (inventoryRow) inventorySheet.getRange(inventoryRow, 2).setValue(displayName);
    else inventorySheet.appendRow([id, displayName, 0, 0, '', '', 5, new Date()]);
    const costModel = costModels.find(row => row.productId === id);
    if (costModel) costSheet.getRange(costModel._row, 11).setValue(displayName);
    else costSheet.getRange(Math.max(costSheet.getLastRow() + 1, 2), 10, 1, 7).setValues([[id, displayName, 0, 0, 0, 0, '']]);
  });
}

function getAllProductsForOwner_(token) {
  requireSession_(token, 'owner');
  const inventory = getInventoryRows_();
  const costs = getCostModelRows_();
  return getProductRows_().map(row => {
    const stock = inventory.find(item => String(item['Product ID']) === String(row['Product ID'])) || {};
    const cost = costs.find(item => item.productId === String(row['Product ID'])) || {};
    return {
      id: String(row['Product ID']), name: String(row['Product Name']), variation: String(row['Flavor / Variation'] || ''),
      displayName: productDisplayName_(row['Product Name'], row['Flavor / Variation']),
      packageSizeGrams: Number(row['Package Size (g)']) || 0,
      price: Number(row['Selling Price Per Bag']) || 0, active: String(row['Active / Inactive']).toLowerCase() === 'active', notes: String(row.Notes || ''),
      starting: Number(stock['Opening Inventory']) || 0, produced: Number(stock['Produced Bags']) || 0,
      sold: Number(stock['Units Sold']) || 0, current: Number(stock['Current Inventory']) || 0,
      reorder: Number(stock['Reorder Level']) || 0, estimatedCost: Number(cost.estimatedCost) || 0,
      costParts: { raw: Number(cost.raw) || 0, label: Number(cost.label) || 0, bag: Number(cost.bag) || 0, other: Number(cost.other) || 0 }
    };
  });
}
