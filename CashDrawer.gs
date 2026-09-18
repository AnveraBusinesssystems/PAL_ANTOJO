function getCashDrawer(token) {
  requireSession_(token);
  return getCashDrawerSnapshot_();
}

function setCashDrawerOpening(token, amount, seller) {
  const session = requireSession_(token);
  const value = roundMoney_(positiveNumber_(amount, 'Opening cash', true));
  const sellerName = validateCashDrawerSeller_(session, seller);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    appendCashDrawerEntry_('OPENING', value, sellerName, 'Opening cash', '');
    SpreadsheetApp.flush();
    return getCashDrawerSnapshot_();
  } finally {
    lock.releaseLock();
  }
}

function recordCashMovement(token, request) {
  const session = requireSession_(token);
  if (!request) throw new Error('Cash movement details are required.');
  const sellerName = validateCashDrawerSeller_(session, request.seller);
  const direction = cleanString_(request.direction, 10).toLowerCase();
  if (direction !== 'in' && direction !== 'out') throw new Error('Select cash in or cash out.');
  const amount = roundMoney_(positiveNumber_(request.amount, 'Amount', false));
  const reason = cleanString_(request.reason, 120);
  if (!reason) throw new Error('Add a reason for this cash movement.');
  const signedAmount = direction === 'out' ? -amount : amount;
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const drawer = getCashDrawerSnapshot_();
    if (drawer.expected + signedAmount < 0) throw new Error('Cash out exceeds the expected drawer balance.');
    appendCashDrawerEntry_(direction === 'out' ? 'CASH_OUT' : 'CASH_IN', signedAmount, sellerName, reason, '');
    SpreadsheetApp.flush();
    return getCashDrawerSnapshot_();
  } finally {
    lock.releaseLock();
  }
}

function recordCashCount(token, amount, seller) {
  const session = requireSession_(token);
  const counted = roundMoney_(positiveNumber_(amount, 'Cash count', true));
  const sellerName = validateCashDrawerSeller_(session, seller);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const drawer = getCashDrawerSnapshot_();
    const difference = roundMoney_(counted - drawer.expected);
    appendCashDrawerEntry_('COUNT', counted, sellerName, 'Drawer count', 'Difference: ' + difference.toFixed(2));
    SpreadsheetApp.flush();
    return getCashDrawerSnapshot_();
  } finally {
    lock.releaseLock();
  }
}

function getCashDrawerSnapshot_() {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const rows = rowsAsObjects_(getSheet_(PAL.SHEETS.CASH_DRAWER), getSheetSpecs_().CASH_DRAWER)
    .filter(row => jsonDate_(row.Date) === today);
  let opening = 0;
  let latestCount = null;
  let netMovements = 0;
  const activity = [];
  rows.forEach(row => {
    const type = String(row.Type || '').toUpperCase();
    const amount = Number(row.Amount) || 0;
    if (type === 'OPENING') opening = amount;
    if (type === 'CASH_IN' || type === 'CASH_OUT') {
      netMovements += amount;
      activity.push({
        id: String(row['Entry ID']), time: String(row.Time), seller: String(row.Seller),
        type: type, amount: amount, reason: String(row.Reason || '')
      });
    }
    if (type === 'COUNT') latestCount = {
      amount: amount, time: String(row.Time), seller: String(row.Seller), notes: String(row.Notes || '')
    };
  });
  const cashSales = getTodayCashSalesTotal_(today);
  const expected = roundMoney_(opening + cashSales + netMovements);
  return {
    date: today,
    opening: roundMoney_(opening),
    cashSales: cashSales,
    netMovements: roundMoney_(netMovements),
    expected: expected,
    latestCount: latestCount,
    activity: activity.slice(-50).reverse()
  };
}

function getTodayCashSalesTotal_(date) {
  const sales = {};
  getSalesRows_().forEach(row => {
    if (!isActiveSaleRow_(row) || jsonDate_(row.Date) !== date) return;
    if (String(row['Payment Method']).trim().toLowerCase() !== 'cash') return;
    const id = String(row['Sale ID']);
    if (!sales[id]) sales[id] = Number(row['Final Total']) || 0;
  });
  return roundMoney_(Object.keys(sales).reduce((total, id) => total + sales[id], 0));
}

function validateCashDrawerSeller_(session, seller) {
  if (session.role === 'owner') return cleanString_(seller, 60) || 'Owner';
  const sellerName = cleanString_(seller, 60);
  if (getSettingList_('SELLER_NAME').indexOf(sellerName) < 0) throw new Error('Select your seller name.');
  return sellerName;
}

function appendCashDrawerEntry_(type, amount, seller, reason, notes) {
  const now = new Date();
  const zone = Session.getScriptTimeZone();
  const id = 'CASH-' + Utilities.formatDate(now, zone, 'yyyyMMdd-HHmmss') + '-' + Utilities.getUuid().slice(0, 4).toUpperCase();
  const sheet = getSheet_(PAL.SHEETS.CASH_DRAWER);
  sheet.appendRow([
    id,
    Utilities.formatDate(now, zone, 'yyyy-MM-dd'),
    Utilities.formatDate(now, zone, 'HH:mm:ss'),
    seller,
    type,
    amount,
    reason,
    notes,
    now
  ]);
  sheet.getRange(sheet.getLastRow(), 6).setNumberFormat('$0.00');
  return id;
}
