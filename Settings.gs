function seedSettings_() {
  const sheet = getSheet_(PAL.SHEETS.SETTINGS);
  for (let row = sheet.getLastRow(); row >= 2; row--) {
    if (String(sheet.getRange(row, 1).getValue()).trim() === 'BAG_WEIGHT_GRAMS') sheet.deleteRow(row);
  }
  const defaults = [
    ['BUSINESS_NAME', 'PAL ANTOJO', 'Text'],
    ['CURRENCY', '$', 'Currency symbol'],
    ['DISCOUNT_TIER_1_QUANTITY', 4, 'Whole number'],
    ['DISCOUNT_TIER_1_PERCENT', 0.10, 'Decimal / percent'],
    ['DISCOUNT_TIER_2_QUANTITY', 6, 'Whole number'],
    ['DISCOUNT_TIER_2_PERCENT', 0.15, 'Decimal / percent'],
    ['SELLER_NAME', 'Seller 1', 'Repeat this setting for more sellers'],
    ['PAYMENT_METHOD', 'Cash', 'Repeat this setting for more methods'],
    ['PAYMENT_METHOD', 'Zelle', 'Repeat this setting for more methods'],
    ['PAYMENT_METHOD', 'Cash App', 'Repeat this setting for more methods'],
  ];
  const rows = rowsAsObjects_(sheet, getSheetSpecs_().SETTINGS);
  defaults.forEach(row => {
    const repeatable = row[0] === 'PAYMENT_METHOD' || row[0] === 'SELLER_NAME';
    const exists = rows.some(existing => String(existing.Setting) === row[0] && (!repeatable || String(existing.Value) === String(row[1])));
    if (!exists) sheet.appendRow(row);
  });
  sheet.getRange('B4:B7').setNumberFormat('0%');
}

function getSettingsRows_() {
  return rowsAsObjects_(getSheet_(PAL.SHEETS.SETTINGS), getSheetSpecs_().SETTINGS);
}

function getSetting_(key, fallback) {
  const row = getSettingsRows_().find(item => String(item.Setting).trim() === key);
  return row && row.Value !== '' ? row.Value : fallback;
}

function getSettingList_(key) {
  return getSettingsRows_().filter(item => String(item.Setting).trim() === key && item.Value !== '').map(item => String(item.Value));
}

function getPublicSettings_() {
  const configuredPayments = getSettingList_('PAYMENT_METHOD');
  const checkoutPayments = ['Cash', 'Zelle', 'Cash App'].filter(method => configuredPayments.indexOf(method) >= 0);
  return {
    businessName: String(getSetting_('BUSINESS_NAME', 'PAL ANTOJO')),
    currency: String(getSetting_('CURRENCY', '$')),
    sellers: getSettingList_('SELLER_NAME'),
    paymentMethods: checkoutPayments.length ? checkoutPayments : ['Cash', 'Zelle', 'Cash App'],
    discounts: getDiscountSettings_()
  };
}

function getDiscountSettings_() {
  const tier1Quantity = Number(getSetting_('DISCOUNT_TIER_1_QUANTITY', 4));
  const tier2Quantity = Number(getSetting_('DISCOUNT_TIER_2_QUANTITY', 6));
  const tier1Percent = Number(getSetting_('DISCOUNT_TIER_1_PERCENT', 0.10));
  const tier2Percent = Number(getSetting_('DISCOUNT_TIER_2_PERCENT', 0.15));
  if (!(tier1Quantity > 0 && tier2Quantity > tier1Quantity && tier1Percent >= 0 && tier2Percent >= tier1Percent && tier2Percent < 1)) {
    throw new Error('Discount settings are invalid. Check the SETTINGS tab.');
  }
  return { tier1Quantity, tier1Percent, tier2Quantity, tier2Percent };
}

function calculateDiscount_(quantity, settings) {
  const rules = settings || getDiscountSettings_();
  if (quantity >= rules.tier2Quantity) return rules.tier2Percent;
  if (quantity >= rules.tier1Quantity) return rules.tier1Percent;
  return 0;
}

function updateSettings(token, data) {
  requireSession_(token, 'owner');
  if (!data || !Array.isArray(data.sellers) || !Array.isArray(data.paymentMethods)) throw new Error('Invalid settings.');
  const scalarValues = {
    BUSINESS_NAME: cleanString_(data.businessName, 80),
    CURRENCY: cleanString_(data.currency, 5),
    DISCOUNT_TIER_1_QUANTITY: wholeNumber_(data.tier1Quantity, 'Tier 1 quantity', false),
    DISCOUNT_TIER_1_PERCENT: positiveNumber_(data.tier1Percent, 'Tier 1 percent', true) / 100,
    DISCOUNT_TIER_2_QUANTITY: wholeNumber_(data.tier2Quantity, 'Tier 2 quantity', false),
    DISCOUNT_TIER_2_PERCENT: positiveNumber_(data.tier2Percent, 'Tier 2 percent', true) / 100
  };
  const sellers = data.sellers.map(value => cleanString_(value, 60)).filter(Boolean);
  const methods = data.paymentMethods.map(value => cleanString_(value, 40)).filter(Boolean);
  if (!scalarValues.BUSINESS_NAME || !scalarValues.CURRENCY || !sellers.length || !methods.length) throw new Error('Business name, currency, sellers, and payment methods are required.');
  if (scalarValues.DISCOUNT_TIER_2_QUANTITY <= scalarValues.DISCOUNT_TIER_1_QUANTITY || scalarValues.DISCOUNT_TIER_2_PERCENT < scalarValues.DISCOUNT_TIER_1_PERCENT || scalarValues.DISCOUNT_TIER_2_PERCENT >= 1) throw new Error('Discount tiers are invalid.');
  const sheet = getSheet_(PAL.SHEETS.SETTINGS);
  const rows = getSettingsRows_();
  Object.keys(scalarValues).forEach(key => {
    const row = rows.find(item => String(item.Setting) === key);
    if (row) sheet.getRange(row._row, 2).setValue(scalarValues[key]);
    else sheet.appendRow([key, scalarValues[key], '']);
  });
  for (let row = sheet.getLastRow(); row >= 2; row--) {
    const key = String(sheet.getRange(row, 1).getValue());
    if (key === 'SELLER_NAME' || key === 'PAYMENT_METHOD') sheet.deleteRow(row);
  }
  sellers.forEach(value => sheet.appendRow(['SELLER_NAME', value, 'Repeat this setting for more sellers']));
  methods.forEach(value => sheet.appendRow(['PAYMENT_METHOD', value, 'Repeat this setting for more methods']));
  return getPublicSettings_();
}
