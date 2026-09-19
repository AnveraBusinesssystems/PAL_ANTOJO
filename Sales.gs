function recordSale(token, request) {
  const session = requireSession_(token);
  return writeSale_(session, request, '');
}

function updateSale(token, saleId, request) {
  const session = requireSession_(token);
  const id = cleanString_(saleId, 60);
  const activeRows = getSalesRows_().filter(row => String(row['Sale ID']) === id && isActiveSaleRow_(row));
  if (!activeRows.length) throw new Error('This transaction is no longer active.');
  assertSellerCanChangeSale_(session, activeRows);
  return writeSale_(session, request, id, activeRows);
}

function voidSale(token, saleId) {
  const session = requireSession_(token);
  const id = cleanString_(saleId, 60);
  const rows = getSalesRows_().filter(row => String(row['Sale ID']) === id && isActiveSaleRow_(row));
  if (!rows.length) throw new Error('This transaction is already voided or no longer exists.');
  assertSellerCanChangeSale_(session, rows);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_(PAL.SHEETS.SALES);
    rows.forEach(row => sheet.getRange(row._row, 19, 1, 2).setValues([['VOIDED', new Date()]]));
    applyInventoryFormulas_();
    SpreadsheetApp.flush();
    return { saleId: id, message: 'Transaction voided and inventory restored.' };
  } finally {
    lock.releaseLock();
  }
}

function writeSale_(session, request, existingSaleId, existingRows) {
  if (!request || !Array.isArray(request.items)) throw new Error('Sale items are required.');
  const seller = cleanString_(request.seller, 60);
  const paymentMethod = cleanString_(request.paymentMethod, 40);
  const notes = cleanString_(request.notes, 500);
  const allowedSellers = getSettingList_('SELLER_NAME');
  const allowedPayments = getPublicSettings_().paymentMethods;
  if (!seller || (session.role === 'seller' && allowedSellers.indexOf(seller) < 0)) throw new Error('Select a valid seller name.');
  if (!paymentMethod || allowedPayments.indexOf(paymentMethod) < 0) throw new Error('Select Cash, Zelle, or Cash App.');

  const requested = {};
  request.items.forEach(item => {
    const id = cleanString_(item.productId, 50);
    const quantity = wholeNumber_(item.quantity, 'Item quantity', false);
    requested[id] = (requested[id] || 0) + quantity;
  });
  const ids = Object.keys(requested);
  if (!ids.length) throw new Error('Add at least one bag to the sale.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const products = getSellableProducts_();
    const productMap = {};
    products.forEach(product => productMap[product.id] = product);
    const inventory = getAvailableInventoryMap_();
    const original = {};
    (existingRows || []).forEach(row => {
      const id = String(row['Product ID']);
      original[id] = (original[id] || 0) + (Number(row.Quantity) || 0);
    });
    const lineItems = ids.map(id => {
      const product = productMap[id];
      if (!product) throw new Error('A selected product is inactive or no longer available. Refresh and try again.');
      const usable = (inventory[id] || 0) + (original[id] || 0);
      if (requested[id] > usable) throw new Error(product.displayName + ' has only ' + usable + ' bag(s) available.');
      return {
        id: id,
        name: product.displayName,
        quantity: requested[id],
        price: product.price,
        estimatedCost: product.estimatedCost,
        packageSizeGrams: product.packageSizeGrams
      };
    });
    const totals = calculateSaleTotals_(lineItems);
    const now = new Date();
    const zone = Session.getScriptTimeZone();
    const saleId = existingSaleId || ('SALE-' + Utilities.formatDate(now, zone, 'yyyyMMdd-HHmmss') + '-' + Utilities.getUuid().slice(0, 4).toUpperCase());
    const rows = buildSaleRows_(saleId, now, zone, seller, paymentMethod, notes, lineItems, totals);
    const sheet = getSheet_(PAL.SHEETS.SALES);

    (existingRows || []).forEach(row => sheet.getRange(row._row, 19, 1, 2).setValues([['SUPERSEDED', now]]));
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    const start = sheet.getLastRow() - rows.length + 1;
    sheet.getRange(start, 8, rows.length, 2).setNumberFormat('$0.00');
    sheet.getRange(start, 11, rows.length, 1).setNumberFormat('$0.00');
    sheet.getRange(start, 12, rows.length, 1).setNumberFormat('0%');
    sheet.getRange(start, 13, rows.length, 2).setNumberFormat('$0.00');
    sheet.getRange(start, 17, rows.length, 2).setNumberFormat('$0.00');
    sheet.getRange(start, 21, rows.length, 1).setNumberFormat('0 "g"');
    applyInventoryFormulas_();
    SpreadsheetApp.flush();
    touchInventoryRows_(Object.keys(Object.assign({}, original, requested)));
    return {
      saleId: saleId, totalBags: totals.totalBags, subtotal: totals.subtotal,
      discountPercent: totals.discountPercent, discountAmount: totals.discountAmount,
      finalTotal: totals.finalTotal, updated: Boolean(existingSaleId)
    };
  } finally {
    lock.releaseLock();
  }
}

function buildSaleRows_(saleId, now, zone, seller, paymentMethod, notes, lineItems, totals) {
  return lineItems.map(item => [
    saleId, Utilities.formatDate(now, zone, 'yyyy-MM-dd'), Utilities.formatDate(now, zone, 'HH:mm:ss'), seller,
    item.id, item.name, item.quantity, item.price, roundMoney_(item.quantity * item.price), totals.totalBags, totals.subtotal,
    totals.discountPercent, totals.discountAmount, totals.finalTotal, paymentMethod, notes,
    item.estimatedCost, roundMoney_(item.estimatedCost * item.quantity), 'ACTIVE', now, item.packageSizeGrams
  ]);
}

function assertSellerCanChangeSale_(session, rows) {
  if (session.role === 'owner') return;
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  if (jsonDate_(rows[0].Date) !== today) throw new Error('Only the owner can change transactions from a previous day.');
}

function isActiveSaleRow_(row) {
  const status = String(row.Status || '').toUpperCase();
  return status !== 'VOIDED' && status !== 'SUPERSEDED';
}

function calculateSaleTotals_(lineItems, discountSettings) {
  const totalBags = lineItems.reduce((sum, item) => sum + Number(item.quantity), 0);
  const subtotal = roundMoney_(lineItems.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0));
  const discountPercent = calculateDiscount_(totalBags, discountSettings);
  const discountAmount = roundMoney_(subtotal * discountPercent);
  return {
    totalBags: totalBags,
    subtotal: subtotal,
    discountPercent: discountPercent,
    discountAmount: discountAmount,
    finalTotal: roundMoney_(subtotal - discountAmount)
  };
}

function roundMoney_(number) {
  return Math.round((Number(number) + Number.EPSILON) * 100) / 100;
}

function touchInventoryRows_(ids) {
  const sheet = getSheet_(PAL.SHEETS.INVENTORY);
  ids.forEach(id => {
    const row = findRowById_(sheet, id, 1);
    if (row) sheet.getRange(row, 8).setValue(new Date());
  });
}

function getSalesRows_() {
  return rowsAsObjects_(getSheet_(PAL.SHEETS.SALES), getSheetSpecs_().SALES);
}

function getRecentSellerSales(token) {
  requireSession_(token);
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const rows = getSalesRows_().filter(row => isActiveSaleRow_(row) && jsonDate_(row.Date) === today);
  const grouped = {};
  rows.forEach(row => {
    const id = String(row['Sale ID']);
    if (!grouped[id]) grouped[id] = {
      saleId: id, date: jsonDate_(row.Date), time: String(row.Time), seller: String(row.Seller),
      paymentMethod: String(row['Payment Method']), notes: String(row.Notes || ''),
      totalBags: Number(row['Total Bags']) || 0, subtotal: Number(row['Regular Subtotal']) || 0,
      discountPercent: Number(row['Discount %']) || 0, discountAmount: Number(row['Discount Amount']) || 0,
      finalTotal: Number(row['Final Total']) || 0, items: []
    };
    grouped[id].items.push({
      productId: String(row['Product ID']), product: String(row['Product Name']),
      quantity: Number(row.Quantity) || 0, unitPrice: Number(row['Unit Price']) || 0,
      packageSizeGrams: Number(row['Package Size (g)']) || 0
    });
  });
  return Object.keys(grouped).map(id => grouped[id]).reverse().slice(0, 100);
}

function filterSales_(filters) {
  const seller = cleanString_(filters && filters.seller, 60);
  const product = cleanString_(filters && filters.product, 100).toLowerCase();
  const from = cleanString_(filters && filters.from, 10);
  const to = cleanString_(filters && filters.to, 10);
  return getSalesRows_().filter(row => {
    const date = jsonDate_(row.Date);
    return isActiveSaleRow_(row) && (!seller || String(row.Seller) === seller) &&
      (!product || String(row['Product ID']).toLowerCase() === product || String(row['Product Name']).toLowerCase().indexOf(product) >= 0) &&
      (!from || date >= from) && (!to || date <= to);
  });
}

function getSalesForOwner(token, filters) {
  requireSession_(token, 'owner');
  return filterSales_(filters || {}).map(row => ({
    saleId: String(row['Sale ID']), date: jsonDate_(row.Date), time: String(row.Time), seller: String(row.Seller),
    productId: String(row['Product ID']), product: String(row['Product Name']), quantity: Number(row.Quantity) || 0,
    unitPrice: Number(row['Unit Price']) || 0, lineSubtotal: Number(row['Line Subtotal']) || 0,
    totalBags: Number(row['Total Bags']) || 0, subtotal: Number(row['Regular Subtotal']) || 0,
    discountPercent: Number(row['Discount %']) || 0, discountAmount: Number(row['Discount Amount']) || 0,
    finalTotal: Number(row['Final Total']) || 0, paymentMethod: String(row['Payment Method']), notes: String(row.Notes || ''),
    estimatedCogs: Number(row['Estimated COGS']) || 0,
    packageSizeGrams: Number(row['Package Size (g)']) || 0
  })).reverse().slice(0, 1000);
}

function getOwnerDashboardData_(token, filters) {
  requireSession_(token, 'owner');
  const products = getAllProductsForOwner_(token);
  const rows = filterSales_(filters || {});
  const uniqueSales = {};
  let unitsSold = 0;
  let cogs = 0;
  rows.forEach(row => {
    unitsSold += Number(row.Quantity) || 0;
    cogs += Number(row['Estimated COGS']) || 0;
    const id = String(row['Sale ID']);
    if (!uniqueSales[id]) uniqueSales[id] = {
      revenue: Number(row['Final Total']) || 0,
      discounts: Number(row['Discount Amount']) || 0
    };
  });
  const sales = Object.keys(uniqueSales).reduce((totals, id) => {
    totals.revenue += uniqueSales[id].revenue;
    totals.discounts += uniqueSales[id].discounts;
    return totals;
  }, { revenue: 0, discounts: 0 });
  return {
    metrics: {
      currentInventory: products.reduce((sum, product) => sum + product.current, 0),
      unitsSold: unitsSold,
      grossRevenue: roundMoney_(sales.revenue),
      discounts: roundMoney_(sales.discounts),
      cogs: roundMoney_(cogs),
      grossProfit: roundMoney_(sales.revenue - cogs)
    },
    products: products
  };
}
