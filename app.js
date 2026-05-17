(function(){
  'use strict';

  // ===== Version =====
  let APP_VERSION = "1.53.1"; // All Items search clear button

  // ===== Storage & State =====
  const STORE_KEY = 'grocery_tally_v2';
  const CLOSED_CATS_KEY = 'manage_closed_cats';       // Manage Items collapsed
  const BUILD_CLOSED_CATS_KEY = 'build_closed_cats';   // legacy Build List collapsed state
  const SHOP_CLOSED_CATS_KEY = 'shop_closed_cats';     // legacy Shopping Mode collapsed state
  const LEGACY_OPEN_KEY = 'manage_open_cats';          // legacy migration only
  const SELECTED_CAT_KEY = 'manage_selected_cat';
  const LAST_BACKUP_KEY = 'grocery_tally_last_backup_at';
  const DEFAULT_CATS = ["Produce","Dairy","Bakery","Meat","Frozen","Pantry","Beverages","Household","Other"];

  let state = load() || { title: "Grocery Tally", categories: DEFAULT_CATS.slice(), items: [], stores: [], runHistory: [] };
  normalizeStateShape();

  let closedCats = getClosedCats();
  let buildClosedCats = getBuildClosedCats();
  let shopClosedCats = getShopClosedCats(); // legacy only; Shopping Mode no longer uses accordions
  let manageSelectedCat = localStorage.getItem(SELECTED_CAT_KEY) || '';
  let manageView = 'items';
  let manageItemReorderMode = false;
  let manageCategoryReorderMode = false;
  let buildSearchQuery = '';
  let buildFocusLetter = '';
  let buildControlMode = 'alpha';
  let buildListMode = 'all';
  let insightsDateRange = 'all';
  let insightsSort = 'name';
  let insightsFilter = 'all';
  let insightsSearchQuery = '';
  let insightsViewMode = 'items';
  let runHistoryShowAll = false;
  const runHistoryExpandedIds = new Set();
  let runHistoryReceiptEditId = '';

  function id(){ return Math.random().toString(36).slice(2,10) }
  function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  function load(){ try{ return JSON.parse(localStorage.getItem(STORE_KEY)); }catch(e){ return null } }
  function roundMoney(value){
    const amount = Number(value);
    return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
  }
  function positiveMoney(value){
    const rounded = roundMoney(value);
    return rounded > 0 ? rounded : 0;
  }
  function normalizePriceEntries(entries, item){
    if(!Array.isArray(entries)) return [];
    return entries.map(entry=>{
      const unitPrice = positiveMoney(entry && entry.unitPrice);
      const totalPrice = positiveMoney(entry && entry.totalPrice);
      const qty = Math.max(0, Number(entry && entry.qty) || 0);
      if(!(unitPrice > 0) || !(totalPrice > 0)) return null;
      return {
        id: cleanText(entry && entry.id) || ('price_' + id()),
        runId: cleanText(entry && entry.runId),
        runItemKey: cleanText(entry && entry.runItemKey),
        itemId: cleanText((entry && entry.itemId) || (item && item.id) || ''),
        name: cleanText((entry && entry.name) || (item && item.name) || 'Untitled item'),
        cat: cleanText((entry && entry.cat) || (item && item.cat) || ''),
        committedAt: cleanText(entry && entry.committedAt),
        enteredAt: cleanText(entry && entry.enteredAt),
        qty,
        unitPrice,
        totalPrice
      };
    }).filter(Boolean);
  }

  function normalizeStateShape(){
    if(!state || !Array.isArray(state.categories)) state = { title: "Grocery Tally", categories: DEFAULT_CATS.slice(), items: [], runHistory: [] };
    if(!Array.isArray(state.items)) state.items = [];
    if(!state.title) state.title = "Grocery Tally";
    state.categories = state.categories.map(c => cleanText(c)).filter(Boolean);
    if(!state.categories.length) state.categories = DEFAULT_CATS.slice();
    if(!Array.isArray(state.stores)) state.stores = [];
    const seenStores = new Set();
    state.stores = state.stores.map((store, idx)=>{
      const name = cleanText(store && store.name);
      if(!name) return null;
      const normalizedName = normalizeText(name);
      if(seenStores.has(normalizedName)) return null;
      seenStores.add(normalizedName);
      const pos = Number(store && store.pos);
      return {
        id: cleanText(store && store.id) || ('store_' + id()),
        name,
        pos: Number.isFinite(pos) ? pos : idx
      };
    }).filter(Boolean).sort(compareStores);
    state.stores.forEach((store, idx)=>{
      store.pos = Number.isFinite(Number(store.pos)) ? Number(store.pos) : idx;
    });
    const validStoreIds = new Set(state.stores.map(store => cleanText(store && store.id)).filter(Boolean));
    state.items.forEach((it, idx)=>{
      if(!it.id) it.id = id();
      it.name = cleanText(it.name || 'Untitled item');
      if(!it.cat || !state.categories.includes(it.cat)) it.cat = state.categories[0] || 'Other';
      const itemStoreIds = Array.isArray(it.storeIds) ? it.storeIds : [];
      const seenItemStoreIds = new Set();
      it.storeIds = itemStoreIds.map(storeId => cleanText(storeId)).filter(storeId=>{
        if(!storeId || !validStoreIds.has(storeId) || seenItemStoreIds.has(storeId)) return false;
        seenItemStoreIds.add(storeId);
        return true;
      });
      it.qty = Math.max(0, Number(it.qty) || 0);
      it.prevQty = Math.max(0, Number(it.prevQty) || 0);
      it.checked = !!it.checked;
      it.skipped = !!it.skipped;
      if(it.checked) it.skipped = false;
      it.avgPrice = Math.max(0, Number(it.avgPrice) || 0);
      const receiptPreviousAvgPrice = Number(it.receiptPreviousAvgPrice);
      if(Number.isFinite(receiptPreviousAvgPrice) && receiptPreviousAvgPrice >= 0) it.receiptPreviousAvgPrice = roundMoney(receiptPreviousAvgPrice);
      else delete it.receiptPreviousAvgPrice;
      it.priceEntries = normalizePriceEntries(it.priceEntries, it);
      if(typeof it.pos !== 'number' || !Number.isFinite(it.pos)) it.pos = idx;
    });
    if(!Array.isArray(state.runHistory)) state.runHistory = [];
    state.runHistory = state.runHistory.map((run, idx)=>{
      const rawItems = Array.isArray(run && run.items) ? run.items : [];
      const items = rawItems.map(rit=>{
        const qty = Math.max(0, Number(rit && rit.qty) || 0);
        const avgPrice = Math.max(0, Number(rit && rit.avgPrice) || 0);
        const estimatedPrice = roundMoney(Number(rit && rit.estimatedPrice) || (qty * avgPrice));
        const receiptTotal = positiveMoney(rit && rit.receiptTotal);
        const receiptUnitPrice = receiptTotal > 0 && qty > 0 ? roundMoney(receiptTotal / qty) : positiveMoney(rit && rit.receiptUnitPrice);
        const normalized = {
          itemId: cleanText((rit && (rit.itemId || rit.id)) || ''),
          name: cleanText((rit && rit.name) || 'Untitled item'),
          cat: cleanText((rit && rit.cat) || ''),
          qty,
          avgPrice,
          estimatedPrice
        };
        if(receiptTotal > 0){
          normalized.receiptTotal = receiptTotal;
          normalized.receiptUnitPrice = receiptUnitPrice;
          normalized.receiptEnteredAt = cleanText(rit && rit.receiptEnteredAt) || new Date().toISOString();
        }
        return normalized;
      }).filter(rit => rit.name && rit.qty > 0);
      const totalQty = Math.max(0, Number(run && run.totalQty) || items.reduce((sum, rit)=> sum + (Number(rit.qty) || 0), 0));
      const estimatedTotal = calculateRunEstimatedTotal({ items });
      const missingPriceCount = calculateRunMissingPriceCount({ items });
      return {
        id: cleanText((run && run.id) || '') || ('run_' + idx + '_' + id()),
        committedAt: cleanText((run && (run.committedAt || run.date)) || '') || new Date().toISOString(),
        itemCount: Math.max(0, Number(run && run.itemCount) || items.length),
        totalQty,
        estimatedTotal,
        missingPriceCount,
        items
      };
    }).filter(run => run.items.length || run.totalQty > 0);
  }


  function countCommittedRuns(source){
    return Array.isArray(source && source.runHistory) ? source.runHistory.length : 0;
  }

  function getDataSafetyStats(source){
    const data = source || state || {};
    return {
      itemCount: Array.isArray(data.items) ? data.items.length : 0,
      categoryCount: Array.isArray(data.categories) ? data.categories.length : 0,
      storeCount: Array.isArray(data.stores) ? data.stores.length : 0,
      committedRunCount: countCommittedRuns(data)
    };
  }

  function getLastBackupAt(){
    try{ return localStorage.getItem(LAST_BACKUP_KEY) || ''; }catch(e){ return ''; }
  }

  function setLastBackupAt(value){
    try{ localStorage.setItem(LAST_BACKUP_KEY, value); }catch(e){}
  }

  function clearLastBackupAt(){
    try{ localStorage.removeItem(LAST_BACKUP_KEY); }catch(e){}
  }

  function formatBackupTimestamp(value){
    if(!value) return 'Never exported on this device';
    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return value;
    return date.toLocaleString([], { year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
  }

  function refreshDataSafetyPanel(){
    const panel = document.getElementById('dataSafetyPanel');
    if(!panel) return;
    const stats = getDataSafetyStats(state);
    const appVersionEl = panel.querySelector('[data-backup-stat="version"]');
    const itemCountEl = panel.querySelector('[data-backup-stat="items"]');
    const categoryCountEl = panel.querySelector('[data-backup-stat="categories"]');
    const storeCountEl = panel.querySelector('[data-backup-stat="stores"]');
    const runCountEl = panel.querySelector('[data-backup-stat="runs"]');
    const lastBackupEl = panel.querySelector('[data-backup-stat="last-backup"]');
    if(appVersionEl) appVersionEl.textContent = `v${APP_VERSION}`;
    if(itemCountEl) itemCountEl.textContent = String(stats.itemCount);
    if(categoryCountEl) categoryCountEl.textContent = String(stats.categoryCount);
    if(storeCountEl) storeCountEl.textContent = String(stats.storeCount);
    if(runCountEl) runCountEl.textContent = String(stats.committedRunCount);
    if(lastBackupEl) lastBackupEl.textContent = formatBackupTimestamp(getLastBackupAt());
  }

  function backupDateStamp(date){
    const d = date || new Date();
    return d.toISOString().slice(0,10);
  }

  function getBackupFileVersion(data){
    const meta = data && (data.exportMetadata || data.metadata);
    return (data && data.appVersion) || (meta && (meta.appVersion || meta.version)) || 'Not included';
  }

  function makeImportPreview(data){
    const backupStats = getDataSafetyStats(data);
    const currentStats = getDataSafetyStats(state);
    return [
      'Import backup JSON? This will replace the current grocery data stored in this browser.',
      '',
      'Backup file:',
      `- Version: ${getBackupFileVersion(data)}`,
      `- Items: ${backupStats.itemCount}`,
      `- Categories: ${backupStats.categoryCount}`,
      `- Stores: ${backupStats.storeCount}`,
      `- Committed runs: ${backupStats.committedRunCount}`,
      '',
      'Current data:',
      `- Items: ${currentStats.itemCount}`,
      `- Categories: ${currentStats.categoryCount}`,
      `- Stores: ${currentStats.storeCount}`,
      `- Committed runs: ${currentStats.committedRunCount}`,
      '',
      'Replacing data cannot be undone unless you exported a backup first. Continue?'
    ].join('\n');
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

  function currentScrollY(){
    return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  function restoreWindowScrollY(scrollY){
    const top = Math.max(0, Number(scrollY) || 0);
    const restore = ()=>{
      try{
        window.scrollTo({ left: 0, top, behavior: 'auto' });
      }catch(e){
        window.scrollTo(0, top);
      }
    };
    restore();
    try{ requestAnimationFrame(()=>{ restore(); setTimeout(restore, 0); }); }catch(e){ setTimeout(restore, 0); }
    setTimeout(restore, 0);
    setTimeout(restore, 50);
  }

  function scrollManageEditRowIntoView(target){
    if(!target) return;

    const runScroll = ()=>{
      try{
        const rowRect = target.getBoundingClientRect();
        const input = target.querySelector ? target.querySelector('.manage-name-input') : null;
        const inputRect = input ? input.getBoundingClientRect() : rowRect;
        const rect = {
          top: Math.min(rowRect.top, inputRect.top),
          bottom: Math.max(rowRect.bottom, inputRect.bottom)
        };
        const doc = document.documentElement;
        const viewport = window.visualViewport;
        const viewportOffsetTop = viewport && Number.isFinite(viewport.offsetTop) ? viewport.offsetTop : 0;
        const viewportHeight = viewport && Number.isFinite(viewport.height) ? viewport.height : (window.innerHeight || doc.clientHeight || 0);
        if(!viewportHeight) return;

        const currentScroll = window.pageYOffset || doc.scrollTop || document.body.scrollTop || 0;
        const topPadding = 24;
        const isMobileViewport = window.matchMedia ? window.matchMedia('(max-width: 680px)').matches : viewportHeight < 700;
        const desktopBottomPadding = Math.min(140, Math.max(72, viewportHeight * 0.18));
        const mobileBottomPadding = Math.min(
          260,
          Math.max(180, viewportHeight * 0.38),
          Math.max(120, viewportHeight - topPadding - 80)
        );
        const bottomPadding = isMobileViewport ? mobileBottomPadding : desktopBottomPadding;
        const visibleTop = viewportOffsetTop + topPadding;
        const visibleBottom = viewportOffsetTop + viewportHeight - bottomPadding;
        let nextScroll = null;

        if(rect.bottom > visibleBottom){
          nextScroll = currentScroll + rect.bottom - viewportOffsetTop - viewportHeight + bottomPadding;
        }else if(rect.top < visibleTop){
          nextScroll = currentScroll + rect.top - viewportOffsetTop - topPadding;
        }

        if(nextScroll === null) return;

        const maxScroll = Math.max(0, doc.scrollHeight - viewportHeight);
        const scrollTop = Math.max(0, Math.min(nextScroll, maxScroll));
        window.scrollTo({ top: scrollTop, behavior: 'smooth' });
      }catch(e){
        try{
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }catch(err){
          target.scrollIntoView(false);
        }
      }
    };

    const scheduleScroll = (delay)=>{
      try{
        requestAnimationFrame(()=> setTimeout(runScroll, delay));
      }catch(e){
        setTimeout(runScroll, delay);
      }
    };

    scheduleScroll(0);
    scheduleScroll(200);
    scheduleScroll(450);
    scheduleScroll(750);
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
  function compareStores(a,b){
    const ap = Number.isFinite(Number(a && a.pos)) ? Number(a.pos) : 1e9;
    const bp = Number.isFinite(Number(b && b.pos)) ? Number(b.pos) : 1e9;
    if(ap !== bp) return ap - bp;
    return cleanText(a && a.name).localeCompare(cleanText(b && b.name));
  }
  function sortedStores(){ return (Array.isArray(state.stores) ? state.stores : []).slice().sort(compareStores) }
  function findStoreByName(name, excludeId){
    const target = normalizeText(name);
    if(!target) return null;
    return (Array.isArray(state.stores) ? state.stores : []).find(store => store.id !== excludeId && normalizeText(store.name) === target) || null;
  }
  function nextStorePos(){
    const stores = Array.isArray(state.stores) ? state.stores : [];
    return stores.reduce((max, store)=> Math.max(max, Number.isFinite(Number(store && store.pos)) ? Number(store.pos) : -1), -1) + 1;
  }
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
  function activeEstimateItems(includeSkipped){
    return state.items.filter(i => Number(i && i.qty) > 0 && (includeSkipped || !i.skipped));
  }
  function estimateActiveTotal(includeSkipped){
    const active = activeEstimateItems(includeSkipped);
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
  function renderEstimatePill(container, options){
    if(!container) return;
    const estimate = estimateActiveTotal(!!(options && options.includeSkipped));
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
  function formatRunDate(iso){
    try{
      const d = new Date(iso);
      if(Number.isNaN(d.getTime())) return String(iso || 'Unknown date');
      return d.toLocaleString([], { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' });
    }catch(e){
      return String(iso || 'Unknown date');
    }
  }
  function createRunHistoryEntry(checked){
    const sorted = checked.slice().sort(sortItems);
    const items = sorted.map(it=>{
      const qty = Math.max(0, Number(it.qty) || 0);
      const avgPrice = Math.max(0, Number(it.avgPrice) || 0);
      const estimatedPrice = avgPrice > 0 ? Math.round(qty * avgPrice * 100) / 100 : 0;
      return {
        itemId: it.id || '',
        name: cleanText(it.name || 'Untitled item'),
        cat: cleanText(it.cat || ''),
        qty,
        avgPrice,
        estimatedPrice
      };
    }).filter(rit => rit.qty > 0);
    const totalQty = items.reduce((sum, rit)=> sum + (Number(rit.qty) || 0), 0);
    const estimatedTotal = Math.round(items.reduce((sum, rit)=> sum + (Number(rit.estimatedPrice) || 0), 0) * 100) / 100;
    const missingPriceCount = items.filter(rit => Number(rit.qty) > 0 && !(Number(rit.avgPrice) > 0)).length;
    return {
      id: 'run_' + Date.now().toString(36) + '_' + id(),
      committedAt: new Date().toISOString(),
      itemCount: items.length,
      totalQty,
      estimatedTotal,
      missingPriceCount,
      items
    };
  }
  function runItemReceiptTotal(rit){
    return positiveMoney(rit && rit.receiptTotal);
  }
  function runItemReceiptUnitPrice(rit){
    const total = runItemReceiptTotal(rit);
    const qty = Math.max(0, Number(rit && rit.qty) || 0);
    if(total > 0 && qty > 0) return roundMoney(total / qty);
    return positiveMoney(rit && rit.receiptUnitPrice);
  }
  function runItemEstimatedPrice(rit){
    const receiptTotal = runItemReceiptTotal(rit);
    if(receiptTotal > 0) return receiptTotal;
    const storedPrice = positiveMoney(rit && rit.estimatedPrice);
    if(storedPrice > 0) return storedPrice;
    const qty = Math.max(0, Number(rit && rit.qty) || 0);
    const avgPrice = positiveMoney(rit && rit.avgPrice);
    return avgPrice > 0 && qty > 0 ? roundMoney(qty * avgPrice) : 0;
  }
  function calculateRunEstimatedTotal(run){
    const runItems = Array.isArray(run && run.items) ? run.items : [];
    return roundMoney(runItems.reduce((sum, rit)=> sum + runItemEstimatedPrice(rit), 0));
  }
  function calculateRunMissingPriceCount(run){
    const runItems = Array.isArray(run && run.items) ? run.items : [];
    return runItems.filter(rit => Number(rit && rit.qty) > 0 && !(runItemEstimatedPrice(rit) > 0)).length;
  }
  function runEstimatedTotal(run){
    return calculateRunEstimatedTotal(run);
  }
  function runMissingPriceCount(run){
    return calculateRunMissingPriceCount(run);
  }
  function runTotalQty(run){
    const storedQty = Number(run && run.totalQty);
    if(Number.isFinite(storedQty) && storedQty > 0) return storedQty;
    const runItems = Array.isArray(run && run.items) ? run.items : [];
    return runItems.reduce((sum, rit)=> sum + (Number(rit && rit.qty) || 0), 0);
  }
  function receiptRunItemKey(rit, index){
    const itemId = cleanText(rit && rit.itemId);
    if(itemId) return 'item:' + itemId;
    return ['fallback', normalizeText(rit && rit.name), normalizeText(rit && rit.cat), String(index)].join('|');
  }
  function findMasterItemForRunItem(rit){
    const itemId = cleanText(rit && rit.itemId);
    if(itemId){
      const byId = state.items.find(it => cleanText(it && it.id) === itemId);
      if(byId) return byId;
    }
    const name = normalizeText(rit && rit.name);
    const cat = normalizeText(rit && rit.cat);
    if(!name) return null;
    return state.items.find(it => normalizeText(it && it.name) === name && normalizeText(it && it.cat) === cat) || null;
  }
  function parseReceiptTotalInput(value){
    const raw = String(value || '').replace(/[$,\s]/g, '');
    if(!raw) return { blank:true, value:0 };
    if(raw.startsWith('-')) return { error:'Receipt totals cannot be negative.' };
    if(!/^\d+(?:\.\d{0,2})?$|^\.\d{1,2}$/.test(raw)) return { error:'Enter receipt totals as positive currency amounts, such as 1, 1.40, or 1.47.' };
    const amount = Number(raw);
    if(!Number.isFinite(amount) || amount < 0) return { error:'Receipt totals cannot be negative.' };
    return { blank:false, value:roundMoney(amount) };
  }
  function isSamePriceEntry(entry, runId, runItemKey, rit, masterItem){
    if(cleanText(entry && entry.runId) !== runId) return false;
    if(cleanText(entry && entry.runItemKey) && cleanText(entry && entry.runItemKey) === runItemKey) return true;
    const entryItemId = cleanText(entry && entry.itemId);
    const masterId = cleanText(masterItem && masterItem.id);
    if(entryItemId && masterId && entryItemId === masterId) return true;
    return normalizeText(entry && entry.name) === normalizeText(rit && rit.name) && normalizeText(entry && entry.cat) === normalizeText(rit && rit.cat);
  }
  function validPriceEntries(item){
    return normalizePriceEntries(item && item.priceEntries, item).filter(entry => positiveMoney(entry.unitPrice) > 0 && positiveMoney(entry.totalPrice) > 0);
  }
  function recalcAvgPriceFromEntries(item){
    if(!item) return;
    item.priceEntries = normalizePriceEntries(item.priceEntries, item);
    const valid = validPriceEntries(item);
    if(!valid.length){
      const previousAvgPrice = Number(item.receiptPreviousAvgPrice);
      item.avgPrice = Number.isFinite(previousAvgPrice) && previousAvgPrice >= 0 ? roundMoney(previousAvgPrice) : 0;
      delete item.receiptPreviousAvgPrice;
      return;
    }
    valid.sort((a,b)=>{
      const ad = Date.parse(a.committedAt || a.enteredAt || '') || 0;
      const bd = Date.parse(b.committedAt || b.enteredAt || '') || 0;
      if(bd !== ad) return bd - ad;
      const ae = Date.parse(a.enteredAt || '') || 0;
      const be = Date.parse(b.enteredAt || '') || 0;
      return be - ae;
    });
    const recent = valid.slice(0, 5);
    item.avgPrice = roundMoney(recent.reduce((sum, entry)=> sum + positiveMoney(entry.unitPrice), 0) / recent.length);
  }
  function syncMasterPriceEntry(run, rit, index, enteredAt){
    const item = findMasterItemForRunItem(rit);
    if(!item) return null;
    if(!Array.isArray(item.priceEntries)) item.priceEntries = [];
    item.priceEntries = normalizePriceEntries(item.priceEntries, item);
    const hadValidEntriesBeforeSync = validPriceEntries(item).length > 0;
    const runId = cleanText(run && run.id);
    const runItemKey = receiptRunItemKey(rit, index);
    let existing = null;
    item.priceEntries = item.priceEntries.filter(entry=>{
      const same = isSamePriceEntry(entry, runId, runItemKey, rit, item);
      if(same && !existing) existing = entry;
      return !same;
    });
    const receiptTotal = runItemReceiptTotal(rit);
    const unitPrice = runItemReceiptUnitPrice(rit);
    if(receiptTotal > 0 && unitPrice > 0){
      if(!hadValidEntriesBeforeSync && !Number.isFinite(Number(item.receiptPreviousAvgPrice))){
        item.receiptPreviousAvgPrice = roundMoney(item.avgPrice);
      }
      item.priceEntries.push({
        id: cleanText(existing && existing.id) || ('price_' + id()),
        runId,
        runItemKey,
        itemId: cleanText(item.id),
        name: cleanText(rit && rit.name) || cleanText(item.name),
        cat: cleanText(rit && rit.cat) || cleanText(item.cat),
        committedAt: cleanText(run && run.committedAt),
        enteredAt,
        qty: Math.max(0, Number(rit && rit.qty) || 0),
        unitPrice,
        totalPrice: receiptTotal
      });
    }
    recalcAvgPriceFromEntries(item);
    return item;
  }
  function saveReceiptPrices(runId, form){
    const run = (Array.isArray(state.runHistory) ? state.runHistory : []).find(candidate => cleanText(candidate && candidate.id) === runId);
    if(!run || !Array.isArray(run.items)) return;
    const parsed = [];
    for(let index = 0; index < run.items.length; index++){
      const input = form && form.querySelector(`[data-receipt-index="${index}"]`);
      const result = parseReceiptTotalInput(input ? input.value : '');
      if(result.error){
        alert(result.error);
        if(input) input.focus();
        return;
      }
      parsed.push(result);
    }
    const enteredAt = new Date().toISOString();
    const affectedItems = new Set();
    run.items.forEach((rit, index)=>{
      const result = parsed[index];
      if(!result || result.blank || !(result.value > 0)){
        delete rit.receiptTotal;
        delete rit.receiptUnitPrice;
        delete rit.receiptEnteredAt;
      } else {
        const qty = Math.max(0, Number(rit && rit.qty) || 0);
        rit.receiptTotal = result.value;
        rit.receiptUnitPrice = qty > 0 ? roundMoney(result.value / qty) : 0;
        rit.receiptEnteredAt = enteredAt;
      }
      const synced = syncMasterPriceEntry(run, rit, index, enteredAt);
      if(synced) affectedItems.add(synced.id);
    });
    run.estimatedTotal = runEstimatedTotal(run);
    run.missingPriceCount = runMissingPriceCount(run);
    runHistoryReceiptEditId = '';
    save();
    renderRunHistory(document.getElementById('runHistoryList'));
    renderManage();
    renderBuild();
  }

  function renderRunHistory(container){
    if(!container) return;
    const runs = Array.isArray(state.runHistory) ? state.runHistory : [];
    const count = document.getElementById('runHistoryCount');
    if(count) count.textContent = `${runs.length} committed run${runs.length === 1 ? '' : 's'}`;
    container.innerHTML = '';
    if(!runs.length){
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'No committed runs yet. Your next Commit run will be saved here.';
      container.appendChild(empty);
      return;
    }
    const visibleRuns = runHistoryShowAll ? runs : runs.slice(0, 10);
    visibleRuns.forEach((run, index)=>{
      const runId = cleanText(run && run.id) || `run-index-${index}`;
      const expanded = runHistoryExpandedIds.has(runId);
      const runItems = Array.isArray(run.items) ? run.items : [];
      const totalQty = runTotalQty(run);
      const estimatedTotal = runEstimatedTotal(run);
      const missingCount = runMissingPriceCount(run);
      const plus = missingCount > 0 ? '+' : '';

      const card = document.createElement('div');
      card.className = 'item run-history-card';

      const header = document.createElement('button');
      header.type = 'button';
      header.className = 'run-history-toggle';
      header.setAttribute('aria-expanded', expanded ? 'true' : 'false');

      const heading = document.createElement('div');
      heading.className = 'run-history-heading';

      const title = document.createElement('div');
      title.className = 'name';
      title.textContent = `${index + 1}. ${formatRunDate(run.committedAt)}`;

      const meta = document.createElement('div');
      meta.className = 'muted run-history-meta';
      meta.textContent = `${run.itemCount || runItems.length || 0} item${(run.itemCount || runItems.length) === 1 ? '' : 's'} · Total qty ${totalQty || 0} · Est./receipt ${formatMoney(estimatedTotal)}${plus}`;

      const missing = document.createElement('div');
      missing.className = 'muted run-history-missing';
      missing.textContent = missingCount > 0 ? `${missingCount} item${missingCount === 1 ? '' : 's'} missing price data.` : 'All committed items have price data.';

      heading.appendChild(title);
      heading.appendChild(meta);
      heading.appendChild(missing);

      const action = document.createElement('span');
      action.className = 'run-history-action';
      action.textContent = expanded ? 'Collapse' : 'Expand';

      header.appendChild(heading);
      header.appendChild(action);
      header.onclick = ()=>{
        if(expanded) runHistoryExpandedIds.delete(runId);
        else runHistoryExpandedIds.add(runId);
        renderRunHistory(container);
      };

      card.appendChild(header);

      if(expanded){
        const detail = document.createElement('div');
        detail.className = 'run-history-detail';
        const editingReceipt = runHistoryReceiptEditId === runId;

        const summary = document.createElement('div');
        summary.className = 'run-history-summary';
        summary.textContent = `Run total quantity: ${totalQty || 0} · Estimated/receipt total: ${formatMoney(estimatedTotal)}${plus} · Missing price: ${missingCount}`;
        detail.appendChild(summary);

        if(runItems.length){
          if(editingReceipt){
            const form = document.createElement('form');
            form.className = 'receipt-price-form';
            form.noValidate = true;
            const note = document.createElement('p');
            note.className = 'muted receipt-price-note';
            note.textContent = 'Enter receipt line totals. Blank fields leave or clear receipt prices for that item.';
            form.appendChild(note);
            runItems.forEach((rit, receiptIndex)=>{
              const qty = Math.max(0, Number(rit && rit.qty) || 0);
              const row = document.createElement('label');
              row.className = 'run-history-item-row receipt-price-row';
              const info = document.createElement('div');
              info.className = 'receipt-price-info';
              const itemName = document.createElement('div');
              itemName.className = 'run-history-item-name';
              itemName.textContent = cleanText(rit && rit.name) || 'Untitled item';
              const itemMeta = document.createElement('div');
              itemMeta.className = 'muted run-history-item-meta';
              const catText = cleanText(rit && rit.cat);
              itemMeta.textContent = `${catText ? catText + ' · ' : ''}Qty ${qty}`;
              info.appendChild(itemName);
              info.appendChild(itemMeta);

              const inputWrap = document.createElement('div');
              inputWrap.className = 'receipt-price-input-wrap';
              const inputLabel = document.createElement('span');
              inputLabel.className = 'price-label';
              inputLabel.textContent = 'Receipt total $';
              const input = document.createElement('input');
              input.type = 'text';
              input.inputMode = 'decimal';
              input.className = 'price-input receipt-price-input';
              input.dataset.receiptIndex = String(receiptIndex);
              input.value = formatPriceInput(runItemReceiptTotal(rit));
              input.setAttribute('aria-label', `Receipt total for ${cleanText(rit && rit.name) || 'item'}`);
              inputWrap.appendChild(inputLabel);
              inputWrap.appendChild(input);

              row.appendChild(info);
              row.appendChild(inputWrap);
              form.appendChild(row);
            });
            const controls = document.createElement('div');
            controls.className = 'controls receipt-price-controls';
            const saveBtn = document.createElement('button');
            saveBtn.type = 'submit';
            saveBtn.className = 'btn primary';
            saveBtn.textContent = 'Save receipt prices';
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'btn';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.onclick = ()=>{
              runHistoryReceiptEditId = '';
              renderRunHistory(container);
            };
            controls.appendChild(saveBtn);
            controls.appendChild(cancelBtn);
            form.appendChild(controls);
            form.onsubmit = (e)=>{
              e.preventDefault();
              saveReceiptPrices(runId, form);
            };
            detail.appendChild(form);
          } else {
            const controls = document.createElement('div');
            controls.className = 'controls run-history-receipt-actions';
            const editReceiptBtn = document.createElement('button');
            editReceiptBtn.type = 'button';
            editReceiptBtn.className = 'btn';
            editReceiptBtn.textContent = 'Edit receipt prices';
            editReceiptBtn.onclick = ()=>{
              runHistoryReceiptEditId = runId;
              renderRunHistory(container);
            };
            controls.appendChild(editReceiptBtn);
            detail.appendChild(controls);

            const list = document.createElement('div');
            list.className = 'run-history-items';
            runItems.forEach(rit=>{
              const qty = Math.max(0, Number(rit && rit.qty) || 0);
              const avgPrice = positiveMoney(rit && rit.avgPrice);
              const estimatedPrice = runItemEstimatedPrice(rit);
              const receiptTotal = runItemReceiptTotal(rit);
              const receiptUnit = runItemReceiptUnitPrice(rit);
              const row = document.createElement('div');
              row.className = 'run-history-item-row';
              const itemName = document.createElement('div');
              itemName.className = 'run-history-item-name';
              itemName.textContent = cleanText(rit && rit.name) || 'Untitled item';
              const itemMeta = document.createElement('div');
              itemMeta.className = 'muted run-history-item-meta';
              const catText = cleanText(rit && rit.cat);
              let priceText = 'Missing price';
              if(receiptTotal > 0){
                priceText = `Receipt ${formatMoney(receiptTotal)} · Unit ${formatMoney(receiptUnit)}`;
              } else if(avgPrice > 0){
                priceText = `Avg ${formatMoney(avgPrice)} · Est. ${formatMoney(estimatedPrice)}`;
              } else if(estimatedPrice > 0){
                priceText = `Committed est. ${formatMoney(estimatedPrice)}`;
              }
              itemMeta.textContent = `${catText ? catText + ' · ' : ''}Qty ${qty} · ${priceText}`;
              row.appendChild(itemName);
              row.appendChild(itemMeta);
              list.appendChild(row);
            });
            detail.appendChild(list);
          }
        } else {
          const emptyDetail = document.createElement('p');
          emptyDetail.className = 'muted';
          emptyDetail.textContent = 'No item detail saved for this run.';
          detail.appendChild(emptyDetail);
        }
        card.appendChild(detail);
      }

      container.appendChild(card);
    });
    if(runs.length > 10){
      const controls = document.createElement('div');
      controls.className = 'run-history-more controls';
      const note = document.createElement('p');
      note.className = 'muted';
      note.textContent = runHistoryShowAll ? `Showing all ${runs.length} committed runs.` : `Showing the latest 10 of ${runs.length} committed runs.`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn';
      btn.textContent = runHistoryShowAll ? 'Show latest 10' : 'Show more';
      btn.onclick = ()=>{
        runHistoryShowAll = !runHistoryShowAll;
        renderRunHistory(container);
      };
      controls.appendChild(note);
      controls.appendChild(btn);
      container.appendChild(controls);
    }
  }
  function insightsRunTime(run){
    const d = new Date(run && run.committedAt);
    const time = d.getTime();
    return Number.isNaN(time) ? 0 : time;
  }
  function insightsRunDate(run){
    const d = new Date(run && run.committedAt);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  function addDays(date, days){
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() + days);
    return d;
  }
  function insightsDateRangeBounds(rangeKey){
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfTomorrow = addDays(startOfToday, 1);
    if(rangeKey === 'last30') return { start: addDays(startOfToday, -29), end: startOfTomorrow };
    if(rangeKey === 'last90') return { start: addDays(startOfToday, -89), end: startOfTomorrow };
    if(rangeKey === 'thisMonth') return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: startOfTomorrow };
    if(rangeKey === 'lastMonth') return { start: new Date(today.getFullYear(), today.getMonth() - 1, 1), end: new Date(today.getFullYear(), today.getMonth(), 1) };
    return { start: null, end: null };
  }
  function runInInsightsDateRange(run, rangeKey){
    if(rangeKey === 'all') return true;
    const d = insightsRunDate(run);
    if(!d) return false;
    const bounds = insightsDateRangeBounds(rangeKey);
    const time = d.getTime();
    return (!bounds.start || time >= bounds.start.getTime()) && (!bounds.end || time < bounds.end.getTime());
  }
  function itemMatchesRunItem(item, runItem){
    if(!item || !runItem || Number(runItem.qty) <= 0) return false;
    const runItemId = cleanText(runItem.itemId || runItem.id || '');
    if(runItemId && item.id && runItemId === item.id) return true;
    const itemName = normalizeText(item.name);
    const runName = normalizeText(runItem.name);
    if(!itemName || !runName || itemName !== runName) return false;
    const runCat = cleanText(runItem.cat || '');
    return !runCat || runCat === item.cat;
  }
  function usableAvgPrice(value){
    const price = Number(value);
    return Number.isFinite(price) && price > 0 ? price : 0;
  }
  function purchaseInsightsForItem(item, rangeKey){
    const runs = Array.isArray(state.runHistory) ? state.runHistory : [];
    const currentAvgPrice = usableAvgPrice(item && item.avgPrice);
    let purchaseCount = 0;
    let totalQty = 0;
    let estimatedSpend = 0;
    let hasMissingPriceData = false;
    let lastRun = null;
    let lastTime = -1;
    runs.forEach((run, idx)=>{
      if(!runInInsightsDateRange(run, rangeKey)) return;
      const runItems = Array.isArray(run && run.items) ? run.items : [];
      let runPurchasedQty = 0;
      runItems.forEach(rit=>{
        if(!itemMatchesRunItem(item, rit)) return;
        const qty = Math.max(0, Number(rit.qty) || 0);
        if(qty <= 0) return;
        const receiptTotal = runItemReceiptTotal(rit);
        const runAvgPrice = usableAvgPrice(rit && rit.avgPrice);
        const price = runAvgPrice || currentAvgPrice;
        totalQty += qty;
        runPurchasedQty += qty;
        if(receiptTotal > 0){
          estimatedSpend += receiptTotal;
        } else if(price > 0){
          estimatedSpend += qty * price;
        } else {
          hasMissingPriceData = true;
        }
      });
      if(runPurchasedQty <= 0) return;
      purchaseCount++;
      const time = insightsRunTime(run) || (runs.length - idx);
      if(time > lastTime){
        lastTime = time;
        lastRun = run;
      }
    });
    return {
      totalQty,
      purchaseCount,
      estimatedSpend: Math.round(estimatedSpend * 100) / 100,
      hasMissingPriceData,
      lastPurchased: lastRun ? formatRunDate(lastRun.committedAt) : '',
      lastPurchasedTime: lastRun ? lastTime : 0
    };
  }
  function insightsSpendText(insight){
    if(!insight || Number(insight.purchaseCount) <= 0) return `Est. ${formatMoney(0)}`;
    const spend = Number(insight.estimatedSpend) || 0;
    if(insight.hasMissingPriceData && spend <= 0) return 'Missing price data';
    return `Est. ${formatMoney(spend)}${insight.hasMissingPriceData ? '+' : ''}`;
  }
  function insightsNameSort(a, b){
    const an = cleanText(a && a.item && a.item.name);
    const bn = cleanText(b && b.item && b.item.name);
    return an.localeCompare(bn, undefined, { sensitivity: 'base' });
  }
  function insightNeedsAvgPrice(item, insight){
    return !!(insight && insight.hasMissingPriceData) || usableAvgPrice(item && item.avgPrice) <= 0;
  }
  function insightMatchesFilter(row, filterKey){
    if(filterKey === 'purchased') return Number(row && row.insight && row.insight.purchaseCount) > 0;
    if(filterKey === 'missingPrice') return insightNeedsAvgPrice(row && row.item, row && row.insight);
    return true;
  }
  function sortInsightRows(rows, sortKey){
    rows.sort((a, b)=>{
      const nameResult = insightsNameSort(a, b);
      if(sortKey === 'mostPurchased'){
        const diff = (Number(b.insight.purchaseCount) || 0) - (Number(a.insight.purchaseCount) || 0);
        return diff || nameResult;
      }
      if(sortKey === 'totalQty'){
        const diff = (Number(b.insight.totalQty) || 0) - (Number(a.insight.totalQty) || 0);
        return diff || nameResult;
      }
      if(sortKey === 'estimatedSpend'){
        const diff = (Number(b.insight.estimatedSpend) || 0) - (Number(a.insight.estimatedSpend) || 0);
        return diff || nameResult;
      }
      if(sortKey === 'recent'){
        const at = Number(a.insight.lastPurchasedTime) || 0;
        const bt = Number(b.insight.lastPurchasedTime) || 0;
        if(at && bt && at !== bt) return bt - at;
        if(at && !bt) return -1;
        if(!at && bt) return 1;
        return nameResult;
      }
      return nameResult;
    });
    return rows;
  }
  function renderInsights(){
    if(!viewInsights) return;
    const runs = Array.isArray(state.runHistory) ? state.runHistory : [];
    const viewingHistory = insightsViewMode === 'history';
    viewInsights.innerHTML = `
      <div class="insights-header">
        <div>
          <h2>Insights</h2>
          <p class="muted">Quantity and estimated spending summaries are calculated from committed run history.</p>
        </div>
        <div class="insights-actions">
          <div class="insights-view-toggle" role="group" aria-label="Insights view">
            <button type="button" class="insights-view-btn${!viewingHistory ? ' active' : ''}" data-insights-view="items" aria-pressed="${!viewingHistory ? 'true' : 'false'}">Item Insights</button>
            <button type="button" class="insights-view-btn${viewingHistory ? ' active' : ''}" data-insights-view="history" aria-pressed="${viewingHistory ? 'true' : 'false'}">Run History</button>
          </div>
          <span class="pill" id="runHistoryCount">${runs.length} committed run${runs.length === 1 ? '' : 's'}</span>
        </div>
        ${viewingHistory ? '' : `
        <div class="insights-controls">
          <div class="insights-control insights-search-control">
            <label for="insightsSearch">Search items</label>
            <input id="insightsSearch" class="insights-search-input" type="search" placeholder="Search Item Insights" autocomplete="off" aria-label="Search Item Insights">
          </div>
          <div class="insights-control">
            <label for="insightsRange">Date range</label>
            <select id="insightsRange">
              <option value="all">All time</option>
              <option value="last30">Last 30 days</option>
              <option value="last90">Last 90 days</option>
              <option value="thisMonth">This month</option>
              <option value="lastMonth">Last month</option>
            </select>
          </div>
          <div class="insights-control">
            <label for="insightsSort">Sort</label>
            <select id="insightsSort">
              <option value="name">Item name A–Z</option>
              <option value="mostPurchased">Most purchased</option>
              <option value="totalQty">Highest total qty</option>
              <option value="estimatedSpend">Highest estimated spend</option>
              <option value="recent">Most recently purchased</option>
            </select>
          </div>
          <div class="insights-control">
            <label for="insightsFilter">Filter</label>
            <select id="insightsFilter">
              <option value="all">All items</option>
              <option value="purchased">Purchased in selected range</option>
              <option value="missingPrice">Missing price data</option>
            </select>
          </div>
        </div>`}
      </div>
      <div class="spacer"></div>
      ${viewingHistory ? `
      <section class="bulk-tools" id="runHistoryPanel" aria-labelledby="runHistoryHeading">
        <div class="run-history-section-heading">
          <h3 id="runHistoryHeading">Run History</h3>
        </div>
        <div class="spacer"></div>
        <div id="runHistoryList" class="list"></div>
      </section>` : '<div id="insightsList" class="insights-list"></div>'}`;

    document.querySelectorAll('[data-insights-view]').forEach(btn=>{
      btn.onclick = ()=>{
        const nextMode = btn.getAttribute('data-insights-view') === 'history' ? 'history' : 'items';
        if(insightsViewMode !== nextMode){
          insightsViewMode = nextMode;
          renderInsights();
        }
      };
    });

    if(viewingHistory){
      renderRunHistory(document.getElementById('runHistoryList'));
      return;
    }

    const searchInput = document.getElementById('insightsSearch');
    if(searchInput){
      searchInput.value = insightsSearchQuery;
      searchInput.oninput = ()=>{
        insightsSearchQuery = searchInput.value;
        renderInsightItemsList();
      };
    }

    const rangeSelect = document.getElementById('insightsRange');
    if(rangeSelect){
      rangeSelect.value = insightsDateRange;
      rangeSelect.onchange = ()=>{
        insightsDateRange = rangeSelect.value || 'all';
        renderInsights();
      };
    }
    const sortSelect = document.getElementById('insightsSort');
    if(sortSelect){
      sortSelect.value = insightsSort;
      sortSelect.onchange = ()=>{
        insightsSort = sortSelect.value || 'name';
        renderInsights();
      };
    }
    const filterSelect = document.getElementById('insightsFilter');
    if(filterSelect){
      filterSelect.value = insightsFilter;
      filterSelect.onchange = ()=>{
        insightsFilter = filterSelect.value || 'all';
        renderInsights();
      };
    }

    renderInsightItemsList();
  }
  function matchesInsightsSearch(item, query){
    const normalizedQuery = normalizeText(query);
    if(!normalizedQuery) return true;
    return normalizeText(item && item.name).startsWith(normalizedQuery);
  }
  function renderInsightItemsList(){
    const list = document.getElementById('insightsList');
    if(!list) return;
    list.innerHTML = '';

    const items = state.items.slice().sort(buildListSort);
    if(!items.length){
      list.innerHTML = '<p class="muted">No items yet. Add items from Manage to see insights here.</p>';
      return;
    }

    const baseRows = items.map(item => ({
      item,
      insight: purchaseInsightsForItem(item, insightsDateRange)
    })).filter(row => insightMatchesFilter(row, insightsFilter));

    const query = normalizeText(insightsSearchQuery);
    const insightRows = sortInsightRows(baseRows.filter(row => matchesInsightsSearch(row.item, query)), insightsSort);
    if(!insightRows.length){
      list.innerHTML = query
        ? '<p class="muted">No Item Insights match this search.</p>'
        : '<p class="muted">No items match the selected Insights filter.</p>';
      return;
    }

    insightRows.forEach(({ item, insight })=>{
      const row = document.createElement('div');
      row.className = 'item insights-row';

      const left = document.createElement('div');
      left.className = 'left';
      const title = document.createElement('div');
      title.className = 'name';
      title.textContent = item.name;
      const sub = document.createElement('div');
      sub.className = 'cat';
      sub.textContent = item.cat || '';
      const nameWrap = document.createElement('div');
      nameWrap.appendChild(title);
      if(sub.textContent) nameWrap.appendChild(sub);
      left.appendChild(nameWrap);

      const right = document.createElement('div');
      right.className = 'right insights-meta';

      const qty = document.createElement('span');
      qty.className = 'pill';
      qty.textContent = `Total qty ${insight.totalQty}`;
      right.appendChild(qty);

      const count = document.createElement('span');
      count.className = 'pill';
      count.textContent = `${insight.purchaseCount} purchase${insight.purchaseCount === 1 ? '' : 's'}`;
      right.appendChild(count);

      const spend = document.createElement('span');
      spend.className = insight.hasMissingPriceData ? 'insight-detail muted' : 'insight-detail';
      spend.textContent = insightsSpendText(insight);
      right.appendChild(spend);

      const last = document.createElement('span');
      last.className = insight.lastPurchased ? 'insight-detail' : 'insight-detail muted';
      last.textContent = insight.lastPurchased ? `Last: ${insight.lastPurchased}` : 'No purchases in range';
      right.appendChild(last);

      row.appendChild(left);
      row.appendChild(right);
      list.appendChild(row);
    });
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
  function buildSearchRank(it, query){
    if(!query) return 0;
    const name = normalizeText(it && it.name);
    const nameParts = name.split(/[^a-z0-9]+/).filter(Boolean);
    if(name.startsWith(query)) return 0;
    if(nameParts.some(part => part.startsWith(query))) return 1;
    return -1;
  }
  function matchesBuildSearch(it, query){
    if(!query) return true;
    return buildSearchRank(it, query) !== -1;
  }
  function buildSearchSort(query){
    return (a,b)=>{
      const ar = buildSearchRank(a, query);
      const br = buildSearchRank(b, query);
      if(ar !== br) return ar - br;
      return buildListSort(a,b);
    };
  }
  function getLastRunItemPool(allItems){
    const runs = Array.isArray(state.runHistory) ? state.runHistory : [];
    const lastRun = runs[0];
    if(!lastRun || !Array.isArray(lastRun.items)) return { hasRun:false, items:[] };

    const ids = new Set();
    const fallbackKeysWithoutIds = new Set();
    lastRun.items.forEach(rit=>{
      const itemId = cleanText((rit && (rit.itemId || rit.id)) || '');
      if(itemId){
        ids.add(itemId);
        return;
      }
      const name = normalizeText(rit && rit.name);
      const cat = normalizeText(rit && rit.cat);
      if(name && cat) fallbackKeysWithoutIds.add(name + '|' + cat);
    });

    const items = allItems.filter(it=>{
      if(ids.has(cleanText(it && it.id))) return true;
      const fallbackKey = normalizeText(it && it.name) + '|' + normalizeText(it && it.cat);
      return fallbackKeysWithoutIds.has(fallbackKey);
    });
    return { hasRun:true, items };
  }
  function fallbackRunItemKey(rit){
    const name = normalizeText(rit && rit.name);
    const cat = normalizeText(rit && rit.cat);
    return name && cat ? name + '|' + cat : '';
  }
  function findCurrentItemForRunItem(rit, itemsById, itemsByFallback){
    const itemId = cleanText((rit && (rit.itemId || rit.id)) || '');
    if(itemId && itemsById.has(itemId)) return itemsById.get(itemId);
    const fallbackKey = fallbackRunItemKey(rit);
    return fallbackKey && itemsByFallback.has(fallbackKey) ? itemsByFallback.get(fallbackKey) : null;
  }
  function daysBetweenDates(a,b){
    const earlier = Date.parse(a || '');
    const later = Date.parse(b || '');
    if(!Number.isFinite(earlier) || !Number.isFinite(later) || later <= earlier) return 0;
    return (later - earlier) / 86400000;
  }
  function getSmartSuggestions(allItems){
    const runs = (Array.isArray(state.runHistory) ? state.runHistory : [])
      .filter(run => Array.isArray(run && run.items) && run.items.length)
      .slice()
      .sort((a,b)=>(Date.parse(b && b.committedAt) || 0) - (Date.parse(a && a.committedAt) || 0));
    if(!runs.length || !Array.isArray(allItems) || !allItems.length) return [];

    const itemsById = new Map();
    const itemsByFallback = new Map();
    allItems.forEach(it=>{
      const itemId = cleanText(it && it.id);
      if(itemId) itemsById.set(itemId, it);
      const fallbackKey = normalizeText(it && it.name) + '|' + normalizeText(it && it.cat);
      if(fallbackKey !== '|' && !itemsByFallback.has(fallbackKey)) itemsByFallback.set(fallbackKey, it);
    });

    const recentRunItemIds = new Set();
    runs.slice(0, 3).forEach(run=>{
      const seenThisRun = new Set();
      run.items.forEach(rit=>{
        const item = findCurrentItemForRunItem(rit, itemsById, itemsByFallback);
        if(!item || seenThisRun.has(item.id)) return;
        seenThisRun.add(item.id);
        recentRunItemIds.add(item.id);
      });
    });

    const statsByItemId = new Map();
    runs.forEach(run=>{
      const committedAt = cleanText(run && run.committedAt);
      const seenThisRun = new Set();
      run.items.forEach(rit=>{
        const item = findCurrentItemForRunItem(rit, itemsById, itemsByFallback);
        if(!item || seenThisRun.has(item.id)) return;
        seenThisRun.add(item.id);
        if(!statsByItemId.has(item.id)){
          statsByItemId.set(item.id, { item, purchaseCount:0, dates:[] });
        }
        const stats = statsByItemId.get(item.id);
        stats.purchaseCount += 1;
        if(committedAt) stats.dates.push(committedAt);
      });
    });

    const nowIso = new Date().toISOString();
    return Array.from(statsByItemId.values()).map(stats=>{
      const sortedDates = stats.dates.slice().sort((a,b)=>(Date.parse(a) || 0) - (Date.parse(b) || 0));
      const gaps = [];
      for(let i=1; i<sortedDates.length; i++){
        const gap = daysBetweenDates(sortedDates[i - 1], sortedDates[i]);
        if(gap > 0) gaps.push(gap);
      }
      const avgGap = gaps.length ? gaps.reduce((sum, gap)=>sum + gap, 0) / gaps.length : 0;
      const lastPurchasedAt = sortedDates[sortedDates.length - 1] || '';
      const daysSinceLast = lastPurchasedAt ? daysBetweenDates(lastPurchasedAt, nowIso) : 0;
      const maybeDueSoon = stats.purchaseCount >= 3 && avgGap > 0 && daysSinceLast >= Math.max(1, avgGap * 0.85);
      const oftenBought = stats.purchaseCount >= 3;
      const recentlyBought = recentRunItemIds.has(stats.item.id);
      let reason = '';
      if(maybeDueSoon) reason = 'Maybe due soon';
      else if(oftenBought) reason = 'Often bought';
      else if(recentlyBought) reason = 'Recently bought';
      return Object.assign({}, stats, { avgGap, lastPurchasedAt, daysSinceLast, reason });
    }).filter(suggestion => suggestion.reason)
      .sort((a,b)=>{
        const reasonRank = { 'Maybe due soon':0, 'Often bought':1, 'Recently bought':2 };
        const byReason = (reasonRank[a.reason] ?? 9) - (reasonRank[b.reason] ?? 9);
        if(byReason !== 0) return byReason;
        if(b.purchaseCount !== a.purchaseCount) return b.purchaseCount - a.purchaseCount;
        const byDate = (Date.parse(b.lastPurchasedAt) || 0) - (Date.parse(a.lastPurchasedAt) || 0);
        if(byDate !== 0) return byDate;
        return buildListSort(a.item, b.item);
      });
  }
  function scrollToBuildTop(){
    clearBuildLetterFocus();
    try{
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }catch(e){
      window.scrollTo(0, 0);
    }
  }
  function buildTopScrollOffset(){
    const estimate = document.getElementById('buildEstimate');
    const estimateStyle = estimate && window.getComputedStyle ? window.getComputedStyle(estimate) : null;
    const estimateTop = estimateStyle ? (parseFloat(estimateStyle.top) || 0) : 0;
    const estimateHeight = estimate ? estimate.getBoundingClientRect().height : 0;
    return estimateTop + estimateHeight + 8;
  }
  function scrollElementBelowBuildEstimate(target, behavior){
    if(!target) return;
    const runScroll = ()=>{
      try{
        const targetTop = target.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({ top: Math.max(0, targetTop - buildTopScrollOffset()), behavior: behavior || 'smooth' });
      }catch(e){
        target.scrollIntoView(true);
      }
    };
    try{ requestAnimationFrame(runScroll); }catch(e){ setTimeout(runScroll, 0); }
  }
  function applyBuildLetterFocus(){
    const list = document.getElementById('buildList');
    const nav = document.getElementById('buildAlphaButtons');
    if(list){
      list.classList.toggle('build-letter-focused', !!buildFocusLetter);
      list.querySelectorAll('.swipe-wrap').forEach(wrap=>{
        const matches = !!buildFocusLetter && wrap.dataset.letter === buildFocusLetter;
        wrap.classList.toggle('build-letter-match', matches);
        wrap.classList.toggle('build-letter-dim', !!buildFocusLetter && !matches);
      });
    }
    if(nav){
      nav.querySelectorAll('button').forEach(btn=>{
        btn.classList.toggle('selected', !!buildFocusLetter && btn.dataset.buildLetter === buildFocusLetter);
      });
    }
  }
  function clearBuildLetterFocus(){
    buildFocusLetter = '';
    applyBuildLetterFocus();
  }
  function setBuildLetterFocus(letter){
    buildFocusLetter = letter || '';
    applyBuildLetterFocus();
  }
  function scrollToBuildResultsStart(){
    const list = document.getElementById('buildList');
    if(!list) return;
    const target = list.querySelector('.swipe-wrap') || list;
    scrollElementBelowBuildEstimate(target, 'smooth');
  }
  function scrollToBuildLetter(letter){
    const idPart = letter === '#' ? 'num' : letter;
    const target = document.getElementById('build-letter-' + idPart);
    if(!target) return;
    setBuildLetterFocus(letter);
    scrollElementBelowBuildEstimate(target, 'smooth');
  }
  function getKeyboardLift(){
    const vv = window.visualViewport;
    if(!vv || typeof window.innerHeight !== 'number') return 0;
    const lift = window.innerHeight - vv.height - vv.offsetTop;
    return Math.max(0, Math.ceil(lift));
  }
  function updateBuildBottomControlLayout(){
    const nav = document.getElementById('buildAlphaNav');
    if(!nav) return;
    const navHeight = nav.getBoundingClientRect().height || 0;
    const keyboardLift = getKeyboardLift();
    const extraSpace = Math.ceil(navHeight + keyboardLift + 32);
    try{ document.documentElement.style.setProperty('--build-nav-space', extraSpace + 'px'); }catch(e){}
    try{ nav.style.setProperty('--build-keyboard-lift', keyboardLift + 'px'); }catch(e){}

    const footer = document.querySelector('.footer');
    let footerLift = 0;
    if(footer && typeof window.innerHeight === 'number'){
      const bottomOffset = 8 + keyboardLift;
      const navBottomWithoutFooterLift = window.innerHeight - bottomOffset;
      const footerTop = footer.getBoundingClientRect().top;
      if(footerTop < navBottomWithoutFooterLift + 8){
        footerLift = Math.ceil(navBottomWithoutFooterLift + 8 - footerTop);
      }
    }
    try{ nav.style.setProperty('--build-nav-lift', footerLift + 'px'); }catch(e){}
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
      i.skipped = false;
    });
    save();
    try{ renderBuild(); renderShop(); }catch(e){}
  }
  function resetCheckmarks(){
    const handled = state.items.filter(i=>i.checked || i.skipped);
    if(!handled.length){
      alert('No checked or skipped items to reset.');
      return;
    }
    handled.forEach(i=>{
      i.checked = false;
      i.skipped = false;
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
    const runEntry = createRunHistoryEntry(checked);
    const totalQty = runEntry.totalQty;
    const itemWord = checked.length === 1 ? 'item' : 'items';
    const estimatePlus = runEntry.missingPriceCount > 0 ? '+' : '';
    if(!confirm(`Commit this grocery run?\n\nThis will save this run to Run history, reset Previous Run to 0 for all items, save ${checked.length} checked ${itemWord} as this run's purchased quantities, clear those checked quantities to 0, and leave unchecked current quantities unchanged.\n\nEstimated committed total: ${formatMoney(runEntry.estimatedTotal)}${estimatePlus}`)){
      return;
    }

    if(!Array.isArray(state.runHistory)) state.runHistory = [];
    state.runHistory.unshift(runEntry);

    state.items.forEach(i=>{
      i.prevQty = 0;
    });

    checked.forEach(i=>{
      i.prevQty = Number(i.qty) || 0;
      i.qty = 0;
      i.checked = false;
      i.skipped = false;
    });
    state.items.forEach(i=>{
      if(i.skipped) i.skipped = false;
    });
    save();
    try{
      renderBuild();
      renderShop();
      renderManage();
      renderInsights();
      alert(`Run committed and saved to history.\nSaved checked items: ${checked.length}\nSaved total quantity: ${totalQty}\nEstimated committed total: ${formatMoney(runEntry.estimatedTotal)}${estimatePlus}\nItems not purchased this run now show Previous Run as 0.`);
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
  function moveItemWithinCategory(itemId, direction){
    const it = state.items.find(x=>x.id===itemId);
    if(!it) return false;
    const cat = it.cat;
    const items = itemsInCategory(cat);
    const from = items.findIndex(x=>x.id===itemId);
    if(from < 0) return false;
    const to = from + direction;
    if(to < 0 || to >= items.length) return false;
    const moved = items.splice(from, 1)[0];
    items.splice(to, 0, moved);
    items.forEach((x,i)=> x.pos=i);
    return true;
  }
  function moveItemToCategory(itemId, targetCat, targetIndex, indexExcludesDragged){
    const it = state.items.find(x=>x.id===itemId);
    if(!it || !state.categories.includes(targetCat)) return false;
    const oldCat = it.cat;
    const originalIndex = oldCat === targetCat ? itemsInCategory(oldCat).findIndex(x=>x.id===itemId) : -1;
    const targetItems = itemsInCategory(targetCat).filter(x=>x.id!==itemId);
    let insertAt = Number(targetIndex);
    if(!Number.isFinite(insertAt)) insertAt = targetItems.length;
    if(!indexExcludesDragged && originalIndex >= 0 && originalIndex < insertAt) insertAt -= 1;
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
  function moveCategoryWithinOrder(categoryName, direction){
    const delta = direction < 0 ? -1 : 1;
    const currentIndex = state.categories.indexOf(categoryName);
    if(currentIndex < 0) return false;
    const targetIndex = currentIndex + delta;
    if(targetIndex < 0 || targetIndex >= state.categories.length) return false;
    const moved = state.categories.splice(currentIndex, 1)[0];
    state.categories.splice(targetIndex, 0, moved);
    return true;
  }
  function rerenderCategoryOrderViews(){
    try{ renderManage(); renderBuild(); renderShop(); }catch(e){ console.error(e) }
  }
  function restoreTouchDragSource(el){
    if(!el || !el.classList) return;
    el.classList.remove('touch-drag-source','dragging','drop-target');
    if(el.style){
      el.style.removeProperty('visibility');
      el.style.removeProperty('opacity');
      el.style.removeProperty('display');
      el.style.removeProperty('pointer-events');
      el.style.removeProperty('touch-action');
    }
  }
  function clearTouchDragArtifacts(){
    document.querySelectorAll('.touch-drag-clone').forEach(el=>{ if(el.parentNode) el.parentNode.removeChild(el); });
    document.querySelectorAll('.touch-drag-source,.dragging,.drop-target').forEach(restoreTouchDragSource);
    document.body.classList.remove('item-touch-drag-active');
  }
  function cleanupManageItemDragArtifacts(){
    clearTouchDragArtifacts();
    document.querySelectorAll('#manageList .manage-item-row, #manageList .swipe-wrap, #catList .manage-category-row').forEach(el=>{
      restoreTouchDragSource(el);
    });
  }
  function clearItemDragState(){
    clearTouchDragArtifacts();
    cleanupManageItemDragArtifacts();
  }
  function createCategorySummary(cat){
    const sum=document.createElement('summary');
    sum.className='category-summary';
    const title=document.createElement('span');
    title.className='category-title';
    title.textContent=cat;
    sum.appendChild(title);
    return sum;
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
      if(manageItemReorderMode) return;
      if(e.target && e.target.closest && e.target.closest('button,input,select,textarea')) return;
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
  const tabInsights=document.getElementById('tabInsights');
  const viewBuild=document.getElementById('viewBuild');
  const viewShop=document.getElementById('viewShop');
  const viewManage=document.getElementById('viewManage');
  const viewInsights=document.getElementById('viewInsights');

  function setTab(which){
    [tabBuild,tabShop,tabManage,tabInsights].forEach(b=> b.classList.remove('active'));
    [viewBuild,viewShop,viewManage,viewInsights].forEach(v=> v.style.display='none');

    if(which==='build'){ tabBuild.classList.add('active'); viewBuild.style.display='block' }
    if(which==='shop'){  tabShop.classList.add('active');  viewShop.style.display='block'  }
    if(which==='manage'){tabManage.classList.add('active'); viewManage.style.display='block'}
    if(which==='insights'){tabInsights.classList.add('active'); viewInsights.style.display='block'}

    const footer = document.querySelector('.footer');
    if(footer){ footer.style.display = which === 'build' ? 'flex' : 'none'; }

    if(which==='build'){
      tabBuild.style.display='inline-block';
      tabShop.style.display='none';
    } else if(which==='shop'){
      tabBuild.style.display='none';
      tabShop.style.display='inline-block';
    } else {
      tabBuild.style.display='inline-block';
      tabShop.style.display='none';
    }
  }
  tabBuild.onclick=()=>{ try{ renderBuild(); }catch(e){ console.error(e) } setTab('build') };
  tabShop.onclick = ()=>{ /* disabled: must press Finished in Build */ };
  tabManage.onclick=()=>{ try{ renderManage(); }catch(e){ console.error(e) } setTab('manage') };
  tabInsights.onclick=()=>{ try{ renderInsights(); }catch(e){ console.error(e) } setTab('insights') };

  // ----- Build List -----
  function appendBuildItemRow(buildList, it, options){
    const opts = options || {};
    const shell = createSwipeShell(it.id);
    shell.wrap.dataset.letter = opts.letter || alphaKeyForItem(it);
    if(opts.className) shell.wrap.classList.add(opts.className);
    if(opts.isFirstForLetter){
      shell.wrap.id = 'build-letter-' + (shell.wrap.dataset.letter === '#' ? 'num' : shell.wrap.dataset.letter);
    }
    const row=shell.content;

    const left=document.createElement('div'); left.className='left';
    const right=document.createElement('div'); right.className='right';
    const nameWrap=document.createElement('div'); nameWrap.className='build-item-text';
    const name=document.createElement('div'); name.className='name'; name.textContent=it.name;
    nameWrap.appendChild(name);
    if(opts.reason){
      const reason=document.createElement('div');
      reason.className='cat suggestion-reason';
      reason.textContent=opts.reason;
      nameWrap.appendChild(reason);
    }
    left.appendChild(nameWrap);

    const qty=document.createElement('div'); qty.className='qty'; qty.textContent=it.qty;
    const minus=document.createElement('button'); minus.className='btn'; minus.textContent='–'; minus.onclick=()=>{ it.qty=Math.max(0,Number(it.qty)-1); if(!Number(it.qty)) it.skipped=false; save(); renderBuild() };
    const plus=document.createElement('button'); plus.className='btn-accent'; plus.textContent='+'; plus.onclick=()=>{ it.qty=(Number(it.qty)||0)+1; it.checked=false; it.skipped=false; save(); renderBuild() };
    const prev=document.createElement('div');
    prev.className='prev-qty' + (previousRunValue(it) ? '' : ' empty');
    prev.title='Previous run quantity';
    prev.textContent=previousRunText(it);

    right.appendChild(qty); right.appendChild(minus); right.appendChild(plus); right.appendChild(prev);
    row.appendChild(left); row.appendChild(right);
    buildList.appendChild(shell.wrap);
  }
  function renderBuild(){
    ensurePositions();
    const isAllItemsMode = buildListMode === 'all';
    viewBuild.innerHTML = `
      <div class="build-actions">
        <button class="btn-accent" id="btnFinish">Finished →</button>
        <button class="btn right-controls" id="btnZeroAll">Reset all to 0</button>
      </div>
      <div class="build-view-toggle-row">
        <div class="insights-view-toggle" role="group" aria-label="Build List view">
          <button type="button" class="insights-view-btn${buildListMode === 'all' ? ' active' : ''}" data-build-list-mode="all" aria-pressed="${buildListMode === 'all' ? 'true' : 'false'}">All items</button>
          <button type="button" class="insights-view-btn${buildListMode === 'lastRun' ? ' active' : ''}" data-build-list-mode="lastRun" aria-pressed="${buildListMode === 'lastRun' ? 'true' : 'false'}">Last run</button>
          <button type="button" class="insights-view-btn${buildListMode === 'suggested' ? ' active' : ''}" data-build-list-mode="suggested" aria-pressed="${buildListMode === 'suggested' ? 'true' : 'false'}">Suggested</button>
        </div>
      </div>
      ${isAllItemsMode ? `
        <div class="build-all-search-card" aria-label="All items search-first add flow">
          <div class="build-all-search-row">
            <input id="buildSearchInput" class="build-search-input build-all-search-input" type="search" placeholder="Search or add an item" autocomplete="off" aria-label="Search or add an item">
            <button class="btn build-all-search-clear" id="btnBuildSearchClear" type="button">Clear</button>
          </div>
          <p id="buildAllHelper" class="muted build-all-helper"></p>
          <div id="buildAllResults" class="build-flat-list build-all-results"></div>
        </div>` : ''}
      <div id="buildEstimate" class="estimate-sticky"></div>
      ${isAllItemsMode ? '' : `
        <div id="buildAlphaNav" class="alpha-nav build-search-nav" aria-label="Build List search and alphabet quick jump">
          <div id="buildAlphaView" class="build-alpha-view">
            <div id="buildAlphaButtons" class="alpha-buttons build-alpha-buttons" aria-label="Alphabet quick jump"></div>
          </div>
          <div id="buildSearchView" class="build-search-row" hidden>
            <input id="buildSearchInput" class="build-search-input" type="search" placeholder="Search Build List" autocomplete="off" aria-label="Search Build List">
            <button class="btn build-search-clear" id="btnBuildSearchClear" type="button">Clear</button>
            <button class="btn build-search-clear" id="btnBuildShowAlpha" type="button">A-Z</button>
          </div>
        </div>`}
      <div id="buildList" class="build-flat-list${isAllItemsMode ? ' build-current-list' : ''}"></div>`;

    const buildEstimate = document.getElementById('buildEstimate');
    const buildList = document.getElementById('buildList');
    const alphaButtons = document.getElementById('buildAlphaButtons');
    const alphaView = document.getElementById('buildAlphaView');
    const searchView = document.getElementById('buildSearchView');
    const searchInput = document.getElementById('buildSearchInput');
    const clearBtn = document.getElementById('btnBuildSearchClear');
    const showAlphaBtn = document.getElementById('btnBuildShowAlpha');
    const buildModeButtons = viewBuild.querySelectorAll('[data-build-list-mode]');
    const buildAllHelper = document.getElementById('buildAllHelper');
    const buildAllResults = document.getElementById('buildAllResults');

    renderEstimatePill(buildEstimate, { includeSkipped: true });
    if(searchInput) searchInput.value = buildSearchQuery;

    function findBuildQuickAddDuplicate(name){
      const target = normalizeText(name);
      if(!target) return null;
      return state.items.find(it => normalizeText(it && it.name) === target) || null;
    }

    function defaultQuickAddCategory(){
      const other = findCategoryByName('Other');
      if(other) return other;
      if(state.categories && state.categories.length) return state.categories[0];
      const result = ensureCategory('Other');
      return result.name || 'Other';
    }

    function createBuildQuickAddItem(name){
      const itemName = cleanText(name);
      if(!itemName) return null;
      const duplicate = findBuildQuickAddDuplicate(itemName);
      if(duplicate) return duplicate;
      const cat = defaultQuickAddCategory();
      const item = { id:id(), name:itemName, cat, qty:1, prevQty:0, pos: nextPos(cat), checked:false, skipped:false, avgPrice:0 };
      state.items.push(item);
      save();
      return item;
    }

    function appendBuildCategoryHeader(container, cat){
      const header = document.createElement('div');
      header.className = 'build-current-cat';
      header.textContent = cat || 'Other';
      container.appendChild(header);
    }

    function drawAllItemsBuildList(){
      const query = normalizeText(buildSearchQuery);
      const allItems = state.items.slice().sort(buildListSort);
      const draftItems = nonZero().sort(sortItems);
      if(buildAllHelper){
        buildAllHelper.textContent = draftItems.length ? 'Type to add more items' : 'Type to start adding items';
      }
      if(isAllItemsMode && clearBtn){
        clearBtn.disabled = !buildSearchQuery;
      }
      if(buildAllResults){
        buildAllResults.innerHTML = '';
        if(query){
          const matches = allItems
            .filter(it => matchesBuildSearch(it, query))
            .sort(buildSearchSort(query))
            .slice(0, 5);
          matches.forEach(it=> appendBuildItemRow(buildAllResults, it));

          const proposedName = cleanText(buildSearchQuery);
          const exactDuplicate = findBuildQuickAddDuplicate(proposedName);
          if(proposedName && !exactDuplicate){
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'build-quick-add-option';
            addBtn.textContent = `+ Add “${proposedName}”`;
            addBtn.onclick = ()=>{
              const created = createBuildQuickAddItem(proposedName);
              if(created){
                buildSearchQuery = created.name;
                renderBuild();
                try{
                  const nextSearch = document.getElementById('buildSearchInput');
                  if(nextSearch){ nextSearch.focus(); nextSearch.select(); }
                }catch(e){}
              }
            };
            buildAllResults.appendChild(addBtn);
          }
          if(!matches.length && exactDuplicate){
            buildAllResults.innerHTML = '<p class="muted build-all-empty">That item already exists. Keep typing to find it above.</p>';
          }
        }
      }

      buildList.innerHTML = '';
      const divider = document.createElement('div');
      divider.className = 'build-current-divider';
      divider.innerHTML = '<span>Current list</span>';
      buildList.appendChild(divider);
      if(!draftItems.length){
        const empty = document.createElement('p');
        empty.className = 'muted build-current-empty';
        empty.textContent = 'No items selected yet.';
        buildList.appendChild(empty);
        return;
      }
      let currentCat = null;
      draftItems.forEach(it=>{
        if(it.cat !== currentCat){
          currentCat = it.cat;
          appendBuildCategoryHeader(buildList, currentCat);
        }
        appendBuildItemRow(buildList, it, { className:'build-current-item' });
      });
    }

    function drawBrowseBuildList(){
      const query = normalizeText(buildSearchQuery);
      const allItems = state.items.slice().sort(buildListSort);
      const lastRunPool = buildListMode === 'lastRun' ? getLastRunItemPool(allItems) : { hasRun:true, items:allItems };
      const suggestionPool = buildListMode === 'suggested' ? getSmartSuggestions(allItems) : [];
      const itemPool = buildListMode === 'lastRun' ? lastRunPool.items : (buildListMode === 'suggested' ? suggestionPool : allItems);
      const items = query
        ? itemPool.filter(entry => matchesBuildSearch(entry && entry.item ? entry.item : entry, query)).sort((a,b)=>buildSearchSort(query)(a && a.item ? a.item : a, b && b.item ? b.item : b))
        : itemPool;
      const letters = ['#','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
      const activeLetters = new Set(items.map(entry => alphaKeyForItem(entry && entry.item ? entry.item : entry)));
      if(buildFocusLetter && !activeLetters.has(buildFocusLetter)) buildFocusLetter = '';

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
        btn.dataset.buildLetter = letter;
        if(buildFocusLetter === letter) btn.classList.add('selected');
        btn.disabled = !activeLetters.has(letter);
        btn.onclick = ()=> scrollToBuildLetter(letter);
        alphaButtons.appendChild(btn);
      });

      const searchToggleBtn = document.createElement('button');
      searchToggleBtn.type = 'button';
      searchToggleBtn.className = 'btn build-search-toggle';
      searchToggleBtn.textContent = 'Search';
      searchToggleBtn.onclick = ()=> setBuildControlMode('search', true);
      alphaButtons.appendChild(searchToggleBtn);

      buildList.innerHTML = '';
      if(buildListMode === 'lastRun' && !lastRunPool.hasRun){
        buildList.innerHTML = '<p class="muted">No committed runs yet. Commit a shopping run to use Last run.</p>';
        applyBuildLetterFocus();
        return;
      }
      if(!allItems.length){
        buildList.innerHTML = '<p class="muted">No items yet. Add items from Manage.</p>';
        applyBuildLetterFocus();
        return;
      }
      if(buildListMode === 'lastRun' && !itemPool.length){
        buildList.innerHTML = '<p class="muted">No current items were found from the last run.</p>';
        applyBuildLetterFocus();
        return;
      }
      if(buildListMode === 'suggested' && !itemPool.length){
        buildList.innerHTML = '<p class="muted">No smart suggestions yet. Commit a few shopping runs and suggestions will appear here.</p>';
        applyBuildLetterFocus();
        return;
      }
      if(!items.length){
        buildList.innerHTML = buildListMode === 'lastRun' && query
          ? '<p class="muted">No last-run items match this search.</p>'
          : (buildListMode === 'suggested' && query
            ? '<p class="muted">No suggested items match this search.</p>'
            : '<p class="muted">No matching items. Clear the search to show the full Build List.</p>');
        applyBuildLetterFocus();
        return;
      }

      const anchoredLetters = new Set();
      items.forEach(entry=>{
        const it = entry && entry.item ? entry.item : entry;
        const letter = alphaKeyForItem(it);
        const isFirstForLetter = !anchoredLetters.has(letter);
        if(isFirstForLetter) anchoredLetters.add(letter);
        appendBuildItemRow(buildList, it, {
          letter,
          isFirstForLetter,
          reason: entry && entry.item ? entry.reason : ''
        });
      });
      applyBuildLetterFocus();
    }

    function drawBuildList(){
      if(isAllItemsMode) drawAllItemsBuildList();
      else drawBrowseBuildList();
    }

    function setBuildControlMode(mode, focusSearch){
      if(isAllItemsMode) return;
      buildControlMode = mode === 'search' ? 'search' : 'alpha';
      alphaView.hidden = buildControlMode !== 'alpha';
      searchView.hidden = buildControlMode !== 'search';
      updateBuildBottomControlLayout();
      if(focusSearch && buildControlMode === 'search'){
        try{ searchInput.focus(); }catch(e){}
      }
    }

    buildModeButtons.forEach(btn=>{
      btn.onclick = ()=>{
        const nextMode = btn.dataset.buildListMode === 'lastRun' ? 'lastRun' : (btn.dataset.buildListMode === 'suggested' ? 'suggested' : 'all');
        if(buildListMode !== nextMode){
          const leavingAllItemsMode = buildListMode === 'all' && nextMode !== 'all';
          buildListMode = nextMode;
          buildFocusLetter = '';
          if(leavingAllItemsMode){
            buildSearchQuery = '';
            buildControlMode = 'alpha';
          }
          renderBuild();
        }
      };
    });

    if(searchInput){
      searchInput.addEventListener('input', ()=>{
        buildSearchQuery = searchInput.value;
        buildFocusLetter = '';
        drawBuildList();
        updateBuildBottomControlLayout();
        if(!isAllItemsMode) scrollToBuildResultsStart();
      });
      searchInput.addEventListener('keydown', (e)=>{
        if(e.key === 'Escape'){
          e.preventDefault();
          buildSearchQuery = '';
          buildFocusLetter = '';
          searchInput.value = '';
          drawBuildList();
          updateBuildBottomControlLayout();
          if(!isAllItemsMode) scrollToBuildResultsStart();
        }
      });
    }
    if(clearBtn){
      if(isAllItemsMode){
        clearBtn.addEventListener('pointerdown', (e)=>{
          e.preventDefault();
        });
      }
      clearBtn.onclick = ()=>{
        buildSearchQuery = '';
        buildFocusLetter = '';
        searchInput.value = '';
        drawBuildList();
        updateBuildBottomControlLayout();
        if(!isAllItemsMode) scrollToBuildResultsStart();
        searchInput.focus();
      };
    }
    if(showAlphaBtn){
      showAlphaBtn.onclick = ()=>{
        buildSearchQuery = '';
        buildFocusLetter = '';
        searchInput.value = '';
        drawBuildList();
        setBuildControlMode('alpha');
      };
    }

    drawBuildList();
    setBuildControlMode(buildControlMode);
    updateBuildBottomControlLayout();
    try{
      window.removeEventListener('scroll', updateBuildBottomControlLayout);
      window.removeEventListener('resize', updateBuildBottomControlLayout);
      if(!isAllItemsMode){
        window.addEventListener('scroll', updateBuildBottomControlLayout, { passive:true });
        window.addEventListener('resize', updateBuildBottomControlLayout);
      }
      if(window.visualViewport){
        window.visualViewport.removeEventListener('resize', updateBuildBottomControlLayout);
        window.visualViewport.removeEventListener('scroll', updateBuildBottomControlLayout);
        if(!isAllItemsMode){
          window.visualViewport.addEventListener('resize', updateBuildBottomControlLayout);
          window.visualViewport.addEventListener('scroll', updateBuildBottomControlLayout);
        }
      }
      setTimeout(updateBuildBottomControlLayout, 0);
    }catch(e){}
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
        <button class="btn" id="btnResetCheckmarks">Reset checked/skipped</button>
      </div>
      <div id="shopEstimate" class="estimate-sticky"></div>
      <p class="muted shop-instruction">Tap to check off. Press and hold to skip or unskip.</p>
      <div class="spacer"></div>
      <div id="shopList"></div>`;
    document.getElementById('btnBack').onclick = ()=>{ try{ renderBuild(); }catch(e){ console.error(e) } setTab('build') };
    document.getElementById('btnCommitRun').onclick = commitRun;
    document.getElementById('btnResetCheckmarks').onclick = resetCheckmarks;
    renderEstimatePill(document.getElementById('shopEstimate'));

    const shopList = document.getElementById('shopList');
    const items = nonZero().sort(sortItems);
    const byCat = groupBy(items,'cat');
    const isHandled = item => !!(item && (item.checked || item.skipped));
    const orderedCats = Object.keys(byCat).sort((a,b)=>{
      const aDone = byCat[a].length > 0 && byCat[a].every(isHandled);
      const bDone = byCat[b].length > 0 && byCat[b].every(isHandled);
      if(aDone !== bDone) return aDone ? 1 : -1;
      return catIndex(a)-catIndex(b);
    });

    if(!orderedCats.length){
      shopList.innerHTML = '<p class="muted">No items yet.</p>';
      return;
    }

    orderedCats.forEach(cat=>{
      const catItems = byCat[cat];
      const catComplete = catItems.length > 0 && catItems.every(isHandled);
      const block=document.createElement('div');
      block.className='shop-cat-block' + (catComplete ? ' completed' : '');
      block.dataset.cat = cat;

      const heading=document.createElement('div');
      heading.className='shop-cat-heading';
      heading.textContent=cat;
      block.appendChild(heading);

      const list=document.createElement('div');
      list.className='shop-cat-list';

      catItems.slice().sort((a,b)=>{
        const ah = isHandled(a);
        const bh = isHandled(b);
        if(ah !== bh) return ah ? 1 : -1;
        return sortItems(a,b);
      }).forEach(it=>{
        const row=document.createElement('div');
        row.className='shop-item' + (it.checked ? ' checked' : '') + (it.skipped ? ' skipped' : '');
        row.setAttribute('role','button');
        row.setAttribute('aria-pressed', it.checked ? 'true' : 'false');
        row.setAttribute('aria-label', `${it.name}. ${it.checked ? 'Checked' : (it.skipped ? 'Skipped' : 'Not checked')}. Tap to check off. Press and hold to skip or unskip.`);

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

        let longPressTimer = null;
        let longPressTriggered = false;
        let startX = 0;
        let startY = 0;
        const clearLongPressTimer = ()=>{
          if(longPressTimer){
            clearTimeout(longPressTimer);
            longPressTimer = null;
          }
        };
        const refreshAfterShopChange = (wasCatComplete)=>{
          save();
          renderEstimatePill(document.getElementById('shopEstimate'));
          const currentCatItems = state.items.filter(i => i.cat === cat && Number(i.qty) > 0);
          const isCatComplete = currentCatItems.length > 0 && currentCatItems.every(isHandled);
          if(isCatComplete && !wasCatComplete){
            block.classList.add('fading-out');
            setTimeout(()=> renderShop(cat), 250);
          } else {
            renderShop();
          }
        };
        row.addEventListener('pointerdown', e=>{
          if(e.button !== undefined && e.button !== 0) return;
          startX = e.clientX;
          startY = e.clientY;
          longPressTriggered = false;
          clearLongPressTimer();
          try{ row.setPointerCapture(e.pointerId); }catch(err){}
          longPressTimer = setTimeout(()=>{
            longPressTimer = null;
            longPressTriggered = true;
            if(it.checked) return;
            const wasCatComplete = catItems.length > 0 && catItems.every(isHandled);
            it.skipped = !it.skipped;
            it.checked = false;
            refreshAfterShopChange(wasCatComplete);
          }, 600);
        });
        row.addEventListener('pointermove', e=>{
          if(!longPressTimer) return;
          if(Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10){
            clearLongPressTimer();
          }
        });
        row.addEventListener('pointerup', clearLongPressTimer);
        row.addEventListener('pointercancel', clearLongPressTimer);
        row.addEventListener('contextmenu', e=> e.preventDefault());
        row.onclick = ()=>{
          if(longPressTriggered){
            longPressTriggered = false;
            return;
          }
          if(it.skipped) return;
          const wasCatComplete = catItems.length > 0 && catItems.every(isHandled);
          it.checked = !it.checked;
          if(it.checked) it.skipped = false;
          refreshAfterShopChange(wasCatComplete);
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
    clearItemDragState();
    viewManage.innerHTML = `
      <div class="manage-view-toggle-row">
        <div class="insights-view-toggle manage-view-toggle" role="group" aria-label="Manage view">
          <button type="button" class="insights-view-btn${manageView === 'items' ? ' active' : ''}" data-manage-view="items" aria-pressed="${manageView === 'items' ? 'true' : 'false'}">Items</button>
          <button type="button" class="insights-view-btn${manageView === 'categories' ? ' active' : ''}" data-manage-view="categories" aria-pressed="${manageView === 'categories' ? 'true' : 'false'}">Categories</button>
          <button type="button" class="insights-view-btn${manageView === 'stores' ? ' active' : ''}" data-manage-view="stores" aria-pressed="${manageView === 'stores' ? 'true' : 'false'}">Stores</button>
        </div>
      </div>
      <div class="spacer"></div>
      <div id="manageSubView"></div>`;
    viewManage.querySelectorAll('[data-manage-view]').forEach(btn=>{
      btn.onclick = ()=>{
        manageView = ['items','categories','stores'].includes(btn.dataset.manageView) ? btn.dataset.manageView : 'items';
        if(manageView !== 'items') manageItemReorderMode = false;
        if(manageView !== 'categories') manageCategoryReorderMode = false;
        renderManage();
      };
    });
    const subView = document.getElementById('manageSubView');
    if(manageView === 'categories') renderManageCategories(subView);
    else if(manageView === 'stores') renderManageStores(subView);
    else renderManageItems(subView);
    clearTouchDragArtifacts();
  }

  function renderManageItems(target){
    clearItemDragState();
    cleanupManageItemDragArtifacts();
    ensurePositions();
    (target || viewManage).innerHTML = `
      <div class="grid">
        <div class="col-12 row" style="gap:6px;flex-wrap:wrap">
          <input id="newItemName" placeholder="Item name" style="flex:2" />
          <select id="newItemCat" style="flex:1"></select>
          <button class="btn-accent" id="btnAddItem">Add Item</button>
        </div>
      </div>
      <div class="spacer"></div>
      <div class="manage-reorder-toolbar">
        <button type="button" class="btn" id="btnToggleItemReorder" aria-pressed="${manageItemReorderMode ? 'true' : 'false'}">${manageItemReorderMode ? 'Done Reordering' : 'Reorder Items'}</button>
        <span class="muted manage-reorder-help">${manageItemReorderMode ? 'Use arrows to move items within their current category.' : 'Use reorder mode for reliable mobile item sorting.'}</span>
      </div>
      <div class="spacer"></div>
      <section class="data-safety-panel" id="dataSafetyPanel" aria-labelledby="dataSafetyHeading">
        <div class="data-safety-heading">
          <h3 id="dataSafetyHeading">Data Safety / Backup</h3>
          <span class="pill">Local only</span>
        </div>
        <p class="muted data-safety-help">Export backup JSON before major changes, imports, or wiping this browser. This is the safe backup action for your grocery data.</p>
        <div class="data-safety-stats" aria-label="Backup and data summary">
          <div><span>App version</span><strong data-backup-stat="version"></strong></div>
          <div><span>Items</span><strong data-backup-stat="items"></strong></div>
          <div><span>Categories</span><strong data-backup-stat="categories"></strong></div>
          <div><span>Stores</span><strong data-backup-stat="stores"></strong></div>
          <div><span>Committed runs</span><strong data-backup-stat="runs"></strong></div>
          <div class="data-safety-last"><span>Last backup</span><strong data-backup-stat="last-backup"></strong></div>
        </div>
        <div class="controls data-safety-actions">
          <button class="btn" id="btnExport">Export backup JSON</button>
          <input type="file" id="fileImport" accept="application/json" style="display:none" />
          <button class="btn" id="btnImport">Import JSON</button>
          <button class="btn-danger right-controls" id="btnWipe">Wipe all data</button>
        </div>
      </section>
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
      <div id="manageList" class="${manageItemReorderMode ? 'reorder-mode' : ''}"></div>`;

    refreshDataSafetyPanel();

    const reorderToggle = document.getElementById('btnToggleItemReorder');
    if(reorderToggle){
      reorderToggle.onclick = ()=>{
        clearItemDragState();
        manageItemReorderMode = !manageItemReorderMode;
        renderManage();
      };
    }

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
        duplicate.skipped = false;
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
      const stats = getDataSafetyStats(state);
      const exportedAt = new Date().toISOString();
      const dataOut = {
        appVersion: APP_VERSION,
        exportMetadata: {
          appVersion: APP_VERSION,
          exportedAt,
          itemCount: stats.itemCount,
          categoryCount: stats.categoryCount,
          storeCount: stats.storeCount,
          committedRunCount: stats.committedRunCount
        },
        title: state.title,
        categories: state.categories,
        stores: state.stores || [],
        items: state.items,
        runHistory: state.runHistory || []
      };
      const blob = new Blob([JSON.stringify(dataOut,null,2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `grocery-tally-backup-v${APP_VERSION}-${backupDateStamp(new Date(exportedAt))}.json`;
      a.click();
      setTimeout(()=> URL.revokeObjectURL(a.href), 0);
      setLastBackupAt(exportedAt);
      refreshDataSafetyPanel();
    };

    const fileInput = document.getElementById('fileImport');
    document.getElementById('btnImport').onclick = ()=> fileInput.click();
    fileInput.onchange = async (e)=>{
      const file=e.target.files[0];
      if(!file) return;
      try{
        const text=await file.text();
        const data = JSON.parse(text);
        if(!data || !Array.isArray(data.categories) || !Array.isArray(data.items)) throw new Error('Invalid backup format');
        const confirmed = confirm(makeImportPreview(data));
        if(!confirmed){
          fileInput.value='';
          return;
        }
        state = { title: data.title || state.title || 'Grocery Tally', categories: data.categories, stores: Array.isArray(data.stores) ? data.stores : [], items: data.items, runHistory: Array.isArray(data.runHistory) ? data.runHistory : [] };
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
      const message = 'Wipe all grocery data stored in this browser?\n\nThis deletes your grocery list, categories, stores, quantities, checked items, run history, and last backup timestamp on this device.\n\nExport backup JSON first unless you are absolutely sure. This cannot be undone.\n\nContinue?';
      if(confirm(message)){
        state = { title: state.title || 'Grocery Tally', categories: DEFAULT_CATS.slice(), items: [], stores: [], runHistory: [] };
        clearLastBackupAt();
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

      items.forEach((it,idx)=>{
        const shell = createSwipeShell(it.id);
        const row=shell.content;
        row.classList.add('manage-item-row');
        row.dataset.index=idx;
        const left=document.createElement('div'); left.className='left';
        const right=document.createElement('div'); right.className='right';
        const name=document.createElement('div'); name.className='name'; name.textContent=it.name;
        const itemMeta=document.createElement('div'); itemMeta.className='cat'; itemMeta.textContent=it.cat;

        const editPanel=document.createElement('div');
        editPanel.className='item-edit-card';
        editPanel.hidden=true;
        editPanel.setAttribute('aria-label', `Edit ${it.name}`);

        const editHeading=document.createElement('div'); editHeading.className='item-edit-heading';
        const editTitle=document.createElement('strong'); editTitle.textContent=`Editing: ${it.name}`;
        const editHelp=document.createElement('p'); editHelp.className='muted item-edit-help'; editHelp.textContent='Update the item details, then save.';
        editHeading.appendChild(editTitle); editHeading.appendChild(editHelp);

        const editGrid=document.createElement('div'); editGrid.className='item-edit-grid';
        const nameField=document.createElement('label'); nameField.className='item-edit-field item-edit-name-field';
        const nameLabel=document.createElement('span'); nameLabel.className='price-label'; nameLabel.textContent='Item name';
        const input=document.createElement('input'); input.className='manage-name-input'; input.value=it.name; input.autocomplete='off';
        nameField.appendChild(nameLabel); nameField.appendChild(input);

        const categoryField=document.createElement('label'); categoryField.className='item-edit-field';
        const categoryLabel=document.createElement('span'); categoryLabel.className='price-label'; categoryLabel.textContent='Category';
        const categorySelect=document.createElement('select'); categorySelect.className='manage-category-select'; categorySelect.setAttribute('aria-label','Item category');
        state.categories.forEach(categoryName=>{
          const opt=document.createElement('option'); opt.value=categoryName; opt.textContent=categoryName; categorySelect.appendChild(opt);
        });
        categorySelect.value = it.cat;
        categoryField.appendChild(categoryLabel); categoryField.appendChild(categorySelect);

        const priceField=document.createElement('label'); priceField.className='item-edit-field';
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
        priceField.appendChild(priceLabel); priceField.appendChild(priceInput);

        const storesField=document.createElement('fieldset'); storesField.className='item-edit-stores';
        const storesLegend=document.createElement('legend'); storesLegend.textContent='Stores';
        const storesList=document.createElement('div'); storesList.className='item-edit-store-list';
        const availableStores=sortedStores();
        const selectedStoreIds=new Set(Array.isArray(it.storeIds) ? it.storeIds : []);
        if(availableStores.length){
          availableStores.forEach(store=>{
            const storeLabel=document.createElement('label'); storeLabel.className='item-edit-store-option';
            const storeCheckbox=document.createElement('input');
            storeCheckbox.type='checkbox';
            storeCheckbox.value=store.id;
            storeCheckbox.checked=selectedStoreIds.has(store.id);
            const storeName=document.createElement('span'); storeName.textContent=store.name;
            storeLabel.appendChild(storeCheckbox);
            storeLabel.appendChild(storeName);
            storesList.appendChild(storeLabel);
          });
        } else {
          const noStores=document.createElement('p'); noStores.className='muted item-edit-help'; noStores.textContent='No stores yet. Add stores in Manage → Stores to assign them here.';
          storesList.appendChild(noStores);
        }
        storesField.appendChild(storesLegend); storesField.appendChild(storesList);

        editGrid.appendChild(nameField);
        editGrid.appendChild(categoryField);
        editGrid.appendChild(priceField);
        editGrid.appendChild(storesField);

        const editActions=document.createElement('div'); editActions.className='item-edit-actions';
        const saveBtn=document.createElement('button'); saveBtn.className='btn-accent'; saveBtn.textContent='Save';
        const cancelBtn=document.createElement('button'); cancelBtn.className='btn'; cancelBtn.textContent='Cancel';
        editActions.appendChild(saveBtn); editActions.appendChild(cancelBtn);
        editPanel.appendChild(editHeading);
        editPanel.appendChild(editGrid);
        editPanel.appendChild(editActions);

        const edit=document.createElement('button'); edit.className='btn'; edit.textContent='Edit';
        const moveUp=document.createElement('button'); moveUp.type='button'; moveUp.className='btn reorder-btn'; moveUp.textContent='↑'; moveUp.setAttribute('aria-label', `Move ${it.name} up`);
        const moveDown=document.createElement('button'); moveDown.type='button'; moveDown.className='btn reorder-btn'; moveDown.textContent='↓'; moveDown.setAttribute('aria-label', `Move ${it.name} down`);
        const isFirst = idx === 0;
        const isLast = idx === items.length - 1;
        moveUp.disabled = isFirst;
        moveDown.disabled = isLast;
        moveUp.onclick = ()=>{
          const previousScrollY = currentScrollY();
          if(moveItemWithinCategory(it.id, -1)){
            save();
            rerenderItemViews();
            restoreWindowScrollY(previousScrollY);
          }
        };
        moveDown.onclick = ()=>{
          const previousScrollY = currentScrollY();
          if(moveItemWithinCategory(it.id, 1)){
            save();
            rerenderItemViews();
            restoreWindowScrollY(previousScrollY);
          }
        };

        row.appendChild(left);
        left.appendChild(name);
        left.appendChild(itemMeta);
        row.appendChild(right);
        if(manageItemReorderMode){
          row.classList.add('reordering');
          shell.wrap.classList.add('reorder-mode');
          right.appendChild(moveUp);
          right.appendChild(moveDown);
        } else {
          right.appendChild(edit);
        }
        function setItemDragEnabled(enabled){
          row.draggable = false;
        }
        setItemDragEnabled(false);

        function enterEdit(){
          row.classList.add('editing');
          shell.wrap.classList.remove('revealed');
          setItemDragEnabled(false);
          input.value = it.name;
          priceInput.value=formatPriceInput(it.avgPrice);
          categorySelect.value = state.categories.includes(it.cat) ? it.cat : (state.categories[0] || '');
          const activeStoreIds = new Set(Array.isArray(it.storeIds) ? it.storeIds : []);
          storesList.querySelectorAll('input[type="checkbox"]').forEach(checkbox=>{
            checkbox.checked = activeStoreIds.has(checkbox.value);
          });
          editTitle.textContent=`Editing: ${it.name}`;
          editPanel.hidden=false;
          edit.style.display='none';
          input.focus(); input.select();
          scrollManageEditRowIntoView(editPanel);
        }
        function exitEdit(){
          row.classList.remove('editing');
          setItemDragEnabled(true);
          editPanel.hidden=true;
          priceInput.value = formatPriceInput(it.avgPrice);
          categorySelect.value = state.categories.includes(it.cat) ? it.cat : (state.categories[0] || '');
          edit.style.display='inline-block';
          input.value = it.name;
        }
        edit.onclick = enterEdit;
        cancelBtn.onclick = exitEdit;
        [input, priceInput, categorySelect].forEach(control=>{
          control.addEventListener('keydown', (e)=>{
            if(e.key==='Enter'){
              e.preventDefault();
              saveBtn.click();
            } else if(e.key==='Escape'){
              e.preventDefault();
              cancelBtn.click();
            }
          });
        });
        storesList.addEventListener('keydown', (e)=>{
          if(e.key==='Escape'){
            e.preventDefault();
            cancelBtn.click();
          }
        });
        saveBtn.onclick = ()=>{
          const nv = input.value.trim();
          if(!nv){ alert('Item name cannot be empty.'); return }
          const parsedPrice = parsePriceInput(priceInput.value);
          const selectedCat = state.categories.includes(categorySelect.value) ? categorySelect.value : it.cat;
          const oldCat = it.cat;
          const categoryChanged = selectedCat && selectedCat !== oldCat;
          const checkedStoreIds = Array.from(storesList.querySelectorAll('input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
          it.name = nv;
          it.avgPrice = parsedPrice;
          it.storeIds = checkedStoreIds;
          if(validPriceEntries(it).length > 0) it.receiptPreviousAvgPrice = parsedPrice;
          if(categoryChanged){
            moveItemToCategory(it.id, selectedCat, itemsInCategory(selectedCat).filter(x=>x.id!==it.id).length, true);
          }
          normalizeStateShape();
          save();
          name.textContent = it.name;
          itemMeta.textContent = it.cat;
          editTitle.textContent = `Editing: ${it.name}`;
          priceInput.value = formatPriceInput(it.avgPrice);
          categorySelect.value = state.categories.includes(it.cat) ? it.cat : (state.categories[0] || '');
          if(categoryChanged){
            renderManage();
          } else {
            exitEdit();
          }
          renderBuild();
          renderShop();
          renderInsights();
        };

        list.appendChild(shell.wrap);
        list.appendChild(editPanel);
      });

      sec.appendChild(list);
      ml.appendChild(sec);
    });
    cleanupManageItemDragArtifacts();
  }

  // ----- Manage Stores -----
  function renderManageStores(target){
    normalizeStateShape();
    const stores = sortedStores();
    (target || viewManage).innerHTML = `
      <div class="row" style="gap:6px;flex-wrap:wrap">
        <input id="newStoreName" placeholder="Store name" style="flex:2" />
        <button class="btn-accent" id="btnAddStore">Add store</button>
      </div>
      <p class="muted store-help">Stores are a foundation for future item locations, store maps, and route planning.</p>
      <div class="spacer"></div>
      <div id="storeList" class="list"></div>`;

    const storeList = document.getElementById('storeList');
    if(!stores.length){
      const empty = document.createElement('div');
      empty.className = 'item store-empty';
      empty.textContent = 'No stores yet. Add stores now so future updates can connect items, prices, and store layouts.';
      storeList.appendChild(empty);
    } else {
      stores.forEach(store=> renderStoreRow(storeList, store));
    }

    const addBtn = document.getElementById('btnAddStore');
    const input = document.getElementById('newStoreName');
    addBtn.onclick = ()=>{
      const name = cleanText(input.value);
      if(!name){ alert('Store name cannot be empty.'); return; }
      if(findStoreByName(name)){ alert('That store already exists.'); return; }
      state.stores.push({ id: 'store_' + id(), name, pos: nextStorePos() });
      save();
      renderManage();
    };
    input.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter'){
        e.preventDefault();
        addBtn.click();
      }
    });
  }

  function renderStoreRow(container, store){
    const row=document.createElement('div');
    row.className='item manage-store-row';
    row.draggable=false;

    const left=document.createElement('div'); left.className='left';
    const right=document.createElement('div'); right.className='right';
    const label=document.createElement('div'); label.textContent=store.name; label.className='name';
    const input=document.createElement('input'); input.value=store.name; input.placeholder='Store name'; input.style.display='none';
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
      input.value = store.name;
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
      const newName = cleanText(input.value);
      if(!newName){ alert('Store name cannot be empty.'); return; }
      if(findStoreByName(newName, store.id)){ alert('That store already exists.'); return; }
      store.name = newName;
      save();
      renderManage();
    };
    del.onclick = ()=>{
      if(!confirm('Delete this store? This cannot be undone.')) return;
      state.stores = (state.stores || []).filter(candidate => candidate.id !== store.id);
      state.items.forEach(item=>{
        if(Array.isArray(item.storeIds)) item.storeIds = item.storeIds.filter(storeId => storeId !== store.id);
      });
      save();
      renderManage();
    };

    row.appendChild(left); left.appendChild(label); left.appendChild(input);
    row.appendChild(right); right.appendChild(edit); right.appendChild(saveBtn); right.appendChild(cancelBtn); right.appendChild(del);
    container.appendChild(row);
  }

  // ----- Manage Categories -----
  function renderManageCategories(target){
    (target || viewManage).innerHTML = `
      <div class="row" style="gap:6px;flex-wrap:wrap">
        <input id="newCatName" placeholder="Category name" style="flex:2" ${manageCategoryReorderMode ? 'disabled' : ''} />
        <button class="btn-accent" id="btnAddCat" ${manageCategoryReorderMode ? 'disabled' : ''}>Add Category</button>
      </div>
      <div class="spacer"></div>
      <div class="manage-reorder-toolbar">
        <button type="button" class="btn" id="btnToggleCategoryReorder" aria-pressed="${manageCategoryReorderMode ? 'true' : 'false'}">${manageCategoryReorderMode ? 'Done Reordering' : 'Reorder Categories'}</button>
        <span class="muted manage-reorder-help">${manageCategoryReorderMode ? 'Use arrows to move categories. Order saves after each move.' : 'Use reorder mode for reliable category sorting.'}</span>
      </div>
      <div class="spacer"></div>
      <div id="catList" class="${manageCategoryReorderMode ? 'reorder-mode' : ''}"></div>`;
    const reorderToggle = document.getElementById('btnToggleCategoryReorder');
    if(reorderToggle){
      reorderToggle.onclick = ()=>{
        clearTouchDragArtifacts();
        manageCategoryReorderMode = !manageCategoryReorderMode;
        renderManage();
      };
    }
    renderCats();
  }

  function renderCats(){
    const cl=document.getElementById('catList');
    if(!cl) return;
    cl.innerHTML='';
    state.categories.forEach((c,i)=>{
      const row=document.createElement('div');
      row.className='item manage-category-row';
      row.draggable=false;
      row.dataset.index=i;
      row.dataset.category=c;

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
      row.appendChild(right);
      if(manageCategoryReorderMode){
        row.classList.add('reordering');
        const moveUp=document.createElement('button'); moveUp.type='button'; moveUp.className='btn reorder-btn'; moveUp.textContent='↑'; moveUp.setAttribute('aria-label', `Move ${c} up`);
        const moveDown=document.createElement('button'); moveDown.type='button'; moveDown.className='btn reorder-btn'; moveDown.textContent='↓'; moveDown.setAttribute('aria-label', `Move ${c} down`);
        moveUp.disabled = i === 0;
        moveDown.disabled = i === state.categories.length - 1;
        moveUp.onclick = ()=>{
          const previousScrollY = currentScrollY();
          if(moveCategoryWithinOrder(c, -1)){
            save();
            rerenderCategoryOrderViews();
            restoreWindowScrollY(previousScrollY);
          }
        };
        moveDown.onclick = ()=>{
          const previousScrollY = currentScrollY();
          if(moveCategoryWithinOrder(c, 1)){
            save();
            rerenderCategoryOrderViews();
            restoreWindowScrollY(previousScrollY);
          }
        };
        right.appendChild(moveUp);
        right.appendChild(moveDown);
      } else {
        right.appendChild(edit); right.appendChild(saveBtn); right.appendChild(cancelBtn); right.appendChild(del);
      }
      cl.appendChild(row);
    });

    const addCatBtn = document.getElementById('btnAddCat');
    if(!addCatBtn) return;
    addCatBtn.onclick = ()=>{
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
    renderInsights();
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
    renderInsights();
    renderCats();
    setTab('build');
  }catch(e){
    console.error(e);
  }
  try{ setVersionPills(); }catch(e){}
})();