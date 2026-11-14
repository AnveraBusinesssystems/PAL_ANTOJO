
(function(){
'use strict';
const names=['Jícama','Beet','Banana','Taro','Colitakis'];
const products=[
{id:'jic-ado',group:'Jícama',flavor:'Adobado',size:50,price:4.99,desc:'Classic Mexican-inspired chile seasoning.'},
{id:'jic-lime',group:'Jícama',flavor:'Salt & Lime',size:60,price:5.49,desc:'Bright lime and savory crunch.'},
{id:'jic-hot',group:'Jícama',flavor:'Flaming Hot',size:50,price:4.99,desc:'Big, bold chile heat.'},
{id:'beet-ado',group:'Beet',flavor:'Adobado',size:50,price:4.99,desc:'Earthy beet with bold adobado flavor.'},
{id:'beet-hot',group:'Beet',flavor:'Flaming Hot',size:50,price:4.99,desc:'Colorful crunch with extra heat.'},
{id:'banana-natural',group:'Banana',flavor:'Natural',size:60,price:5.49,desc:'Simple, crisp banana chips.'},
{id:'banana-ado',group:'Banana',flavor:'Adobado',size:60,price:5.49,desc:'A savory chile twist on banana chips.'},
{id:'banana-lime',group:'Banana',flavor:'Salt & Lime',size:60,price:5.49,desc:'Salty, tangy banana crunch.'},
{id:'taro-ado',group:'Taro',flavor:'Adobado',size:50,price:4.99,desc:'Delicate taro with punchy seasoning.'},
{id:'col-ado',group:'Colitakis',flavor:'Adobado',size:80,price:5.99,desc:'Cauliflower crunch with adobado seasoning.'}
];
const pages=[
['index.html','Home'],['flavors.html','Shop Flavors'],['build-box.html','Build a Box'],['bundles.html','Bundles & Deals'],['about.html','Our Story'],['wholesale.html','Wholesale'],['contact.html','Contact']
];
const support=[['faq.html','FAQs'],['shipping.html','Shipping'],['returns.html','Returns'],['privacy.html','Privacy'],['terms.html','Terms']];
const current=(location.pathname.split('/').pop()||'index.html').toLowerCase();
const page=pages.concat(support).some(p=>p[0]===current)?current:'index.html';
const escaped=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dollars=n=>'$'+(Math.round(n*100)/100).toFixed(2);
const photo=()=>'<div class="product-media" aria-hidden="true"></div>';
let bag={};try{const saved=JSON.parse(sessionStorage.getItem('palantojo-preview-bag')||'{}');if(saved&&typeof saved==='object')bag=saved;}catch(e){}
let selectedGroup='Jícama',boxSize=6;
const bagCount=()=>products.reduce((t,p)=>t+(Number(bag[p.id])||0),0);
const bagTotal=()=>products.reduce((t,p)=>t+(Number(bag[p.id])||0)*p.price,0);
const navigation=items=>items.map(p=>'<a href="'+p[0]+'"'+(p[0]===page?' aria-current="page"':'')+'>'+escaped(p[1])+'</a>').join('');
function shell(){
document.body.classList.add('has-tray');
document.body.innerHTML='<div class="announcement">BOLD MEXICAN CRUNCH · REAL FLAVOR · YOUR NEXT ANTOJO</div>'+
'<header class="site-header"><a class="logo" href="index.html" aria-label="Pal Antojo home">PAL ANTOJO</a>'+
'<nav class="desktop-nav" aria-label="Main navigation">'+navigation(pages.slice(0,6))+'</nav>'+
'<div class="header-actions"><button class="icon-button bag-trigger" id="open-bag" type="button" aria-haspopup="dialog">Bag · 0</button><button class="icon-button mobile-menu-button" id="menu-toggle" aria-expanded="false" aria-controls="mobile-menu" type="button">Menu</button></div></header>'+
'<nav class="mobile-menu" id="mobile-menu" hidden aria-label="Mobile navigation">'+navigation(pages)+navigation(support)+'</nav>'+
'<main id="main-content"></main>'+
'<footer class="site-footer"><div class="container"><div class="footer-grid"><div><h3>PAL ANTOJO</h3><p>Bold Mexican-inspired crunch. Made for every craving.</p><a href="https://www.instagram.com/palantojotx/" rel="noopener">Instagram @palantojotx →</a></div><div><h4>Shop</h4>'+navigation(pages.slice(1,4))+'</div><div><h4>Company</h4>'+navigation(pages.slice(4))+'</div><div><h4>Help & policies</h4>'+navigation(support)+'</div></div><div class="footer-bottom">© <span id="year"></span> Pal Antojo · Prices, promotions, and product availability are confirmed at the Shopify store.</div></div></footer>'+
'<div class="bag-tray" aria-label="Selection preview"><div><strong id="tray-count">0 bags selected</strong><small id="tray-total">Preview subtotal $0.00</small></div><button type="button" id="tray-review">Review bag →</button></div>'+
'<div class="modal" id="bag-modal" hidden role="dialog" aria-modal="true" aria-labelledby="bag-title"><div class="modal-panel"><div class="modal-head"><h2 id="bag-title">Your bag</h2><button class="modal-close" type="button" id="bag-close" aria-label="Close bag">×</button></div><p class="warning">This is a design preview. Your choices are not sent to Shopify. To buy, select your products again in the live store.</p><div id="bag-lines"></div><div class="cart-total"><span>Estimated subtotal</span><strong id="bag-total">$0.00</strong></div><div class="modal-actions"><button class="button secondary" id="bag-continue" type="button">Keep browsing</button><a class="button dark" href="https://palantojo.com/collections/all">Shop live products →</a></div></div></div>';
document.getElementById('year').textContent=new Date().getFullYear();
document.getElementById('menu-toggle').addEventListener('click',()=>{const b=document.getElementById('menu-toggle'),m=document.getElementById('mobile-menu'),open=m.hidden;m.hidden=!open;b.setAttribute('aria-expanded',String(open));});
document.querySelectorAll('.mobile-menu a').forEach(a=>a.addEventListener('click',()=>{document.getElementById('mobile-menu').hidden=true;document.getElementById('menu-toggle').setAttribute('aria-expanded','false');}));
document.getElementById('open-bag').addEventListener('click',showBag);document.getElementById('tray-review').addEventListener('click',showBag);
document.getElementById('bag-close').addEventListener('click',closeBag);document.getElementById('bag-continue').addEventListener('click',closeBag);
document.getElementById('bag-modal').addEventListener('click',e=>{if(e.target.id==='bag-modal')closeBag();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.getElementById('bag-modal').hidden)closeBag();});
updateBag();
}
function updateBag(){
try{sessionStorage.setItem('palantojo-preview-bag',JSON.stringify(bag));}catch(e){}
const count=bagCount();
document.getElementById('tray-count').textContent=count+' bag'+(count===1?'':'s')+' selected';
document.getElementById('tray-total').textContent='Preview subtotal '+dollars(bagTotal());
document.getElementById('open-bag').textContent='Bag · '+count;
}
function showBag(){
const lines=document.getElementById('bag-lines');
const chosen=products.filter(p=>bag[p.id]>0);
lines.innerHTML=chosen.map(p=>'<div class="cart-row"><span>'+bag[p.id]+' × '+escaped(p.group+' '+p.flavor)+'</span><strong>'+dollars(p.price*bag[p.id])+'</strong></div>').join('')||'<p>Your bag is empty. Explore the flavors to get started.</p>';
document.getElementById('bag-total').textContent=dollars(bagTotal());
document.getElementById('bag-modal').hidden=false;document.body.classList.add('modal-open');document.getElementById('bag-close').focus();
}
function closeBag(){document.getElementById('bag-modal').hidden=true;document.body.classList.remove('modal-open');document.getElementById('open-bag').focus();}
function addProduct(id,delta){
const p=products.find(x=>x.id===id);if(!p)return;
bag[id]=Math.max(0,Math.min(99,(Number(bag[id])||0)+delta));if(!bag[id])delete bag[id];updateBag();
document.querySelectorAll('[data-product="'+id+'"]').forEach(card=>{const out=card.querySelector('output'),minus=card.querySelector('[data-delta="-1"]'),plus=card.querySelector('[data-delta="1"]');if(out)out.textContent=bag[id]||0;if(minus)minus.disabled=!(bag[id]>0);if(plus)plus.disabled=(bag[id]||0)>=99;});
refreshCategoryBadges();refreshBoxProgress();
}
function productCard(p){
const qty=bag[p.id]||0;
return '<article class="product-card" data-product="'+p.id+'">'+photo()+'<div class="product-content"><div class="product-meta">'+p.size+'g · '+escaped(p.group)+'</div><h3>'+escaped(p.flavor)+'</h3><p>'+escaped(p.desc)+'</p><div class="product-purchase"><strong class="price">'+dollars(p.price)+'</strong><div class="stepper" role="group" aria-label="'+escaped(p.group+' '+p.flavor)+' quantity"><button type="button" data-delta="-1" data-id="'+p.id+'" aria-label="Remove '+escaped(p.group+' '+p.flavor)+'" '+(qty?'':'disabled')+'>−</button><output aria-live="polite">'+qty+'</output><button type="button" data-delta="1" data-id="'+p.id+'" aria-label="Add '+escaped(p.group+' '+p.flavor)+'" '+(qty>=99?'disabled':'')+'>+</button></div></div></div></article>';
}
function attachSteppers(root){root.querySelectorAll('.stepper button').forEach(b=>b.addEventListener('click',()=>addProduct(b.dataset.id,Number(b.dataset.delta))));}
function heading(eyebrow,title,copy){return '<section class="page-hero"><div class="container"><p class="eyebrow">'+eyebrow+'</p><h1>'+title+'</h1><p>'+copy+'</p></div></section>';}
function categoryTiles(){return '<div class="category-grid">'+names.map((n,i)=>'<a class="category-tile" href="flavors.html?category='+encodeURIComponent(n)+'"><small>0'+(i+1)+' / SHOP CATEGORY →</small><h3>'+escaped(n)+'</h3><strong>Explore flavors →</strong></a>').join('')+'</div>';}
function home(){
return '<section class="hero"><div class="hero-copy"><p class="eyebrow">ROOTED IN MEXICO · CRUNCHED IN TEXAS</p><h1>NOT YOUR ORDINARY <span class="serif">crunch.</span></h1><p>Jícama, beet, banana, taro, and cauliflower chips. Big Mexican-inspired flavor in every bag.</p><div class="button-row"><a class="button" href="flavors.html">Shop flavors →</a><a class="button secondary" href="build-box.html">Build a box →</a></div></div><div class="hero-media" id="hero-media"><div class="hero-fallback"><strong>REAL ROOTS.<br>BOLD HEAT.<br>BETTER CRUNCH.</strong></div><video id="hero-video" muted autoplay loop playsinline preload="metadata" poster="pal-antojo-frontend/shopify-theme/assets/pal-hero-table-mobile.placeholder.svg" aria-label="Pal Antojo brand video"><source src="media/pal-antojo-hero-mobile.mp4" type="video/mp4"></video><span class="hero-note" id="video-note">VIDEO SPACE RESERVED</span></div></section>'+
'<div class="ticker">REAL ROOTS — BOLD FLAVOR — NEW CRAVINGS — REAL ROOTS — BOLD FLAVOR</div>'+
'<section class="section"><div class="container"><div class="section-header"><h2>Pick your <span class="serif">craving.</span></h2><p>One ingredient at a time. Find your next favorite flavor.</p></div>'+categoryTiles()+'</div></section>'+
'<section class="section"><div class="container"><div class="section-header"><h2>Start with the favorites.</h2><p>Meet a few of the flavors that define Pal Antojo.</p></div><div class="product-grid" id="home-products">'+[products[0],products[2],products[6]].map(productCard).join('')+'</div><div class="button-row" style="margin-top:28px"><a class="button" href="flavors.html">See all 10 flavors →</a></div></div></section>'+
'<section class="section feature-band"><div class="container"><p class="eyebrow">YOUR BAG, YOUR RULES</p><h2>BUILD YOUR <span class="serif">antojo box.</span></h2><p>Mix flavor favorites in one custom selection. Choose your bags, review your subtotal, then shop through our live Shopify store.</p><a class="button" href="build-box.html">Start building →</a></div></section>'+
'<section class="section"><div class="container"><div class="section-header"><h2>Why Pal Antojo?</h2><p>Unexpected ingredients, familiar cravings, and flavors with personality.</p></div><div class="benefit-grid"><article class="benefit-card"><span class="number">01</span><h3>Unexpected ingredients</h3><p>From jícama to cauliflower, a different way to satisfy your crunch craving.</p></article><article class="benefit-card"><span class="number">02</span><h3>Bold seasoning</h3><p>Adobado, Flaming Hot, Salt & Lime, and Natural choices.</p></article><article class="benefit-card"><span class="number">03</span><h3>Made to share</h3><p>Explore multiple flavors or put together a box for your people.</p></article></div></div></section>'+
'<section class="section"><div class="container"><div class="section-header"><h2>From our roots to your snack shelf.</h2><p>See the story behind the name and the flavors.</p></div><a class="button secondary" href="about.html">Read our story →</a></div></section>'+
'<section class="section narrow"><div class="container"><h2>Stay in the loop.</h2><p>Follow new flavors, drops, and announcements on Instagram.</p><a class="button" href="https://www.instagram.com/palantojotx/">Follow @palantojotx →</a></div></section>';
}
function setupVideo(){
const v=document.getElementById('hero-video'),media=document.getElementById('hero-media');if(!v)return;
let good=false;
const ready=()=>{good=true;media.classList.add('has-video');v.dataset.ready='true';document.getElementById('video-note').textContent='PAL ANTOJO';};
v.addEventListener('loadeddata',ready);v.addEventListener('playing',ready);
v.addEventListener('error',()=>{media.classList.remove('has-video');v.removeAttribute('data-ready');});
v.querySelector('source')?.addEventListener('error',()=>{if(!good)media.classList.remove('has-video');});
if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){v.pause();return;}
v.play().catch(()=>{});
}
function renderTabs(){
const target=document.getElementById('ingredient-tabs');if(!target)return;
target.innerHTML=names.map((n,i)=>'<button class="tab" role="tab" type="button" data-group="'+escaped(n)+'" aria-selected="'+(n===selectedGroup)+'" tabindex="'+(n===selectedGroup?0:-1)+'">'+escaped(n)+(products.filter(p=>p.group===n).reduce((s,p)=>s+(bag[p.id]||0),0)?'<span class="count">'+products.filter(p=>p.group===n).reduce((s,p)=>s+(bag[p.id]||0),0)+'</span>':'')+'</button>').join('');
target.querySelectorAll('button').forEach((b,i)=>{b.addEventListener('click',()=>switchTab(b.dataset.group));b.addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();const ix=e.key==='Home'?0:e.key==='End'?names.length-1:(i+(e.key==='ArrowRight'?1:-1)+names.length)%names.length;switchTab(names[ix]);target.querySelectorAll('button')[ix].focus();});});
}
function refreshCategoryBadges(){if(document.getElementById('ingredient-tabs'))renderTabs();}
function switchTab(name){if(!names.includes(name))return;selectedGroup=name;renderTabs();renderShop();document.querySelector('#ingredient-tabs .tab[aria-selected="true"]')?.scrollIntoView({block:'nearest',inline:'nearest'});}
function shopIntro(){return heading('THE WHOLE LINEUP','SHOP <span class="serif">flavors.</span>','Explore one ingredient family at a time. Your selection stays saved when you switch tabs.');}
function shopBody(){return '<section class="section narrow"><div class="container"><div class="shop-tools"><div><h3>Choose your ingredient</h3><p class="muted">Ten flavors across five ingredient families.</p></div><input type="search" id="shop-search" placeholder="Search within category" aria-label="Search current category"></div><div class="tabs" role="tablist" aria-label="Shop product categories" id="ingredient-tabs"></div><div class="product-grid" role="tabpanel" id="shop-results"></div><p class="hidden" id="shop-empty">No flavors match your search. Try a different term.</p></div></section><section class="section feature-band"><div class="container"><h2>Cannot choose one?</h2><p>Build a mix of flavors, your way.</p><a class="button" href="build-box.html">Build a box →</a></div></section>';}
function renderShop(){
const root=document.getElementById('shop-results');if(!root)return;
const term=(document.getElementById('shop-search')?.value||'').trim().toLowerCase();
const matching=products.filter(p=>p.group===selectedGroup&&(p.flavor+' '+p.group+' '+p.size).toLowerCase().includes(term));
root.innerHTML=matching.map(productCard).join('');
document.getElementById('shop-empty').classList.toggle('hidden',matching.length!==0);
attachSteppers(root);
}
function shopInit(){
const category=new URLSearchParams(location.search).get('category');if(names.includes(category))selectedGroup=category;
renderTabs();renderShop();
document.getElementById('shop-search').addEventListener('input',renderShop);
}
function boxPage(){return heading('CUSTOMIZE YOUR CRAVING','BUILD A <span class="serif">box.</span>','Choose a box size and select your own mix of flavors.')+
'<section class="section narrow"><div class="container"><h2>1. Pick your box size</h2><div class="size-options" id="box-options"><button data-size="4" type="button">4 bags</button><button data-size="6" type="button">6 bags</button><button data-size="10" type="button">10 bags</button></div><div class="box-layout"><div><h2>2. Select your flavors</h2><div class="tabs" role="tablist" id="ingredient-tabs" aria-label="Choose ingredient"></div><div class="product-grid" id="shop-results"></div><p id="shop-empty" class="hidden">No matching products.</p><input id="shop-search" type="hidden"></div><aside class="box-sidebar"><p class="eyebrow">YOUR BOX</p><h3 id="box-status">0 of 6 bags</h3><div class="progress"><span id="box-progress" style="width:0%"></span></div><p id="box-helper">Choose your favorite flavors.</p><strong id="box-total">$0.00</strong><p class="video-tip">This is a preview. The final order is placed separately in Shopify.</p><button class="button dark" id="box-review" type="button">Review selection →</button></aside></div></div></section>';}
function refreshBoxProgress(){
const status=document.getElementById('box-status');if(!status)return;
const count=bagCount();
status.textContent=count+' of '+boxSize+' bags selected';
document.getElementById('box-progress').style.width=Math.min(100,count/boxSize*100)+'%';
document.getElementById('box-helper').textContent=count===boxSize?'Your preview box is filled.':count>boxSize?'You have '+(count-boxSize)+' extra bags. Adjust quantities to fit the selected box.':'Add '+(boxSize-count)+' more bag'+(boxSize-count===1?'':'s')+' to fill this box.';
document.getElementById('box-total').textContent=dollars(bagTotal());
}
function boxInit(){shopInit();document.querySelectorAll('#box-options button').forEach(b=>b.addEventListener('click',()=>{boxSize=Number(b.dataset.size);document.querySelectorAll('#box-options button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));refreshBoxProgress();}));document.querySelector('#box-options [data-size="6"]').setAttribute('aria-pressed','true');document.getElementById('box-review').addEventListener('click',showBag);refreshBoxProgress();}
function bundlesPage(){
const bundles=[['Discovery Box','4 bags','Explore different ingredients and flavors.','4'],['Variety Box','6 bags','More flavors to mix, match, and share.','6'],['Stock-Up Box','10 bags','A bigger selection for bigger cravings.','10'],['Heat Lovers','Spicy picks','Try Adobado and Flaming Hot varieties.','6']];
return heading('EXPLORE MORE','BUNDLES & <span class="serif">deals.</span>','Find a box format you love, or build your own. Any promotional prices must be confirmed in Shopify.')+
'<section class="section"><div class="container"><div class="bundle-grid">'+bundles.map(b=>'<article class="bundle-card"><div class="bundle-media">BOX PHOTO SPACE</div><div class="bundle-copy"><p class="eyebrow">'+b[1]+'</p><h3>'+b[0]+'</h3><p>'+b[2]+'</p><a class="button" href="build-box.html?size='+b[3]+'">Customize this box →</a></div></article>').join('')+'</div></div></section>'+
'<section class="section feature-band"><div class="container"><h2>Shipping that makes sense.</h2><p>Current planned rates: 1–3 bags $6.99; 4–9 bags $4.99; 10+ bags free. Confirm final shipping at checkout, where current Shopify rules apply.</p><a class="button" href="shipping.html">Shipping details →</a></div></section>';
}
function aboutPage(){return heading('WHY WE EXIST','OUR <span class="serif">story.</span>','A Mexican-inspired snack brand driven by bold flavor, unexpected ingredients, and a love of the crunch.')+
'<section class="section"><div class="container"><div class="story-grid"><article class="story-card"><span class="number">01 / OUR ROOTS</span><h3>Made for antojos</h3><p>Antojo means a craving. The name is a nod to that moment you want something satisfying and full of flavor.</p></article><article class="story-card"><span class="number">02 / THE LINEUP</span><h3>More than one kind of chip</h3><p>Jícama, beet, banana, taro, and cauliflower give us different textures, flavors, and ways to snack.</p></article><article class="story-card"><span class="number">03 / WHAT COMES NEXT</span><h3>Growing from Texas</h3><p>We are building Pal Antojo one product, one customer, and one retail relationship at a time.</p></article></div></div></section><section class="section feature-band"><div class="container"><h2>Try the flavors for yourself.</h2><p>Find your first favorite or build a collection.</p><a class="button" href="flavors.html">Shop flavors →</a></div></section>';}
function wholesalePage(){return heading('PARTNER WITH PAL ANTOJO','WHOLESALE <span class="serif">inquiries.</span>','For retailers, cafés, gyms, boutiques, and other businesses interested in stocking Pal Antojo.')+
'<section class="section"><div class="container"><div class="benefit-grid"><article class="benefit-card"><h3>10 product variations</h3><p>Five ingredient groups and distinct flavor profiles.</p></article><article class="benefit-card"><h3>Flexible discussions</h3><p>Tell us your store format, location, and approximate volume.</p></article><article class="benefit-card"><h3>Retail-ready planning</h3><p>Request current product details, pack sizes, and wholesale terms.</p></article></div></div></section>'+
'<section class="section narrow"><div class="container"><h2>Start a conversation.</h2><p>For current wholesale information, contact us through the official store inquiry channel.</p><a class="button" href="https://palantojo.com/pages/contact">Wholesale inquiry →</a><p class="muted">Include your business name, location, and expected order volume in your message.</p></div></section>';}
function contactPage(){return heading('SAY HELLO','CONTACT <span class="serif">us.</span>','Questions about flavors, orders, wholesale, or a collaboration? We would love to hear from you.')+
'<section class="section"><div class="container"><div class="contact-layout"><div><h2>We are here to help.</h2><p>For order-related questions, include your order number when contacting us through Shopify.</p><a class="button" href="https://palantojo.com/pages/contact">Contact customer support →</a><p style="margin-top:25px"><a href="https://www.instagram.com/palantojotx/">Instagram: @palantojotx →</a></p></div><div><h3>Find the answer faster</h3><p><a href="faq.html">Frequently asked questions →</a></p><p><a href="shipping.html">Shipping information →</a></p><p><a href="returns.html">Returns and damaged orders →</a></p><p><a href="wholesale.html">Interested in wholesale? →</a></p></div></div></div></section>';}
const policies={
'faq.html':['HELP CENTER','Frequently asked questions','<h2>What products do you sell?</h2><p>Pal Antojo offers jícama, beet, banana, taro, and cauliflower chips in a variety of flavors. See the current catalog for sizes and prices.</p><h2>Can I mix flavors?</h2><p>Yes. Explore our Build a Box preview, then purchase your preferred mix in the live Shopify store.</p><h2>Where can I find ingredients and nutrition details?</h2><p>Always refer to the current product packaging and verified product information on palantojo.com. Contact support if any information differs.</p><h2>How can I contact you?</h2><p>Use the official Shopify contact page or Instagram @palantojotx.</p>'],
'shipping.html':['ORDER INFORMATION','Shipping information','<h2>Shipping rates</h2><p>Planned rates are $6.99 for 1–3 bags, $4.99 for 4–9 bags, and free shipping for 10 or more bags. The actual shipping price at Shopify checkout controls.</p><h2>Processing and delivery</h2><p>Delivery estimates and available destinations depend on the current Shopify checkout and carrier service. Do not rely on a fixed delivery date unless confirmed at checkout.</p><h2>Missing or damaged package?</h2><p>Contact our support team through the official store contact page and include your order number.</p>'],
'returns.html':['CUSTOMER SUPPORT','Returns and refunds','<div class="warning">Policy summary pending final business approval. The actual terms shown at Shopify checkout and the official store policy govern purchases.</div><h2>Damaged or incorrect orders</h2><p>Contact Pal Antojo with your order number, a description of the issue, and photos where relevant.</p><h2>Food product returns</h2><p>Return eligibility for food products depends on the official store policy and applicable consumer law. Review the current Shopify policy before placing an order.</p><p><a href="https://palantojo.com/policies/refund-policy">View current official refund policy →</a></p>'],
'privacy.html':['LEGAL','Privacy policy','<div class="warning">This preview is not the authoritative privacy policy for Shopify orders.</div><h2>Customer data</h2><p>Purchases made on palantojo.com are processed through the actual Shopify store. Please consult the current published privacy policy for information about data collection, cookies, and your rights.</p><p><a href="https://palantojo.com/policies/privacy-policy">Read the official privacy policy →</a></p><h2>Preview selection</h2><p>This GitHub Pages preview stores temporary product selections in this browser session only. It does not submit orders or collect payment information.</p>'],
'terms.html':['LEGAL','Terms of service','<div class="warning">This page is an informational preview. Refer to the official Shopify terms for live purchases.</div><h2>Product and pricing information</h2><p>Catalog examples, prices, shipping information, and any promotions shown here are illustrative and may change. Live Shopify product listings and checkout are authoritative.</p><h2>Order terms</h2><p>Orders are only placed through the live palantojo.com Shopify store.</p><p><a href="https://palantojo.com/policies/terms-of-service">Read official terms of service →</a></p>']
};
function policyPage(){const p=policies[page];return heading(p[0],p[1].toUpperCase(),'Information about shopping with Pal Antojo.')+
'<section class="section"><div class="container"><div class="policy-layout"><nav class="policy-sidebar" aria-label="Help pages">'+navigation(support)+'</nav><article class="policy-article">'+p[2]+'<p><a class="button secondary" href="contact.html">Need more help? →</a></p></article></div></div></section>';}
function init(){
shell();
const root=document.getElementById('main-content');
if(page==='index.html')root.innerHTML=home();
else if(page==='flavors.html')root.innerHTML=shopIntro()+shopBody();
else if(page==='build-box.html')root.innerHTML=boxPage();
else if(page==='bundles.html')root.innerHTML=bundlesPage();
else if(page==='about.html')root.innerHTML=aboutPage();
else if(page==='wholesale.html')root.innerHTML=wholesalePage();
else if(page==='contact.html')root.innerHTML=contactPage();
else root.innerHTML=policyPage();
if(page==='index.html'){attachSteppers(root);setupVideo();}
if(page==='flavors.html')shopInit();
if(page==='build-box.html'){const size=Number(new URLSearchParams(location.search).get('size'));if([4,6,10].includes(size))boxSize=size;boxInit();if([4,6,10].includes(size))document.querySelector('#box-options [data-size="'+size+'"]').click();}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
