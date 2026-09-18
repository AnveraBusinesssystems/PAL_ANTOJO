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
  assertEqual_(isActiveSaleRow_({ Status: '' }), true, 'legacy sale remains active');
  assertEqual_(isActiveSaleRow_({ Status: 'ACTIVE' }), true, 'active sale status');
  assertEqual_(isActiveSaleRow_({ Status: 'VOIDED' }), false, 'voided sale status');
  assertEqual_(isActiveSaleRow_({ Status: 'SUPERSEDED' }), false, 'edited sale status');
  return [
    'PASS: discount boundaries (1, 3, 4, 5, 6, 10)',
    'PASS: mixed-product 4-bag and 6-bag totals',
    'PASS: cost-per-unit calculation',
    'PASS: estimated gross profit example',
    'PASS: active, voided, and superseded transaction states',
    'Integration checks requiring sheet data are listed in README.md.'
  ].join('\n');
}

function assertEqual_(actual, expected, label) {
  if (actual !== expected) throw new Error('FAIL ' + label + ': expected ' + expected + ', got ' + actual);
}
