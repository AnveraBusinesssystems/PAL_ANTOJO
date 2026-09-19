(() => {
  const products = [
    {id:'JIC-ADO',name:'Jícama',variation:'Adobado',displayName:'Jícama — Adobado',packageSizeGrams:50,price:4.99,available:20},
    {id:'JIC-SLY',name:'Jícama',variation:'Sal y Limón',displayName:'Jícama — Sal y Limón',packageSizeGrams:50,price:4.99,available:20},
    {id:'JIC-FLH',name:'Jícama',variation:'Flaming Hot',displayName:'Jícama — Flaming Hot',packageSizeGrams:50,price:4.99,available:20},
    {id:'TAR-ADO',name:'Taro',variation:'Adobado',displayName:'Taro — Adobado',packageSizeGrams:50,price:4.99,available:60},
    {id:'PLA-ADO',name:'Plátano',variation:'Adobado',displayName:'Plátano — Adobado',packageSizeGrams:60,price:5.49,available:17},
    {id:'PLA-NAT',name:'Plátano',variation:'Natural',displayName:'Plátano — Natural',packageSizeGrams:60,price:5.49,available:17},
    {id:'PLA-SLY',name:'Plátano',variation:'Sal y Limón',displayName:'Plátano — Sal y Limón',packageSizeGrams:60,price:5.49,available:16},
    {id:'BET-ADO',name:'Betabel',variation:'Adobado',displayName:'Betabel — Adobado',packageSizeGrams:50,price:4.99,available:20},
    {id:'BET-SLY',name:'Betabel',variation:'Sal y Limón',displayName:'Betabel — Sal y Limón',packageSizeGrams:50,price:4.99,available:20},
    {id:'BET-FLH',name:'Betabel',variation:'Flaming Hot',displayName:'Betabel — Flaming Hot',packageSizeGrams:50,price:4.99,available:20},
    {id:'COL-ADO',name:'Colitakis',variation:'Adobado',displayName:'Colitakis — Adobado',packageSizeGrams:80,price:5.99,available:37}
  ];
  const settings = {
    businessName:'PAL ANTOJO', currency:'$', sellers:['Maria','Alex'],
    paymentMethods:['Cash','Zelle','Cash App'],
    discounts:{tier1Quantity:4,tier1Percent:.10,tier2Quantity:6,tier2Percent:.15}
  };
  let sales = [{saleId:'SALE-PREVIEW-1042',date:'2026-09-19',time:'10:42',seller:'Maria',paymentMethod:'Zelle',notes:'',totalBags:4,subtotal:20.96,discountPercent:.10,discountAmount:2.10,finalTotal:18.86,items:[{productId:'JIC-FLH',product:'Jícama — Flaming Hot',packageSizeGrams:50,quantity:2,unitPrice:4.99},{productId:'PLA-NAT',product:'Plátano — Natural',packageSizeGrams:60,quantity:2,unitPrice:5.49}]}];
  let adjustments = [{id:'ADJ-PREVIEW-1',date:'2026-09-19',time:'09:15',seller:'Maria',product:'Taro — Adobado',quantity:-2,reason:'Sample',notes:'Market tasting'}];
  let drawer = {date:'2026-09-19',opening:50,cashSales:89.82,netMovements:0,expected:139.82,latestCount:null,activity:[]};

  const ownerProducts = () => products.map(product => ({
    ...product, active:true, notes:'', starting:product.available+8, produced:4, sold:12,
    current:product.available, reorder:4, estimatedCost:1.05,
    costParts:{raw:.80,label:.07,bag:.18,other:0}
  }));
  const bootstrap = owner => ({
    role:owner?'owner':'seller', settings, products:owner?ownerProducts():products,
    ...(owner?{owner:{metrics:{currentInventory:products.reduce((sum,p)=>sum+p.available,0),unitsSold:72,grossRevenue:311.40,discounts:28.55,cogs:75.60,grossProfit:235.80},products:ownerProducts()}}:{})
  });
  const totals = items => {
    const bags=items.reduce((sum,item)=>sum+Number(item.quantity||0),0);
    const subtotal=items.reduce((sum,item)=>sum+Number(item.quantity||0)*(products.find(p=>p.id===item.productId)?.price||0),0);
    const rate=bags>=6 ? .15 : bags>=4 ? .10 : 0;
    return {bags,subtotal,rate,discount:subtotal*rate,total:subtotal*(1-rate)};
  };

  const handlers = {
    createPublicSellerSession:() => ({token:'preview',role:'seller'}),
    login:() => ({token:'owner',role:'owner'}),
    logout:() => true,
    getAppBootstrap:token => bootstrap(token==='owner'),
    getRecentSellerSales:() => sales,
    getRecentAdjustments:() => adjustments,
    recordSale:(_token,request) => {
      const result=totals(request.items||[]);
      const saleId='SALE-PREVIEW-'+String(Date.now()).slice(-6);
      sales.unshift({saleId,date:new Date().toISOString().slice(0,10),time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),seller:request.seller,paymentMethod:request.paymentMethod,notes:request.notes||'',totalBags:result.bags,subtotal:result.subtotal,discountPercent:result.rate,discountAmount:result.discount,finalTotal:result.total,items:(request.items||[]).map(item=>{const product=products.find(p=>p.id===item.productId);return {productId:item.productId,product:product?.displayName||item.productId,packageSizeGrams:product?.packageSizeGrams||0,quantity:Number(item.quantity),unitPrice:product?.price||0};})});
      return {saleId,finalTotal:result.total};
    },
    updateSale:(_token,id,request) => ({saleId:id,finalTotal:totals(request.items||[]).total,updated:true}),
    voidSale:(_token,id) => { sales=sales.filter(sale=>sale.saleId!==id); return {message:'Transaction voided.'}; },
    recordStockAdjustment:(_token,request) => { const product=products.find(p=>p.id===request.productId); const quantity=-Math.abs(Number(request.quantity||0)); adjustments.unshift({id:'ADJ-PREVIEW-'+Date.now(),date:new Date().toISOString().slice(0,10),time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),seller:request.seller,product:product?.displayName||request.productId,quantity,reason:request.reason,notes:request.notes||''}); return {product:product?.displayName||request.productId,quantityChange:quantity}; },
    getCashDrawer:() => drawer,
    setCashDrawerOpening:(_token,amount) => { drawer={...drawer,opening:Number(amount),expected:Number(amount)+drawer.cashSales+drawer.netMovements}; return drawer; },
    recordCashMovement:(_token,request) => { const amount=Number(request.amount)*(request.direction==='out'?-1:1); drawer={...drawer,netMovements:drawer.netMovements+amount,expected:drawer.expected+amount,activity:[{id:'CASH-PREVIEW-'+Date.now(),time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),seller:request.seller,type:amount<0?'CASH_OUT':'CASH_IN',amount,reason:request.reason},...drawer.activity]}; return drawer; },
    recordCashCount:(_token,amount,seller) => { drawer={...drawer,latestCount:{amount:Number(amount),time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),seller}}; return drawer; },
    getSalesForOwner:() => [], getCostsForOwner:() => [],
    saveProduct:() => ({message:'Product saved in preview.'}), updateInventory:() => true,
    addCost:() => true, updateProductCost:() => true, updateSettings:() => settings,
    changeOwnerPin:() => true
  };
  const makeRunner = callbacks => new Proxy({}, {get(_target,name){
    if(name==='withSuccessHandler') return fn=>makeRunner({...callbacks,success:fn});
    if(name==='withFailureHandler') return fn=>makeRunner({...callbacks,failure:fn});
    return (...args)=>setTimeout(()=>{
      try {
        if(!handlers[name]) throw new Error('This action is unavailable in the GitHub preview.');
        callbacks.success?.(handlers[name](...args));
      } catch(error) { callbacks.failure?.(error); }
    },80);
  }});
  window.google={script:{run:makeRunner({})}};
})();
