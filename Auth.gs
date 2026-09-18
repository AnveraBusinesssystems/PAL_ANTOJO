function login(pin) {
  ensurePinProperties_();
  const submitted = cleanString_(pin, 20);
  const properties = PropertiesService.getScriptProperties();
  let role = '';
  if (submitted === properties.getProperty('OWNER_PIN')) role = 'owner';
  if (submitted === properties.getProperty('SELLER_PIN')) role = 'seller';
  if (!role) {
    Utilities.sleep(350);
    throw new Error('Incorrect PIN. Please try again.');
  }
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('session:' + token, JSON.stringify({ role: role, created: Date.now() }), PAL.SESSION_SECONDS);
  return { token: token, role: role, businessName: getSetting_('BUSINESS_NAME', 'PAL ANTOJO') };
}

function logout(token) {
  if (token) CacheService.getScriptCache().remove('session:' + String(token));
  return true;
}

function createPublicSellerSession() {
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('session:' + token, JSON.stringify({ role: 'seller', created: Date.now(), public: true }), PAL.SESSION_SECONDS);
  return { token: token, role: 'seller', businessName: getSetting_('BUSINESS_NAME', 'PAL ANTOJO') };
}

function requireSession_(token, requiredRole) {
  const key = 'session:' + cleanString_(token, 100);
  const raw = CacheService.getScriptCache().get(key);
  if (!raw) throw new Error('Your session expired. Please sign in again.');
  const session = JSON.parse(raw);
  if (requiredRole && session.role !== requiredRole) throw new Error('You are not authorized to perform this action.');
  CacheService.getScriptCache().put(key, raw, PAL.SESSION_SECONDS);
  return session;
}

function getAppBootstrap(token) {
  const session = requireSession_(token);
  const products = getSellableProducts_();
  const common = {
    role: session.role,
    settings: getPublicSettings_(),
    products: session.role === 'seller' ? products.map(product => ({
      id: product.id,
      name: product.name,
      variation: product.variation,
      price: product.price,
      available: product.available
    })) : products
  };
  if (session.role === 'owner') common.owner = getOwnerDashboardData_(token, {});
  return common;
}

function changeAccessPins(token, ownerPin, sellerPin) {
  requireSession_(token, 'owner');
  const owner = cleanString_(ownerPin, 20);
  const seller = cleanString_(sellerPin, 20);
  if (!/^\d{4,12}$/.test(owner) || !/^\d{4,12}$/.test(seller)) throw new Error('PINs must contain 4–12 digits.');
  if (owner === seller) throw new Error('Owner and seller PINs must be different.');
  PropertiesService.getScriptProperties().setProperties({ OWNER_PIN: owner, SELLER_PIN: seller });
  return true;
}

function changeOwnerPin(token, ownerPin) {
  requireSession_(token, 'owner');
  const owner = cleanString_(ownerPin, 20);
  if (!/^\d{4,12}$/.test(owner)) throw new Error('The owner PIN must contain 4–12 digits.');
  PropertiesService.getScriptProperties().setProperty('OWNER_PIN', owner);
  return true;
}
