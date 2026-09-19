(() => {
  const products = [
    {id:'JIC-FLH',name:'Jícama Chips',variation:'Flaming Hot',price:4.99,available:18},
    {id:'PLA-NAT',name:'Plantain Chips',variation:'Natural',price:4.99,available:12},
    {id:'TAR-SLY',name:'Taro Chips',variation:'Sal y Limón',price:4.99,available:8},
    {id:'BET-ADO',name:'Beet Chips',variation:'Adobado',price:4.99,available:3},
    {id:'CAM-FLH',name:'Sweet Potato Chips',variation:'Flaming Hot',price:4.99,available:10},
    {id:'COL-VER',name:'Cauliflower Chips',variation:'Salsas Verdes',price:4.99,available:6}
  ];
  const settings = {
    businessName:'PAL ANTOJO', currency:'$', sellers:['Maria','Alex'],
    paymentMethods:['Cash','Zelle','Cash App'],
    discounts:{tier1Quantity:4,tier1Percent:.10,tier2Quantity:6,tier2Percent:.15}
  };
  let sales = [{saleId:'SALE-PREVIEW-1042',date:'2026-09-19',time:'10:42',seller:'Maria',paymentMethod:'Zelle',notes:'',totalBags:4,subtotal:19.96,discountPercent:.10,discountAmount:2,finalTotal:17.96,items:[{productId:'JIC-FLH',product:'Jícama Chips',quantity:2,unitPrice:4.99},{productId:'PLA-NAT',product:'Plantain Chips',quantity:2,unitPrice:4.99}]}];
  let adjustments = [{id:'ADJ-PREVIEW-1',date:'2026-09-19',time:'09:15',seller:'Maria',product:'Taro Chips',quantity:-2,reason:'Sample',notes:'Market tasting'}];
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
      sales.unshift({saleId,date:new Date().toISOString().slice(0,10),time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),seller:request.seller,paymentMethod:request.paymentMethod,notes:request.notes||'',totalBags:result.bags,subtotal:result.subtotal,discountPercent:result.rate,discountAmount:result.discount,finalTotal:result.total,items:(request.items||[]).map(item=>({productId:item.productId,product:products.find(p=>p.id===item.productId)?.name||item.productId,quantity:Number(item.quantity),unitPrice:products.find(p=>p.id===item.productId)?.price||0}))});
      return {saleId,finalTotal:result.total};
    },
    updateSale:(_token,id,request) => ({saleId:id,finalTotal:totals(request.items||[]).total,updated:true}),
    voidSale:(_token,id) => { sales=sales.filter(sale=>sale.saleId!==id); return {message:'Transaction voided.'}; },
    recordStockAdjustment:(_token,request) => { const product=products.find(p=>p.id===request.productId); const quantity=-Math.abs(Number(request.quantity||0)); adjustments.unshift({id:'ADJ-PREVIEW-'+Date.now(),date:new Date().toISOString().slice(0,10),time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),seller:request.seller,product:product?.name||request.productId,quantity,reason:request.reason,notes:request.notes||''}); return {product:product?.name||request.productId,quantityChange:quantity}; },
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
