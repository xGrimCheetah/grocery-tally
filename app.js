(function(){
  'use strict';

  // ===== Version =====
  let APP_VERSION = "1.35.0"; // Build List combined search + A-Z sticky control

  // ===== Storage & State =====
  const STORE_KEY = 'grocery_tally_v2';
  const CLOSED_CATS_KEY = 'manage_closed_cats';       // Manage Items collapsed
  const BUILD_CLOSED_CATS_KEY = 'build_closed_cats';   // legacy Build List collapsed state
  const SHOP_CLOSED_CATS_KEY = 'shop_closed_cats';     // legacy Shopping Mode collapsed state
  const LEGACY_OPEN_KEY = 'manage_open_cats';          // legacy migration only
  const SELECTED_CAT_KEY = 'manage_selected_cat';
  const DEFAULT_CATS = ["Produce","Dairy","Bakery","Meat","Frozen","Pantry","Beverages","Household","Other"];

  let state = load() || { title: "Grocery Tally", categories: DEFAULT_CATS.slice(), items: [] };
  normalizeStateShape();

  let closedCats = getClosedCats();
  let buildClosedCats = getBuildClosedCats();
  let shopClosedCats = getShopClosedCats(); // legacy only; Shopping Mode no longer uses accordions
  let manageSelectedCat = localStorage.getItem(SELECTED_CAT_KEY) || '';
  let buildSearchQuery = '';

  function id(){ return Math.random().toString(36).slice(2,10) }
  function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  function load(){ try{ return JSON.parse(localStorage.getItem(STORE_KEY)); }catch(e){ return null } }

  function normalizeStateShape(){
    if(!state || !Array.isArray(state.categories)) state = { title: "Grocery Tally", categories: DEFAULT_CATS.slice(), items: [] };
    if(!Array.isArray(state.items)) state.items = [];
    if(!state.title) state.title = "Grocery Tally";
    state.categories = state.categories.map(c => cleanText(c)).filter(Boolean);
    if(!state.categories.length) state.categories = DEFAULT_CATS.slice();
    state.items.forEach((it, idx)=>{
      if(!it.id) it.id = id();
      it.name = cleanText(it.name || 'Untitled item');
      if(!it.cat || !state.categories.includes(it.cat)) it.cat = state.categories[0] || 'Other';
      it.qty = Math.max(0, Number(it.qty) || 0);
      it.prevQty = Math.max(0, Number(it.prevQty) || 0);
      it.checked = !!it.checked;
      it.avgPrice = Math.max(0, Number(it.avgPrice) || 0);
      if(typeof it.pos !== 'number' || !Number.isFinite(it.pos)) it.pos = idx;
    });
  }

  function allCurrentCatsClosedSet(){
    return new Set(state.categories);
  }
  function getClosedCats(){
    // v1.23.0+: start Manage Items collapsed every time the app first loads.
    const closed = allCurrentCatsClosedSet();
    try{
      localStorage.removeItem(LEGACY_OPEN_KEY);
      localStorage.setItem(CLOSED_CATS_KEY, JSON.stringify([...closed]));
    }catch(e){}
    return closed;
  }
  function setClosedCats(set){ try{ localStorage.setItem(CLOSED_CATS_KEY, JSON.stringify([...set])); }catch(e){} }
  function getBuildClosedCats(){
    // Build List is now flat alphabetical. Keep this only for legacy cleanup/renames.
    const closed = allCurrentCatsClosedSet();
    try{ localStorage.setItem(BUILD_CLOSED_CATS_KEY, JSON.stringify([...closed])); }catch(e){}
    return closed;
  }
  function setBuildClosedCats(set){ try{ localStorage.setItem(BUILD_CLOSED_CATS_KEY, JSON.stringify([...set])); }catch(e){} }
  function getShopClosedCats(){
    // v1.23.1+: Shopping Mode no longer uses category accordions.
    try{ localStorage.removeItem(SHOP_CLOSED_CATS_KEY); }catch(e){}
    return new Set();
  }
  function setShopClosedCats(set){ try{ localStorage.setItem(SHOP_CLOSED_CATS_KEY, JSON.stringify([...set])); }catch(e){} }

  function scrollOpenedCategoryIntoView(sec){
    if(!sec || !sec.open) return;
    const runScroll = ()=>{
      try{
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }catch(e){
        sec.scrollIntoView(true);
      }
    };
    try{
      requestAnimationFrame(()=> setTimeout(runScroll, 0));
    }catch(e){
      setTimeout(runScroll, 0);
    }
  }

  // ===== Helpers =====
  function setVersionPills(){
    const a=document.getElementById('verPill'); if(a) a.textContent=`v${APP_VERSION}`;
    const b=document.getElementById('verPillFooter'); if(b) b.textContent=`v${APP_VERSION}`;
  }
  window.setVersionPills = setVersionPills;
  function renderTitle(){
    const wrap = document.getElementById('appTitleContainer');
    if(!wrap) return;
    wrap.innerHTML = '';

    const titleText = state.title || 'Grocery Tally';

    const titleWrap = document.createElement('span');
    titleWrap.className = 'titlewrap';

    const nameSpan = document.createElement('span');
    nameSpan.id = 'appTitle';
    nameSpan.textContent = titleText;

    const editBtn = document.createElement('button');
    editBtn.className = 'iconbtn pencil';
    editBtn.title = 'Rename list';
    editBtn.setAttribute('aria-label','Rename list');
    editBtn.textContent = '✏️';

    const input = document.createElement('input');
    input.value = titleText;
    input.style.display = 'none';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-accent';
    saveBtn.textContent = 'Save';
    saveBtn.style.display = 'none';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.display = 'none';

    function enterEdit(){
      nameSpan.style.display = 'none';
      editBtn.style.display = 'none';
      input.style.display = 'inline-block';
      saveBtn.style.display = 'inline-block';
      cancelBtn.style.display = 'inline-block';
      input.focus(); input.select();
    }
    function exitEdit(){
      nameSpan.style.display = 'inline';
      editBtn.style.display = 'inline-block';
      input.style.display = 'none';
      saveBtn.style.display = 'none';
      cancelBtn.style.display = 'none';
      input.value = state.title || 'Grocery Tally';
    }

    editBtn.onclick = enterEdit;
    nameSpan.onclick = enterEdit;
    cancelBtn.onclick = exitEdit;
    input.addEventListener('keydown', (e)=>{
      if(e.key==='Enter'){ e.preventDefault(); saveBtn.click(); }
      else if(e.key==='Escape'){ e.preventDefault(); cancelBtn.click(); }
    });

    saveBtn.onclick = ()=>{
      const newName = input.value.trim();
      if(!newName){ alert('List name cannot be empty.'); return }
      state.title = newName;
      save();
      nameSpan.textContent = state.title;
      document.title = `${state.title} v${APP_VERSION}`;
      setVersionPills();
      exitEdit();
    };

    titleWrap.appendChild(nameSpan);
    titleWrap.appendChild(editBtn);
    titleWrap.appendChild(input);
    titleWrap.appendChild(saveBtn);
    titleWrap.appendChild(cancelBtn);

    wrap.appendChild(titleWrap);

    editBtn.classList.add('hint');
    setTimeout(()=>{ editBtn.classList.remove('hint'); }, 1500);

    document.title = `${titleText} v${APP_VERSION}`;
    setVersionPills();
  }
  function groupBy(arr, key){ return arr.reduce((acc,x)=>{ (acc[x[key]] ||= []).push(x); return acc },{}) }
  function cleanText(str){ return (str || '').trim().replace(/\s+/g, ' ') }
  function normalizeText(str){ return cleanText(str).toLowerCase() }
  function findCategoryByName(name){
    const target = normalizeText(name);
    if(!target) return '';
    return state.categories.find(c => normalizeText(c) === target) || '';
  }
  function ensureCategory(name){
    const cleaned = cleanText(name);
    if(!cleaned) return { name:'', created:false };
    const existing = findCategoryByName(cleaned);
    if(existing) return { name: existing, created:false };
    state.categories.push(cleaned);
    closedCats.add(cleaned);
    buildClosedCats.add(cleaned);
    setClosedCats(closedCats);
    setBuildClosedCats(buildClosedCats);
    return { name: cleaned, created:true };
  }
  function findItemInCategory(name, cat){
    const target = normalizeText(name);
    return state.items.find(i => i.cat === cat && normalizeText(i.name) === target) || null;
  }
  function previousRunValue(it){
    const val = Number(it && it.prevQty);
    return Number.isFinite(val) && val > 0 ? val : 0;
  }
  function previousRunText(it){
    const val = previousRunValue(it);
    return val > 0 ? String(val) : '—';
  }
  function parsePriceInput(str){
    const cleaned = String(str || '').replace(/[$,\s]/g, '');
    if(!cleaned) return 0;
    const value = Number(cleaned);
    if(!Number.isFinite(value) || value < 0) return 0;
    return Math.round(value * 100) / 100;
  }
  function formatPriceInput(value){
    const amount = Number(value);
    if(!Number.isFinite(amount) || amount <= 0) return '';
    return amount.toFixed(2);
  }
  function activeEstimateItems(){
    return state.items.filter(i => Number(i && i.qty) > 0);
  }
  function estimateActiveTotal(){
    const active = activeEstimateItems();
    let total = 0;
    let missing = 0;
    active.forEach(it=>{
      const qty = Number(it.qty) || 0;
      const price = Number(it.avgPrice) || 0;
      if(qty <= 0) return;
      if(price > 0){
        total += qty * price;
      } else {
        missing++;
      }
    });
    return { total, missing };
  }
  function formatMoney(value){
    const amount = Number(value);
    if(!Number.isFinite(amount)) return '$0.00';
    return '$' + amount.toFixed(2);
  }
  function renderEstimatePill(container){
    if(!container) return;
    const estimate = estimateActiveTotal();
    const missingText = estimate.missing === 1 ? '1 item missing price' : `${estimate.missing} items missing prices`;
    const plus = estimate.missing > 0 ? '+' : '';
    container.innerHTML = '';

    const pill = document.createElement('div');
    pill.className = 'estimate-pill';
    pill.setAttribute('aria-label', 'Estimated grocery total');

    const total = document.createElement('div');
    total.className = 'estimate-total';
    total.textContent = `Estimated total: ${formatMoney(estimate.total)}${plus}`;
    pill.appendChild(total);

    if(estimate.missing > 0){
      const missing = document.createElement('div');
      missing.className = 'estimate-missing';
      missing.textContent = missingText;
      pill.appendChild(missing);
    }

    container.appendChild(pill);
  }
  function alphaKeyForItem(it){
    const first = cleanText(it && it.name).charAt(0).toUpperCase();
    return /^[A-Z]$/.test(first) ? first : '#';
  }
  function buildListSort(a,b){
    const ak = alphaKeyForItem(a);
    const bk = alphaKeyForItem(b);
    const keyOrder = (key) => key === '#' ? '0' : '1' + key;
    const byKey = keyOrder(ak).localeCompare(keyOrder(bk));
    if(byKey !== 0) return byKey;
    const an = normalizeText(a && a.name);
    const bn = normalizeText(b && b.name);
    const byName = an.localeCompare(bn);
    if(byName !== 0) return byName;
    const byCat = catIndex(a.cat) - catIndex(b.cat);
    if(byCat !== 0) return byCat;
    return sortItems(a,b);
  }
  function matchesBuildSearch(it, query){
    if(!query) return true;
    return normalizeText(it && it.name).includes(query) || normalizeText(it && it.cat).includes(query);
  }
  function scrollToBuildTop(){
    try{
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }catch(e){
      window.scrollTo(0, 0);
    }
  }
  function scrollToBuildLetter(letter){
    const idPart = letter === '#' ? 'num' : letter;
    const target = document.getElementById('build-letter-' + idPart);
    if(!target) return;
    const nav = document.getElementById('buildAlphaNav');
    const navHeight = nav ? nav.getBoundingClientRect().height : 0;
    const navStyle = nav && window.getComputedStyle ? window.getComputedStyle(nav) : null;
    const stickyTop = navStyle ? (parseFloat(navStyle.top) || 0) : 0;
    const gap = 8;
    try{
      const targetTop = target.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: Math.max(0, targetTop - stickyTop - navHeight - gap), behavior:'smooth' });
    }catch(e){
      target.scrollIntoView(true);
    }
  }
  function nonZero(){ return state.items.filter(i=>Number(i.qty)>0) }
  function zeroAll(){
    const resettable = state.items.filter(i=>Number(i.qty)>0 || i.checked);
    if(!resettable.length){
      alert('Nothing to reset.');
      return;
    }
    if(!confirm('Reset all quantities to 0 and clear checked status?')){
      return;
    }
    state.items.forEach(i=>{
      i.qty = 0;
      i.checked = false;
    });
    save();
    try{ renderBuild(); renderShop(); }catch(e){}
  }
  function resetCheckmarks(){
    const checked = state.items.filter(i=>i.checked);
    if(!checked.length){
      alert('No checkmarks to reset.');
      return;
    }
    checked.forEach(i=>{
      i.checked = false;
    });
    save();
    try{
      renderBuild();
      renderShop();
    }catch(e){
      console.error(e);
    }
  }
  function commitRun(){
    const checked = state.items.filter(i=>i.checked && Number(i.qty) > 0);
    if(!checked.length){
      alert('No checked shopping items with quantities to commit.');
      return;
    }
    const totalQty = checked.reduce((sum, i)=> sum + (Number(i.qty) || 0), 0);
    const itemWord = checked.length === 1 ? 'item' : 'items';
    if(!confirm(`Commit this grocery run?\n\nThis will reset Previous Run to 0 for all items, save ${checked.length} checked ${itemWord} as this run's purchased quantities, clear those checked quantities to 0, and leave unchecked current quantities unchanged.`)){
      return;
    }

    state.items.forEach(i=>{
      i.prevQty = 0;
    });

    checked.forEach(i=>{
      i.prevQty = Number(i.qty) || 0;
      i.qty = 0;
      i.checked = false;
    });
    save();
    try{
      renderBuild();
      renderShop();
      alert(`Run committed.\nSaved checked items: ${checked.length}\nSaved total quantity: ${totalQty}\nItems not purchased this run now show Previous Run as 0.`);
    }catch(e){
      console.error(e);
    }
  }
  function catIndex(c){ const i = state.categories.indexOf(c); return i === -1 ? 9999 : i }
  function sortItems(a,b){ const ci=catIndex(a.cat)-catIndex(b.cat); if(ci!==0) return ci; const ap=typeof a.pos==='number'?a.pos:1e9; const bp=typeof b.pos==='number'?b.pos:1e9; if(ap!==bp) return ap-bp; return String(a.name).localeCompare(String(b.name)) }
  function ensurePositions(){ const byCat=groupBy(state.items,'cat'); Object.keys(byCat).forEach(cat=>{ let idx=0; byCat[cat].sort((a,b)=>{ const ap=typeof a.pos==='number'?a.pos:1e9; const bp=typeof b.pos==='number'?b.pos:1e9; if(ap!==bp) return ap-bp; return String(a.name).localeCompare(String(b.name))}).forEach(it=>{ if(typeof it.pos!=='number') it.pos=idx++; else idx=Math.max(idx,it.pos+1)}); byCat[cat].sort((a,b)=>a.pos-b.pos).forEach((it,i)=>it.pos=i) }) }
  function nextPos(cat){ const list=state.items.filter(i=>i.cat===cat); return list.length? Math.max(...list.map(i=> typeof i.pos==='number'?i.pos:-1))+1 : 0 }
  function itemsInCategory(cat){ return state.items.filter(i=>i.cat===cat).sort(sortItems) }
  function reindexCategory(cat){ itemsInCategory(cat).forEach((it,i)=> it.pos=i) }
  function moveItemToCategory(itemId, targetCat, targetIndex){
    const it = state.items.find(x=>x.id===itemId);
    if(!it || !state.categories.includes(targetCat)) return false;
    const oldCat = it.cat;
    const targetItems = itemsInCategory(targetCat).filter(x=>x.id!==itemId);
    let insertAt = Number(targetIndex);
    if(!Number.isFinite(insertAt)) insertAt = targetItems.length;
    insertAt = Math.max(0, Math.min(insertAt, targetItems.length));
    it.cat = targetCat;
    targetItems.splice(insertAt, 0, it);
    targetItems.forEach((x,i)=> x.pos=i);
    if(oldCat !== targetCat) reindexCategory(oldCat);
    return true;
  }
  function deleteItemById(itemId){
    const it = state.items.find(x=>x.id===itemId);
    if(!it) return;
    const oldCat = it.cat;
    state.items = state.items.filter(x=>x.id!==itemId);
    reindexCategory(oldCat);
    save();
    try{ renderManage(); renderBuild(); renderShop(); }catch(e){ console.error(e) }
  }
  function rerenderItemViews(){
    try{ renderManage(); renderBuild(); renderShop(); }catch(e){ console.error(e) }
  }
  let draggedItemId = null;
  let draggedCategoryName = null;
  function isCategoryDrag(e){
    if(draggedCategoryName) return true;
    try{
      return Array.from(e.dataTransfer.types || []).includes('application/x-grocery-category');
    }catch(err){
      return false;
    }
  }
  function getDragItemId(e){
    if(isCategoryDrag(e)) return '';
    try{ return e.dataTransfer.getData('text/plain') || draggedItemId; }catch(err){ return draggedItemId }
  }
  function getDragCategoryName(e){
    try{ return e.dataTransfer.getData('application/x-grocery-category') || draggedCategoryName; }catch(err){ return draggedCategoryName }
  }
  function moveCategoryNear(sourceCat, targetCat, placeAfter){
    if(!sourceCat || !targetCat || sourceCat === targetCat) return false;
    const sourceIndex = state.categories.indexOf(sourceCat);
    const targetIndex = state.categories.indexOf(targetCat);
    if(sourceIndex < 0 || targetIndex < 0) return false;
    const moved = state.categories.splice(sourceIndex, 1)[0];
    let insertAt = state.categories.indexOf(targetCat);
    if(placeAfter) insertAt += 1;
    insertAt = Math.max(0, Math.min(insertAt, state.categories.length));
    state.categories.splice(insertAt, 0, moved);
    return true;
  }
  function rerenderCategoryOrderViews(){
    try{ renderCats(); renderManage(); renderBuild(); renderShop(); }catch(e){ console.error(e) }
  }
  function attachCategoryDrag(handleEl, cat, dragClassEl){
    if(!handleEl) return;
    handleEl.draggable = true;
    handleEl.dataset.category = cat;
    handleEl.addEventListener('click', e=> e.stopPropagation());
    handleEl.addEventListener('dragstart', e=>{
      draggedCategoryName = cat;
      const visual = dragClassEl || handleEl;
      visual.classList.add('dragging');
      try{
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setData('application/x-grocery-category', cat);
        e.dataTransfer.setData('text/plain', '');
      }catch(err){}
    });
    handleEl.addEventListener('dragend', ()=>{
      draggedCategoryName = null;
      document.querySelectorAll('.dragging').forEach(el=>el.classList.remove('dragging'));
      document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));
    });
  }
  function attachCategoryDropTarget(el, targetCat){
    if(!el) return;
    el.addEventListener('dragover', e=>{
      const sourceCat = getDragCategoryName(e);
      if(!sourceCat || sourceCat === targetCat) return;
      e.preventDefault();
      el.classList.add('drop-target');
      try{ e.dataTransfer.dropEffect='move'; }catch(err){}
    });
    el.addEventListener('dragleave', ()=> el.classList.remove('drop-target'));
    el.addEventListener('drop', e=>{
      const sourceCat = getDragCategoryName(e);
      if(!sourceCat || sourceCat === targetCat) return;
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('drop-target');
      const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      const placeAfter = rect ? (e.clientY > rect.top + rect.height / 2) : false;
      if(moveCategoryNear(sourceCat, targetCat, placeAfter)){
        draggedCategoryName = null;
        save();
        rerenderCategoryOrderViews();
      }
    });
  }
  function createCategorySummary(cat){
    const sum=document.createElement('summary');
    sum.className='category-summary';
    const handle=document.createElement('span');
    handle.className='drag-handle category-drag-handle';
    handle.textContent='☰';
    handle.title='Drag to reorder category';
    handle.setAttribute('aria-label','Drag to reorder category');
    const title=document.createElement('span');
    title.className='category-title';
    title.textContent=cat;
    sum.appendChild(handle);
    sum.appendChild(title);
    attachCategoryDrag(handle, cat, sum);
    attachCategoryDropTarget(sum, cat);
    return sum;
  }
  function attachItemDrag(handleEl, itemId, dragClassEl){
    if(!handleEl) return;
    handleEl.draggable = true;
    handleEl.dataset.itemId = itemId;
    handleEl.addEventListener('dragstart', e=>{
      draggedItemId = itemId;
      const visual = dragClassEl || handleEl;
      visual.classList.add('dragging');
      try{
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setData('text/plain', itemId);
      }catch(err){}
    });
    handleEl.addEventListener('dragend', ()=>{
      draggedItemId = null;
      document.querySelectorAll('.dragging').forEach(el=>el.classList.remove('dragging'));
      document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));
    });
  }
  function attachDropTarget(el, targetCat, targetIndexFn){
    if(!el) return;
    el.addEventListener('dragover', e=>{
      const itemId = getDragItemId(e);
      if(!itemId) return;
      e.preventDefault();
      el.classList.add('drop-target');
      try{ e.dataTransfer.dropEffect='move'; }catch(err){}
    });
    el.addEventListener('dragleave', ()=> el.classList.remove('drop-target'));
    el.addEventListener('drop', e=>{
      const itemId = getDragItemId(e);
      if(!itemId) return;
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('drop-target');
      const idx = typeof targetIndexFn === 'function' ? targetIndexFn() : targetIndexFn;
      if(moveItemToCategory(itemId, targetCat, idx)){
        draggedItemId = null;
        save();
        rerenderItemViews();
      }
    });
  }
  function createSwipeShell(itemId){
    const wrap=document.createElement('div');
    wrap.className='swipe-wrap';
    wrap.dataset.itemId=itemId;

    const trash=document.createElement('button');
    trash.type='button';
    trash.className='swipe-trash';
    trash.title='Delete item';
    trash.setAttribute('aria-label','Delete item');
    trash.textContent='🗑';
    trash.onclick=(e)=>{
      e.preventDefault();
      e.stopPropagation();
      deleteItemById(itemId);
    };

    const content=document.createElement('div');
    content.className='item swipe-content';

    wrap.appendChild(trash);
    wrap.appendChild(content);
    attachSwipeToReveal(wrap, content);
    return { wrap, content };
  }
  function attachSwipeToReveal(wrap, content){
    let startX=0, startY=0, currentX=0, tracking=false, swiping=false;
    content.addEventListener('pointerdown', e=>{
      if(e.button !== undefined && e.button !== 0) return;
      if(e.target && e.target.closest && e.target.closest('.drag-handle,button,input,select')) return;
      tracking=true; swiping=false;
      startX=e.clientX; startY=e.clientY; currentX=startX;
    });
    content.addEventListener('pointermove', e=>{
      if(!tracking) return;
      currentX=e.clientX;
      const dx=currentX-startX;
      const dy=e.clientY-startY;
      if(!swiping && Math.abs(dx)>18 && Math.abs(dx)>Math.abs(dy)*1.25){
        swiping=true;
        try{ content.setPointerCapture(e.pointerId); }catch(err){}
      }
      if(swiping){
        e.preventDefault();
        const offset=Math.max(-74, Math.min(0, dx));
        content.style.transform=`translateX(${offset}px)`;
      }
    });
    function finish(){
      if(!tracking) return;
      const dx=currentX-startX;
      tracking=false;
      if(swiping){
        content.style.transform='';
        if(dx < -36){
          document.querySelectorAll('.swipe-wrap.revealed').forEach(el=>{ if(el!==wrap) el.classList.remove('revealed'); });
          wrap.classList.add('revealed');
        } else if(dx > 24){
          wrap.classList.remove('revealed');
        }
      } else if(wrap.classList.contains('revealed')){
        wrap.classList.remove('revealed');
      }
      swiping=false;
    }
    content.addEventListener('pointerup', finish);
    content.addEventListener('pointercancel', finish);
  }

  // ===== Tabs & Views =====
  const tabBuild=document.getElementById('tabBuild');
  const tabShop=document.getElementById('tabShop');
  const tabManage=document.getElementById('tabManage');
  const tabCats=document.getElementById('tabCats');
  const viewBuild=document.getElementById('viewBuild');
  const viewShop=document.getElementById('viewShop');
  const viewManage=document.getElementById('viewManage');
  const viewCats=document.getElementById('viewCats');

  function setTab(which){
    [tabBuild,tabShop,tabManage,tabCats].forEach(b=> b.classList.remove('active'));
    [viewBuild,viewShop,viewManage,viewCats].forEach(v=> v.style.display='none');

    if(which==='build'){ tabBuild.classList.add('active'); viewBuild.style.display='block' }
    if(which==='shop'){  tabShop.classList.add('active');  viewShop.style.display='block'  }
    if(which==='manage'){tabManage.classList.add('active'); viewManage.style.display='block'}
    if(which==='cats'){  tabCats.classList.add('active');  viewCats.style.display='block'  }

    if(which==='build'){
      tabBuild.style.display='inline-block';
      tabShop.style.display='none';
    } else if(which==='shop'){
      tabBuild.style.display='none';
      tabShop.style.display='inline-block';
    } else {
      tabBuild.style.display='inline-block';
      tabShop.style.display='inline-block';
    }
  }
  tabBuild.onclick=()=>{ try{ renderBuild(); }catch(e){ console.error(e) } setTab('build') };
  tabShop.onclick = ()=>{ /* disabled: must press Finished in Build */ };
  tabManage.onclick=()=>{ try{ renderManage(); }catch(e){ console.error(e) } setTab('manage') };
  tabCats.onclick=()=>{ try{ renderCats(); }catch(e){ console.error(e) } setTab('cats') };

  // ----- Build List -----
  function renderBuild(){
    ensurePositions();
    viewBuild.innerHTML = `
      <div class="build-actions">
        <button class="btn-accent" id="btnFinish">Finished →</button>
        <button class="btn right-controls" id="btnZeroAll">Reset all to 0</button>
      </div>
      <div id="buildEstimate" class="estimate-sticky"></div>
      <div id="buildAlphaNav" class="alpha-nav build-search-nav" aria-label="Build List search and alphabet quick jump">
        <div class="build-search-row">
          <input id="buildSearchInput" class="build-search-input" type="search" placeholder="Search Build List" autocomplete="off" aria-label="Search Build List">
          <button class="btn build-search-clear" id="btnBuildSearchClear" type="button">Clear</button>
        </div>
        <div id="buildAlphaButtons" class="alpha-buttons" aria-label="Alphabet quick jump"></div>
      </div>
      <div id="buildList" class="build-flat-list"></div>`;

    const buildEstimate = document.getElementById('buildEstimate');
    const buildList = document.getElementById('buildList');
    const alphaButtons = document.getElementById('buildAlphaButtons');
    const searchInput = document.getElementById('buildSearchInput');
    const clearBtn = document.getElementById('btnBuildSearchClear');

    renderEstimatePill(buildEstimate);
    searchInput.value = buildSearchQuery;

    function drawBuildList(){
      const query = normalizeText(buildSearchQuery);
      const allItems = state.items.slice().sort(buildListSort);
      const items = query ? allItems.filter(it => matchesBuildSearch(it, query)) : allItems;
      const letters = ['#','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
      const activeLetters = new Set(items.map(alphaKeyForItem));

      alphaButtons.innerHTML = '';
      const topBtn = document.createElement('button');
      topBtn.type = 'button';
      topBtn.className = 'top-jump';
      topBtn.textContent = 'Top';
      topBtn.onclick = scrollToBuildTop;
      alphaButtons.appendChild(topBtn);

      letters.forEach(letter=>{
        const btn=document.createElement('button');
        btn.type='button';
        btn.textContent=letter;
        btn.disabled = !activeLetters.has(letter);
        btn.onclick = ()=> scrollToBuildLetter(letter);
        alphaButtons.appendChild(btn);
      });

      buildList.innerHTML = '';
      if(!allItems.length){
        buildList.innerHTML = '<p class="muted">No items yet. Add items from Manage Items.</p>';
        return;
      }
      if(!items.length){
        buildList.innerHTML = '<p class="muted">No matching items. Clear the search to show the full Build List.</p>';
        return;
      }

      let currentLetter = '';
      items.forEach(it=>{
        const letter = alphaKeyForItem(it);
        const isFirstForLetter = letter !== currentLetter;
        if(isFirstForLetter) currentLetter = letter;

        const shell = createSwipeShell(it.id);
        if(isFirstForLetter){
          shell.wrap.id = 'build-letter-' + (letter === '#' ? 'num' : letter);
        }
        const row=shell.content;

        const left=document.createElement('div'); left.className='left';
        const right=document.createElement('div'); right.className='right';
        const name=document.createElement('div'); name.className='name'; name.textContent=it.name;
        left.appendChild(name);

        const qty=document.createElement('div'); qty.className='qty'; qty.textContent=it.qty;
        const minus=document.createElement('button'); minus.className='btn'; minus.textContent='–'; minus.onclick=()=>{ it.qty=Math.max(0,Number(it.qty)-1); save(); renderBuild() };
        const plus=document.createElement('button'); plus.className='btn-accent'; plus.textContent='+'; plus.onclick=()=>{ it.qty=(Number(it.qty)||0)+1; it.checked=false; save(); renderBuild() };
        const prev=document.createElement('div');
        prev.className='prev-qty' + (previousRunValue(it) ? '' : ' empty');
        prev.title='Previous run quantity';
        prev.textContent=previousRunText(it);

        right.appendChild(qty); right.appendChild(minus); right.appendChild(plus); right.appendChild(prev);
        row.appendChild(left); row.appendChild(right);
        buildList.appendChild(shell.wrap);
      });
    }

    searchInput.addEventListener('input', ()=>{
      buildSearchQuery = searchInput.value;
      drawBuildList();
    });
    searchInput.addEventListener('keydown', (e)=>{
      if(e.key === 'Escape'){
        e.preventDefault();
        buildSearchQuery = '';
        searchInput.value = '';
        drawBuildList();
      }
    });
    clearBtn.onclick = ()=>{
      buildSearchQuery = '';
      searchInput.value = '';
      drawBuildList();
      searchInput.focus();
    };

    drawBuildList();
    document.getElementById('btnZeroAll').onclick = zeroAll;
    document.getElementById('btnFinish').onclick = ()=>{ try{ renderShop(); }catch(e){ console.error(e) } setTab('shop') };
  }

  // ----- Shopping Mode -----
  function renderShop(fadeInCat){
    ensurePositions();
    viewShop.innerHTML = `
      <div class="controls">
        <button class="btn" id="btnBack">← Back</button>
        <button class="btn-accent right-controls" id="btnCommitRun">Commit run</button>
        <button class="btn" id="btnResetCheckmarks">Reset checkmarks</button>
      </div>
      <div id="shopEstimate" class="estimate-sticky"></div>
      <div class="spacer"></div>
      <div id="shopList"></div>`;
    document.getElementById('btnBack').onclick = ()=>{ try{ renderBuild(); }catch(e){ console.error(e) } setTab('build') };
    document.getElementById('btnCommitRun').onclick = commitRun;
    document.getElementById('btnResetCheckmarks').onclick = resetCheckmarks;
    renderEstimatePill(document.getElementById('shopEstimate'));

    const shopList = document.getElementById('shopList');
    const items = nonZero().sort(sortItems);
    const byCat = groupBy(items,'cat');
    const orderedCats = Object.keys(byCat).sort((a,b)=>{
      const aDone = byCat[a].length > 0 && byCat[a].every(i => i.checked);
      const bDone = byCat[b].length > 0 && byCat[b].every(i => i.checked);
      if(aDone !== bDone) return aDone ? 1 : -1;
      return catIndex(a)-catIndex(b);
    });

    if(!orderedCats.length){
      shopList.innerHTML = '<p class="muted">No items yet.</p>';
      return;
    }

    orderedCats.forEach(cat=>{
      const catItems = byCat[cat];
      const catComplete = catItems.length > 0 && catItems.every(i => i.checked);
      const block=document.createElement('div');
      block.className='shop-cat-block' + (catComplete ? ' completed' : '');
      block.dataset.cat = cat;

      const heading=document.createElement('div');
      heading.className='shop-cat-heading';
      heading.textContent=cat;
      block.appendChild(heading);

      const list=document.createElement('div');
      list.className='shop-cat-list';

      catItems.forEach(it=>{
        const row=document.createElement('div');
        row.className='shop-item' + (it.checked ? ' checked' : '');
        row.setAttribute('role','button');
        row.setAttribute('aria-pressed', it.checked ? 'true' : 'false');

        const check=document.createElement('div');
        check.className='shop-check';
        check.setAttribute('aria-hidden','true');
        check.textContent = it.checked ? '✔' : '';

        const divider1=document.createElement('div');
        divider1.className='shop-divider';
        divider1.setAttribute('aria-hidden','true');

        const qty=document.createElement('div');
        qty.className='shop-qty';
        qty.textContent = it.qty;

        const divider2=document.createElement('div');
        divider2.className='shop-divider';
        divider2.setAttribute('aria-hidden','true');

        const name=document.createElement('div');
        name.className='shop-name';
        name.textContent = it.name;

        row.appendChild(check);
        row.appendChild(divider1);
        row.appendChild(qty);
        row.appendChild(divider2);
        row.appendChild(name);

        row.onclick = ()=>{
          const wasCatComplete = catItems.length > 0 && catItems.every(i => i.checked);
          it.checked = !it.checked;
          save();
          const currentCatItems = state.items.filter(i => i.cat === cat && Number(i.qty) > 0);
          const isCatComplete = currentCatItems.length > 0 && currentCatItems.every(i => i.checked);
          if(isCatComplete && !wasCatComplete){
            block.classList.add('fading-out');
            setTimeout(()=> renderShop(cat), 250);
          } else {
            renderShop();
          }
        };
        list.appendChild(row);
      });

      block.appendChild(list);
      shopList.appendChild(block);
      if(fadeInCat && cat === fadeInCat){
        block.classList.add('fading-in');
        setTimeout(()=> block.classList.remove('fading-in'), 260);
      }
    });
  }

  // ----- Manage Items -----
  function renderManage(){
    ensurePositions();
    viewManage.innerHTML = `
      <div class="grid">
        <div class="col-12 row" style="gap:6px;flex-wrap:wrap">
          <input id="newItemName" placeholder="Item name" style="flex:2" />
          <select id="newItemCat" style="flex:1"></select>
          <button class="btn-accent" id="btnAddItem">Add Item</button>
        </div>
      </div>
      <div class="spacer"></div>
      <div class="controls">
        <button class="btn" id="btnExport">Export JSON</button>
        <input type="file" id="fileImport" accept="application/json" style="display:none" />
        <button class="btn" id="btnImport">Import JSON</button>
        <button class="btn-danger right-controls" id="btnWipe">Wipe all data</button>
      </div>
      <details class="bulk-tools">
        <summary>Bulk setup tools</summary>
        <p class="muted bulk-help">Paste one item per line. Use category headers ending with a colon, like Produce:. Lines before the first category go into the selected category above.</p>
        <textarea id="bulkSetupText" placeholder="Produce:\nBananas\nApples\n\nDairy:\nMilk\nYogurt"></textarea>
        <div class="spacer"></div>
        <div class="controls">
          <button class="btn-accent" id="btnBulkSetup">Add pasted items/categories</button>
          <button class="btn" id="btnBulkClear">Clear paste box</button>
        </div>
      </details>
      <div class="spacer"></div>
      <div id="manageList"></div>`;

    const sel=document.getElementById('newItemCat');
    state.categories.forEach(c=>{
      const opt=document.createElement('option'); opt.value=c; opt.textContent=c; sel.appendChild(opt);
    });
    if(manageSelectedCat && state.categories.includes(manageSelectedCat)){
      sel.value = manageSelectedCat;
    } else if(state.categories.length){
      manageSelectedCat = state.categories[0];
      sel.value = manageSelectedCat;
    }
    sel.onchange = ()=>{ manageSelectedCat = sel.value; localStorage.setItem(SELECTED_CAT_KEY, manageSelectedCat) };

    document.getElementById('btnAddItem').onclick = ()=>{
      const name=document.getElementById('newItemName').value.trim();
      const cat=sel.value;
      if(!name) return;
      const normalizedName = normalizeText(name);
      const duplicate = state.items.find(i => i.cat === cat && normalizeText(i.name) === normalizedName );
      if(duplicate){
        duplicate.qty = (Number(duplicate.qty)||0) + 1;
        duplicate.checked = false;
        save();
        try{ renderManage(); renderBuild(); }catch(e){ console.error(e); }
        const nameInput = document.getElementById('newItemName');
        if(nameInput){ nameInput.value = ''; nameInput.focus(); }
        return;
      }
      manageSelectedCat = cat;
      localStorage.setItem(SELECTED_CAT_KEY, manageSelectedCat);
      state.items.push({ id:id(), name, cat, qty:0, prevQty:0, pos: nextPos(cat), checked:false, avgPrice:0 });
      save();
      try{ renderManage(); renderBuild(); }catch(e){ console.error(e); }
      const nameInput = document.getElementById('newItemName');
      if(nameInput){ nameInput.focus(); nameInput.select(); }
    };

    const nameInput = document.getElementById('newItemName');
    if(nameInput){
      nameInput.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter'){
          e.preventDefault();
          document.getElementById('btnAddItem').click();
        }
      });
    }

    document.getElementById('btnExport').onclick = ()=>{
      const dataOut = { appVersion: APP_VERSION, title: state.title, categories: state.categories, items: state.items };
      const blob = new Blob([JSON.stringify(dataOut,null,2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `grocery_tally_backup_v${APP_VERSION}.json`;
      a.click();
    };

    const fileInput = document.getElementById('fileImport');
    document.getElementById('btnImport').onclick = ()=> fileInput.click();
    fileInput.onchange = async (e)=>{
      const file=e.target.files[0];
      if(!file) return;
      const text=await file.text();
      try{
        const data = JSON.parse(text);
        if(!data || !Array.isArray(data.categories) || !Array.isArray(data.items)) throw new Error('Invalid backup format');
        if(data.appVersion && data.appVersion!==APP_VERSION){
          if(!confirm(`Backup is from version ${data.appVersion}, current app is ${APP_VERSION}.\nImport anyway?`)){
            fileInput.value='';
            return;
          }
        }
        state = { title: data.title || state.title || 'Grocery Tally', categories: data.categories, items: data.items };
        normalizeStateShape();
        ensurePositions();
        save();
        renderAll();
        alert('Import complete!');
      }catch(err){
        alert('Import failed: '+err.message);
      }
      fileInput.value='';
    };

    document.getElementById('btnBulkSetup').onclick = ()=>{
      const box = document.getElementById('bulkSetupText');
      if(!box) return;
      const raw = box.value || '';
      if(!raw.trim()){
        alert('Paste one or more items first.');
        return;
      }
      let currentCat = sel.value || state.categories[0] || 'Other';
      const startingCat = ensureCategory(currentCat);
      currentCat = startingCat.name || 'Other';
      let addedCats = startingCat.created ? 1 : 0;
      let addedItems = 0;
      let skippedItems = 0;
      const batchKeys = new Set();

      raw.split(/\r?\n/).forEach(line=>{
        let cleaned = cleanText(line.replace(/^[•*\-–—]+\s*/, ''));
        if(!cleaned) return;
        if(cleaned.endsWith(':')){
          const catName = cleanText(cleaned.slice(0, -1));
          const result = ensureCategory(catName);
          if(result.name){
            currentCat = result.name;
            if(result.created) addedCats++;
          }
          return;
        }
        const catResult = ensureCategory(currentCat || 'Other');
        const cat = catResult.name || 'Other';
        if(catResult.created) addedCats++;
        const itemName = cleaned;
        const key = normalizeText(cat) + '|' + normalizeText(itemName);
        if(batchKeys.has(key) || findItemInCategory(itemName, cat)){
          skippedItems++;
          return;
        }
        state.items.push({ id:id(), name:itemName, cat, qty:0, prevQty:0, pos: nextPos(cat), checked:false, avgPrice:0 });
        batchKeys.add(key);
        addedItems++;
      });

      if(!addedCats && !addedItems && skippedItems){
        alert(`No new items added.\nSkipped ${skippedItems} duplicate item(s).`);
        return;
      }
      manageSelectedCat = currentCat;
      localStorage.setItem(SELECTED_CAT_KEY, manageSelectedCat);
      ensurePositions();
      save();
      renderAll();
      alert(`Bulk setup complete.\nAdded categories: ${addedCats}\nAdded items: ${addedItems}\nSkipped duplicate items: ${skippedItems}`);
    };

    document.getElementById('btnBulkClear').onclick = ()=>{
      const box = document.getElementById('bulkSetupText');
      if(box){ box.value = ''; box.focus(); }
    };

    document.getElementById('btnWipe').onclick = ()=>{
      if(confirm('This clears all items/categories on this device.\nContinue?')){
        state = { title: state.title || 'Grocery Tally', categories: DEFAULT_CATS.slice(), items: [] };
        save();
        renderAll();
      }
    };

    const ml = document.getElementById('manageList');
    state.categories.forEach(cat=>{
      const items = state.items.filter(i=>i.cat===cat).sort((a,b)=> a.pos-b.pos);
      if(!items.length) return;
      const sec=document.createElement('details');
      sec.open = !closedCats.has(cat);
      const sum=createCategorySummary(cat);
      sec.appendChild(sum);
      attachCategoryDropTarget(sec, cat);
      sec.addEventListener('toggle', ()=>{
        if (sec.open) {
          const container = document.getElementById('manageList');
          const all = container ? Array.from(container.querySelectorAll('details')) : [];
          all.forEach(d => { if (d !== sec && d.open) d.open = false; });
          closedCats = new Set(state.categories);
          closedCats.delete(cat);
          scrollOpenedCategoryIntoView(sec);
        } else {
          closedCats.add(cat);
        }
        setClosedCats(closedCats);
      });

      const list=document.createElement('div');
      list.className='list';
      attachDropTarget(sum, cat, () => itemsInCategory(cat).length);
      attachDropTarget(list, cat, () => itemsInCategory(cat).length);

      items.forEach((it,idx)=>{
        const shell = createSwipeShell(it.id);
        const row=shell.content;
        row.dataset.index=idx;
        const left=document.createElement('div'); left.className='left';
        const right=document.createElement('div'); right.className='right';
        const handle=document.createElement('span'); handle.className='drag-handle'; handle.textContent='☰'; handle.title='Drag to move item';
        const name=document.createElement('div'); name.className='name'; name.textContent=it.name;
        const input=document.createElement('input'); input.value=it.name; input.style.display='none';

        const priceWrap=document.createElement('div'); priceWrap.className='price-wrap';
        const priceLabel=document.createElement('span'); priceLabel.className='price-label'; priceLabel.textContent='Avg $';
        const priceInput=document.createElement('input');
        priceInput.className='price-input';
        priceInput.type='number';
        priceInput.min='0';
        priceInput.step='0.01';
        priceInput.inputMode='decimal';
        priceInput.placeholder='0.00';
        priceInput.value=formatPriceInput(it.avgPrice);
        priceInput.title='Average price';
        priceInput.setAttribute('aria-label','Average price');
        priceInput.addEventListener('keydown', (e)=>{
          if(e.key==='Enter'){
            e.preventDefault();
            priceInput.blur();
          } else if(e.key==='Escape'){
            e.preventDefault();
            priceInput.value=formatPriceInput(it.avgPrice);
            priceInput.blur();
          }
        });
        priceInput.addEventListener('blur', ()=>{
          const parsed = parsePriceInput(priceInput.value);
          it.avgPrice = parsed;
          priceInput.value = formatPriceInput(parsed);
          save();
        });
        priceWrap.appendChild(priceLabel);
        priceWrap.appendChild(priceInput);

        const edit=document.createElement('button'); edit.className='btn'; edit.textContent='Edit';
        const saveBtn=document.createElement('button'); saveBtn.className='btn-accent'; saveBtn.textContent='Save'; saveBtn.style.display='none';
        const cancelBtn=document.createElement('button'); cancelBtn.className='btn'; cancelBtn.textContent='Cancel'; cancelBtn.style.display='none';

        row.appendChild(left);
        left.appendChild(handle);
        left.appendChild(name);
        left.appendChild(input);
        row.appendChild(right);
        right.appendChild(priceWrap);
        right.appendChild(edit);
        right.appendChild(saveBtn);
        right.appendChild(cancelBtn);
        attachItemDrag(handle, it.id, shell.wrap);

        function enterEdit(){
          name.style.display='none';
          input.style.display='block';
          edit.style.display='none';
          saveBtn.style.display='inline-block';
          cancelBtn.style.display='inline-block';
          input.focus(); input.select();
        }
        function exitEdit(){
          name.style.display='block';
          input.style.display='none';
          edit.style.display='inline-block';
          saveBtn.style.display='none';
          cancelBtn.style.display='none';
          input.value = it.name;
        }
        edit.onclick = enterEdit;
        cancelBtn.onclick = exitEdit;
        input.addEventListener('keydown', (e)=>{
          if(e.key==='Enter'){
            e.preventDefault();
            saveBtn.click();
          } else if(e.key==='Escape'){
            e.preventDefault();
            cancelBtn.click();
          }
        });
        saveBtn.onclick = ()=>{
          const nv = input.value.trim();
          if(!nv){ alert('Item name cannot be empty.'); return }
          it.name = nv;
          save();
          name.textContent = it.name;
          exitEdit();
          renderBuild();
          renderShop();
        };

        attachDropTarget(shell.wrap, cat, () => idx);
        list.appendChild(shell.wrap);
      });

      sec.appendChild(list);
      ml.appendChild(sec);
    });
  }

  // ----- Manage Categories -----
  function renderCats(){
    const cl=document.getElementById('catList');
    cl.innerHTML='';
    state.categories.forEach((c,i)=>{
      const row=document.createElement('div');
      row.className='item';
      row.draggable=true;
      row.dataset.index=i;

      const left=document.createElement('div'); left.className='left';
      const right=document.createElement('div'); right.className='right';
      const label=document.createElement('div'); label.textContent=c; label.className='name';
      const input=document.createElement('input'); input.value=c; input.style.display='none';
      const edit=document.createElement('button'); edit.className='btn'; edit.textContent='Edit';
      const saveBtn=document.createElement('button'); saveBtn.className='btn-accent'; saveBtn.textContent='Save'; saveBtn.style.display='none';
      const cancelBtn=document.createElement('button'); cancelBtn.className='btn'; cancelBtn.textContent='Cancel'; cancelBtn.style.display='none';
      const del=document.createElement('button'); del.className='btn-danger'; del.textContent='Delete';

      function enterEdit(){
        label.style.display='none';
        input.style.display='block';
        edit.style.display='none';
        del.style.display='none';
        saveBtn.style.display='inline-block';
        cancelBtn.style.display='inline-block';
        input.focus(); input.select();
      }
      function exitEdit(){
        label.style.display='block';
        input.style.display='none';
        edit.style.display='inline-block';
        del.style.display='inline-block';
        saveBtn.style.display='none';
        cancelBtn.style.display='none';
        input.value = label.textContent;
      }
      edit.onclick = enterEdit;
      cancelBtn.onclick = exitEdit;
      input.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter'){
          e.preventDefault();
          saveBtn.click();
        } else if(e.key === 'Escape'){
          e.preventDefault();
          cancelBtn.click();
        }
      });
      saveBtn.onclick = ()=>{
        const newName = input.value.trim();
        if(!newName){ alert('Category name cannot be empty.'); return }
        const dup = state.categories.some((cat,idx)=> idx!==i && cat.toLowerCase()===newName.toLowerCase());
        if(dup){ alert('That category already exists.'); return }
        const oldName = state.categories[i];
        state.categories[i] = newName;
        state.items.forEach(it=>{ if(it.cat===oldName) it.cat=newName; });
        if(closedCats.has(oldName)){ closedCats.delete(oldName); closedCats.add(newName); setClosedCats(closedCats); }
        if(buildClosedCats.has(oldName)){ buildClosedCats.delete(oldName); buildClosedCats.add(newName); setBuildClosedCats(buildClosedCats); }
        save();
        label.textContent=newName;
        exitEdit();
        renderManage(); renderBuild(); renderShop();
      };
      del.onclick = ()=>{
        const removed = state.categories.splice(i,1)[0];
        if(closedCats.has(removed)){ closedCats.delete(removed); setClosedCats(closedCats); }
        if(buildClosedCats.has(removed)){ buildClosedCats.delete(removed); setBuildClosedCats(buildClosedCats); }
        state.items.forEach(it=>{ if(it.cat === removed) it.cat = state.categories[0] || 'Other'; });
        if(!state.categories.length){ state.categories = DEFAULT_CATS.slice(); }
        save();
        renderCats(); renderManage(); renderBuild(); renderShop();
      };

      row.appendChild(left); left.appendChild(label); left.appendChild(input);
      row.appendChild(right); right.appendChild(edit); right.appendChild(saveBtn); right.appendChild(cancelBtn); right.appendChild(del);
      cl.appendChild(row);
    });

    let dragIndex=null;
    cl.querySelectorAll('.item').forEach(el=>{
      el.addEventListener('dragstart', e=>{
        dragIndex=parseInt(e.currentTarget.dataset.index,10);
        e.dataTransfer.effectAllowed='move';
      });
      el.addEventListener('dragover', e=>{
        e.preventDefault();
        e.dataTransfer.dropEffect='move';
      });
      el.addEventListener('drop', e=>{
        e.preventDefault();
        const targetIndex=parseInt(e.currentTarget.dataset.index,10);
        if(isNaN(dragIndex)||isNaN(targetIndex)||dragIndex===targetIndex) return;
        const moved=state.categories.splice(dragIndex,1)[0];
        state.categories.splice(targetIndex,0,moved);
        save();
        renderCats(); renderManage(); renderBuild(); renderShop();
      });
    });

    document.getElementById('btnAddCat').onclick = ()=>{
      const name=cleanText(document.getElementById('newCatName').value);
      if(!name) return;
      const result = ensureCategory(name);
      if(!result.created){
        alert('Category already exists');
        return;
      }
      save();
      renderCats(); renderManage();
      document.getElementById('newCatName').value='';
    };
  }

  function renderAll(){
    normalizeStateShape();
    ensurePositions();
    renderTitle();
    renderBuild();
    renderShop();
    renderManage();
    renderCats();
    setVersionPills();
  }

  // Initial render
  try{ renderTitle(); }catch(e){}
  try{
    ensurePositions();
    renderBuild();
    renderShop();
    renderManage();
    renderCats();
    setTab('build');
  }catch(e){
    console.error(e);
  }
  try{ setVersionPills(); }catch(e){}
})();
