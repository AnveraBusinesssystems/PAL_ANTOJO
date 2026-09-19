function runPalAntojoTests() {
  const standard = { tier1Quantity: 4, tier1Percent: 0.10, tier2Quantity: 6, tier2Percent: 0.15 };
  const cases = [[1, 0], [3, 0], [4, 0.10], [5, 0.10], [6, 0.15], [10, 0.15]];
  cases.forEach(test => {
    const quote = calculateSaleTotals_([{ quantity: test[0], price: 6 }], standard);
    assertEqual_(quote.discountPercent, test[1], test[0] + '-bag discount');
  });
  const mixedFour = calculateSaleTotals_([{ quantity: 2, price: 6 }, { quantity: 2, price: 6 }], standard);
  const mixedSix = calculateSaleTotals_([{ quantity: 2, price: 6 }, { quantity: 2, price: 6 }, { quantity: 2, price: 6 }], standard);
  assertEqual_(mixedFour.finalTotal, 21.60, 'mixed four-bag order');
  assertEqual_(mixedSix.finalTotal, 30.60, 'mixed six-bag order');
  assertEqual_(roundMoney_(30.60 - 6 * 2), 18.60, 'estimated profit');
  assertEqual_(roundMoney_(18 / 6), 3, 'cost per unit');
  assertEqual_(productDisplayName_('Jícama', 'Adobado'), 'Jícama — Adobado', 'product display name');
  assertEqual_(productDisplayName_('Taro', ''), 'Taro', 'product display name without variation');
  assertEqual_(isActiveSaleRow_({ Status: '' }), true, 'legacy sale remains active');
  assertEqual_(isActiveSaleRow_({ Status: 'ACTIVE' }), true, 'active sale status');
  assertEqual_(isActiveSaleRow_({ Status: 'VOIDED' }), false, 'voided sale status');
  assertEqual_(isActiveSaleRow_({ Status: 'SUPERSEDED' }), false, 'edited sale status');
  return [
    'PASS: discount boundaries (1, 3, 4, 5, 6, 10)',
    'PASS: mixed-product 4-bag and 6-bag totals',
    'PASS: cost-per-unit calculation',
    'PASS: estimated gross profit example',
    'PASS: product variation display names',
    'PASS: active, voided, and superseded transaction states',
    'Integration checks requiring sheet data are listed in README.md.'
  ].join('\n');
}

function assertEqual_(actual, expected, label) {
  if (actual !== expected) throw new Error('FAIL ' + label + ': expected ' + expected + ', got ' + actual);
}

function runLaunchReadinessCheck() {
  const blockers = [];
  const warnings = [];
  const passes = [];
  const products = getProductRows_();
  const productById = {};
  products.forEach(product => productById[String(product['Product ID'])] = product);

  if (!products.length) blockers.push('No products exist in PRODUCTS.');
  const missingSize = products.filter(product => !(Number(product['Package Size (g)']) > 0));
  if (missingSize.length) blockers.push(missingSize.length + ' product(s) are missing Package Size (g).');
  else passes.push('Every product has a package size.');
  const invalidPrice = products.filter(product => !(Number(product['Selling Price Per Bag']) >= 0));
  if (invalidPrice.length) blockers.push(invalidPrice.length + ' product(s) have an invalid selling price.');
  else passes.push('Every product has a valid selling price.');
  const activeProducts = products.filter(product => String(product['Active / Inactive']).toLowerCase() === 'active');
  if (!activeProducts.length) blockers.push('All products are inactive; seller checkout will be empty.');
  else passes.push(activeProducts.length + ' product(s) are active.');

  const production = rowsAsObjects_(getSheet_(PAL.SHEETS.PRODUCTION), getSheetSpecs_().PRODUCTION);
  const sizeMismatch = production.filter(batch => {
    const product = productById[String(batch['Product ID'])];
    return product && Number(batch['Grams / Bag']) > 0 && Number(batch['Grams / Bag']) !== Number(product['Package Size (g)']);
  });
  if (sizeMismatch.length) blockers.push(sizeMismatch.length + ' production batch(es) do not match the product package size.');
  else passes.push('Production package sizes match PRODUCTS.');

  const inventory = getInventoryRows_();
  const sellableInventory = inventory.reduce((sum, row) => sum + Math.max(0, Number(row['Current Inventory']) || 0), 0);
  if (!sellableInventory) blockers.push('Current inventory is zero; complete production or enter opening inventory before selling.');
  else passes.push(sellableInventory + ' bag(s) are currently available.');

  const sellers = getSettingList_('SELLER_NAME');
  if (!sellers.length || (sellers.length === 1 && sellers[0] === 'Seller 1')) warnings.push('Replace Seller 1 with the real seller names.');
  else passes.push(sellers.length + ' seller name(s) are configured.');
  const payments = getPublicSettings_().paymentMethods;
  ['Cash', 'Zelle', 'Cash App'].forEach(method => {
    if (payments.indexOf(method) < 0) warnings.push(method + ' is not enabled as a payment method.');
  });

  const incompleteCosts = getCostModelRows_().filter(cost => !(cost.estimatedCost > 0));
  if (incompleteCosts.length) warnings.push(incompleteCosts.length + ' product(s) have no estimated finished-bag cost.');
  else passes.push('Every product has an estimated finished-bag cost.');

  const output = ['PAL ANTOJO LAUNCH READINESS'];
  passes.forEach(message => output.push('PASS: ' + message));
  warnings.forEach(message => output.push('WARNING: ' + message));
  blockers.forEach(message => output.push('BLOCKER: ' + message));
  output.push(blockers.length ? 'RESULT: Not ready for live sales.' : 'RESULT: Ready for live-sales testing.');
  return output.join('\n');
}
