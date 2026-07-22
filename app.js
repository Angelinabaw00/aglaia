const SUPABASE_URL = 'https://ntvlmipopzcukrivitbu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2zyU7SWeCJuedNadU8zuKg_cDZ_YUKC';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const categories = ['Tous', 'Hauts', 'Bas', 'Robes', 'Vestes', 'Chaussures', 'Sacs', 'Accessoires'];
const seasons = ['Toute l’année', 'Printemps', 'Été', 'Automne', 'Hiver'];
const styles = ['Décontracté', 'Chic', 'Travail', 'Streetwear', 'Sport', 'Soirée', 'Minimaliste', 'Romantique'];
const colors = ['Noir', 'Blanc', 'Écru', 'Beige', 'Gris', 'Bleu', 'Vert', 'Rose', 'Rouge', 'Marron', 'Jaune', 'Violet'];
const occasions = ['Quotidien', 'Travail', 'Soirée', 'Restaurant', 'Fête', 'Mariage', 'Sport', 'Voyage'];
const neutralColors = new Set(['Noir', 'Blanc', 'Écru', 'Beige', 'Gris', 'Marron']);

const state = {
  ready: false, session: null, page: 'today', previous: 'today', selectedId: null, editId: null,
  clothes: [], outfits: [], plans: [], search: '', category: 'Tous', season: 'Toutes',
  favoritesOnly: false, sort: 'Récent', suggestion: [], selectedDate: new Date().toISOString().slice(0, 10), notice: ''
};

const app = document.getElementById('app');
const esc = (value = '') => String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
const value = id => document.getElementById(id)?.value.trim() || '';
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const formatDate = input => new Intl.DateTimeFormat('fr-FR', { day:'numeric', month:'long', year:'numeric' }).format(new Date(`${String(input).slice(0, 10)}T12:00:00`));
const iconFor = category => ({ Hauts:'👚', Bas:'👖', Robes:'👗', Vestes:'🧥', Chaussures:'👟', Sacs:'👜', Accessoires:'🕶️' }[category] || '👕');
const garmentById = id => state.clothes.find(item => item.id === id);
const outfitById = id => state.outfits.find(item => item.id === id);

function toast(message, error = false) {
  document.querySelector('.toast')?.remove();
  document.body.insertAdjacentHTML('beforeend', `<div class="toast ${error ? 'error' : ''}">${esc(message)}</div>`);
  setTimeout(() => document.querySelector('.toast')?.remove(), 3500);
}
function go(page, options = {}) { state.previous = state.page; state.page = page; Object.assign(state, options); render(); scrollTo({ top:0, behavior:'smooth' }); }
function setBusy(button, busy, label = 'Enregistrement…') { if (!button) return; button.disabled = busy; if (busy) { button.dataset.label = button.textContent; button.textContent = label; } else button.textContent = button.dataset.label || button.textContent; }
function brand() { return `<div class="brand"><span class="brand-mark">A</span><span>Aglaia</span></div>`; }
function back(title) { return `<div class="top-row"><button class="back" data-go="${state.previous}">‹</button><h1>${esc(title)}</h1></div>`; }
function nav() {
  const items = [['today','⌂','Aujourd’hui'], ['dressing','♧','Dressing'], ['outfits','◇','Tenues'], ['calendar','□','Calendrier'], ['profile','○','Profil']];
  return `<button class="floating-add" data-go="add" aria-label="Ajouter un vêtement">＋</button><nav class="nav">${items.map(([page, icon, label]) => `<button class="${state.page === page ? 'active' : ''}" data-go="${page}"><span>${icon}</span>${label}</button>`).join('')}</nav>`;
}
function chip(label, active, data, attribute = 'choice') { return `<button type="button" class="chip ${active ? 'active' : ''}" data-${attribute}="${esc(data ?? label)}">${esc(label)}</button>`; }
function garmentImage(item, className = '') { return item.imageUrl ? `<img class="${className}" src="${item.imageUrl}" alt="${esc(item.name)}">` : `<div class="${className} image-placeholder">${iconFor(item.category)}</div>`; }

async function init() {
  const { data } = await db.auth.getSession();
  state.session = data.session;
  state.ready = true;
  if (state.session) await loadAll();
  render();
  db.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    if (session) await loadAll(); else { state.clothes = []; state.outfits = []; state.plans = []; }
    render();
  });
}

async function loadAll(showToast = false) {
  if (!state.session) return;
  try {
    const userId = state.session.user.id;
    const [{ data: garments, error: garmentError }, { data: outfits, error: outfitError }] = await Promise.all([
      db.from('garments').select('*').eq('user_id', userId).order('created_at', { ascending:false }),
      db.from('outfits').select('*,outfit_items(garment_id,position)').eq('user_id', userId).order('created_at', { ascending:false })
    ]);
    if (garmentError) throw garmentError;
    if (outfitError) throw outfitError;
    state.clothes = await Promise.all((garments || []).map(async item => {
      if (!item.image_path) return item;
      const { data } = await db.storage.from('garments').createSignedUrl(item.image_path, 3600);
      return { ...item, imageUrl: data?.signedUrl || '' };
    }));
    state.outfits = (outfits || []).map(item => ({
      ...item,
      garment_ids: (item.outfit_items || []).sort((a, b) => a.position - b.position).map(row => row.garment_id)
    }));
    const { data: plans, error: planError } = await db.from('planned_outfits').select('*').eq('user_id', userId).order('planned_date');
    if (planError) throw planError;
    state.plans = plans || [];
    if (showToast) toast('Données synchronisées.');
  } catch (error) { toast(error.message || 'Impossible de synchroniser les données.', true); }
}

function loading() { return `<main class="page loading-page"><div class="brand-mark large">A</div><h1>Aglaia</h1><p class="muted">Préparation de ton dressing…</p></main>`; }
function authPage() {
  return `<main class="page auth-page"><div class="auth-hero"><span class="brand-mark auth-mark">A</span><h1>Aglaia</h1><p>Ton dressing, partout avec toi.</p></div><section class="card auth-card"><h2>Bienvenue</h2><p class="muted">Connecte-toi ou crée un compte pour synchroniser ton dressing.</p><form id="auth-form"><div class="field"><label for="auth-first-name">Prénom</label><input id="auth-first-name" autocomplete="given-name" placeholder="Angélina"></div><div class="field"><label for="auth-email">Adresse e-mail</label><input id="auth-email" type="email" autocomplete="email" required placeholder="nom@exemple.fr"></div><div class="field"><label for="auth-password">Mot de passe</label><input id="auth-password" type="password" autocomplete="current-password" required minlength="6" placeholder="6 caractères minimum"></div><button class="button" name="action" value="signin">Se connecter</button><button class="button secondary" name="action" value="signup">Créer mon compte</button></form></section></main>`;
}

function todayPage() {
  const name = state.session?.user.user_metadata?.first_name || state.session?.user.email?.split('@')[0] || 'toi';
  const recent = state.clothes.slice(0, 4);
  return `<main class="page">${brand()}<h1>Bonjour ${esc(name)} 👋</h1><p class="subtitle">${formatDate(dateKey(new Date()))}</p><section class="card suggestion-hero"><span class="eyebrow">AUJOURD’HUI</span><h2>Que vais-je porter ?</h2><p class="muted">Une idée avec les vêtements que tu possèdes déjà.</p><button class="button" data-suggest>${state.suggestion.length ? 'Proposer autre chose' : 'Proposer une tenue'}</button></section>${state.suggestion.length ? `<section class="card suggestion-card"><div class="suggestion-grid">${state.suggestion.map(item => `<div>${garmentImage(item, 'suggestion-photo')}<span>${esc(item.name)}</span></div>`).join('')}</div><button class="button" data-save-suggestion>Enregistrer cette tenue</button></section>` : ''}${!state.clothes.length ? empty('👗', 'Ton dressing est vide', 'Ajoute quelques vêtements pour recevoir une proposition.', 'Ajouter mon premier vêtement', 'add') : `<section class="section"><h2>Ajoutés récemment</h2><div class="recent-row">${recent.map(item => `<button data-detail="${item.id}">${garmentImage(item, 'recent-photo')}<span>${esc(item.name)}</span></button>`).join('')}</div></section><section class="section"><h2>Ton dressing en bref</h2><div class="stats-cards">${stat(state.clothes.length, 'vêtements')}${stat(state.outfits.length, 'tenues')}${stat(state.clothes.filter(item => !item.times_worn).length, 'à redécouvrir')}</div></section>`}</main>${nav()}`;
}
function stat(number, label) { return `<div class="card mini-stat"><strong>${number}</strong><span>${label}</span></div>`; }
function empty(icon, title, text, action, page) { return `<div class="empty"><div class="empty-art">${icon}</div><h2>${title}</h2><p>${text}</p>${action ? `<button class="button" data-go="${page}">${action}</button>` : ''}</div>`; }

function dressingPage() {
  const term = state.search.toLowerCase();
  const visible = state.clothes.filter(item => (!term || `${item.name} ${item.brand || ''} ${item.color}`.toLowerCase().includes(term)) && (state.category === 'Tous' || item.category === state.category) && (state.season === 'Toutes' || item.season === state.season) && (!state.favoritesOnly || item.is_favorite)).sort((a, b) => state.sort === 'Nom' ? a.name.localeCompare(b.name) : state.sort === 'Moins portés' ? (a.times_worn || 0) - (b.times_worn || 0) : b.created_at.localeCompare(a.created_at));
  return `<main class="page">${brand()}<div class="title-action"><div><h1>Mon dressing</h1><p class="subtitle">${state.clothes.length} vêtement${state.clothes.length !== 1 ? 's' : ''} synchronisé${state.clothes.length !== 1 ? 's' : ''}</p></div><button class="round-add" data-go="add">＋</button></div><div class="search"><input id="search" value="${esc(state.search)}" placeholder="Rechercher un vêtement"></div><div class="filters">${categories.map(item => chip(item, state.category === item, item, 'category'))}</div><div class="filters">${['Toutes', ...seasons].map(item => chip(item, state.season === item, item, 'season'))}</div><div class="filters compact">${chip('♡ Favoris', state.favoritesOnly, 'toggle', 'favorites')}${['Récent','Nom','Moins portés'].map(item => chip(item, state.sort === item, item, 'sort'))}</div>${visible.length ? `<div class="clothes-grid">${visible.map(clothingCard).join('')}</div>` : empty('👗', state.clothes.length ? 'Aucun résultat' : 'Ton dressing est vide', state.clothes.length ? 'Essaie un autre filtre.' : 'Ajoute ta première pièce.', state.clothes.length ? '' : 'Ajouter un vêtement', 'add')}</main>${nav()}`;
}
function clothingCard(item) { return `<button class="card clothing" data-detail="${item.id}">${garmentImage(item)}<div class="clothing-copy"><div class="card-name"><h3>${esc(item.name)}</h3><span>${item.is_favorite ? '♥' : ''}</span></div><span>${esc(item.category)} · ${esc(item.color)}</span><small>${item.times_worn ? `Porté ${item.times_worn} fois` : 'Jamais porté'}</small></div></button>`; }

function addPage() {
  const item = state.editId ? garmentById(state.editId) : null;
  const option = (items, selected) => items.map(x => `<option ${x === selected ? 'selected' : ''}>${x}</option>`).join('');
  return `<main class="page">${back(item ? 'Modifier le vêtement' : 'Nouveau vêtement')}<form id="garment-form"><label class="photo-drop">📷<br><strong>${item?.imageUrl ? 'Changer la photo' : 'Ajouter une photo'}</strong><br><span class="muted">Galerie ou appareil photo</span><input id="image" type="file" accept="image/*" capture="environment">${item?.imageUrl ? `<img id="photo-preview" class="photo-preview" src="${item.imageUrl}" alt="Aperçu">` : '<img id="photo-preview" class="photo-preview" hidden alt="Aperçu">'}</label><div class="field"><label>Nom *</label><input id="name" required value="${esc(item?.name)}" placeholder="Ex. Chemise blanche"></div><div class="form-grid"><div class="field"><label>Catégorie</label><select id="category">${option(categories.slice(1), item?.category || 'Hauts')}</select></div><div class="field"><label>Sous-catégorie</label><input id="subcategory" value="${esc(item?.subcategory)}" placeholder="Chemise, jean…"></div></div><div class="form-grid"><div class="field"><label>Couleur</label><select id="color">${option(colors, item?.color || 'Noir')}</select></div><div class="field"><label>Deuxième couleur</label><select id="secondary-color"><option value="">Aucune</option>${option(colors, item?.secondary_color)}</select></div></div><div class="form-grid"><div class="field"><label>Saison</label><select id="season">${option(seasons, item?.season || 'Toute l’année')}</select></div><div class="field"><label>Style</label><select id="style">${option(styles, item?.style || 'Décontracté')}</select></div></div><div class="form-grid"><div class="field"><label>Marque</label><input id="brand" value="${esc(item?.brand)}"></div><div class="field"><label>Taille</label><input id="size" value="${esc(item?.size)}"></div></div><div class="field"><label>Prix d’achat (€)</label><input id="purchase-price" type="number" min="0" step="0.01" value="${item?.purchase_price || ''}"></div><section class="location-form"><h2>Où est-il rangé ?</h2><p class="muted">Tu pourras retrouver immédiatement sa place.</p><div class="form-grid"><div class="field"><label>Pièce</label><input id="room" value="${esc(item?.room)}" placeholder="Chambre"></div><div class="field"><label>Armoire ou meuble</label><input id="storage-unit" value="${esc(item?.storage_unit)}" placeholder="Armoire principale"></div></div><div class="form-grid"><div class="field"><label>Zone</label><select id="storage-area"><option value="">Choisir</option>${option(['Penderie','Étagère','Tiroir'], item?.storage_area)}</select></div><div class="field"><label>Précision</label><input id="storage-details" value="${esc(item?.storage_details)}" placeholder="Étagère du haut"></div></div></section><div class="field"><label>Notes</label><textarea id="notes">${esc(item?.notes)}</textarea></div><button class="button" type="submit">${item ? 'Enregistrer les modifications' : 'Ajouter à mon dressing'}</button></form></main>${nav()}`;
}

function detailPage() {
  const item = garmentById(state.selectedId); if (!item) return dressingPage();
  const location = [item.room, item.storage_unit, item.storage_area, item.storage_details].filter(Boolean).join(' • ');
  const cost = item.purchase_price && item.times_worn ? (item.purchase_price / item.times_worn).toFixed(2) : '';
  return `<main class="page">${back(item.name)}${garmentImage(item, 'detail-photo')}<h1>${esc(item.name)}</h1><p class="muted">${esc(item.category)} · ${esc(item.color)}</p><section class="card detail-info"><p>Saison : <strong>${esc(item.season)}</strong></p><p>Style : <strong>${esc(item.style)}</strong></p>${item.brand ? `<p>Marque : <strong>${esc(item.brand)}</strong></p>` : ''}<p>${item.times_worn ? `Porté ${item.times_worn} fois` : 'Ce vêtement n’a jamais été porté.'}</p>${cost ? `<p class="sage"><strong>Coût par port : ${cost} €</strong></p>` : ''}</section><section class="location-card"><span class="eyebrow">EMPLACEMENT</span><h3>${esc(location || 'Emplacement non renseigné')}</h3><p>${location ? 'Voilà exactement où le retrouver.' : 'Appuie sur Modifier pour indiquer où il est rangé.'}</p></section><div class="button-stack"><button class="button" data-worn="${item.id}">Porté aujourd’hui</button><button class="button secondary" data-favorite="${item.id}">${item.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</button><button class="button secondary" data-for-sale="${item.id}">${item.is_for_sale ? 'Ne plus marquer à vendre' : 'Marquer à vendre'}</button><button class="button secondary" data-edit="${item.id}">Modifier</button><button class="button danger" data-delete="${item.id}">Supprimer</button></div></main>${nav()}`;
}

function outfitsPage() {
  return `<main class="page">${brand()}<div class="title-action"><div><h1>Mes tenues</h1><p class="subtitle">Tes associations préférées.</p></div><button class="round-add" data-create-outfit>＋</button></div>${state.outfits.length ? `<div class="outfits-grid">${state.outfits.map(outfit => `<button class="card outfit-card" data-outfit-detail="${outfit.id}"><div class="outfit-mosaic">${outfit.garment_ids.slice(0, 4).map(id => { const item = garmentById(id); return item ? garmentImage(item, 'outfit-thumb') : ''; }).join('')}</div><h3>${esc(outfit.name)} ${outfit.is_favorite ? '♥' : ''}</h3><span>${esc(outfit.occasion)} · ${outfit.times_worn || 0} port${outfit.times_worn > 1 ? 's' : ''}</span></button>`).join('')}</div>` : empty('◇', 'Aucune tenue', 'Crée une tenue avec les vêtements de ton dressing.', 'Créer une tenue', 'outfitForm')}</main>${nav()}`;
}
function outfitFormPage() {
  return `<main class="page">${back('Créer une tenue')}<form id="outfit-form"><div class="field"><label>Nom de la tenue</label><input id="outfit-name" required placeholder="Ex. Dîner en ville"></div><div class="form-grid"><div class="field"><label>Occasion</label><select id="occasion">${occasions.map(x => `<option>${x}</option>`).join('')}</select></div><div class="field"><label>Saison</label><select id="outfit-season">${seasons.map(x => `<option>${x}</option>`).join('')}</select></div></div><h2>Choisir les vêtements</h2><div class="check-list">${state.clothes.map(item => `<label class="check-row"><input type="checkbox" name="garments" value="${item.id}">${garmentImage(item)}<span>${esc(item.name)}</span></label>`).join('')}</div><button class="button" type="submit">Enregistrer la tenue</button></form></main>${nav()}`;
}
function outfitDetailPage() {
  const outfit = outfitById(state.selectedId); if (!outfit) return outfitsPage();
  return `<main class="page">${back(outfit.name)}<h1>${esc(outfit.name)}</h1><p class="subtitle">${esc(outfit.occasion)} · ${esc(outfit.season)}</p><div class="outfit-detail-grid">${outfit.garment_ids.map(id => { const item = garmentById(id); return item ? `<button data-detail="${item.id}">${garmentImage(item, 'outfit-detail-photo')}<span>${esc(item.name)}</span></button>` : ''; }).join('')}</div><section class="card section"><p>${outfit.times_worn ? `Portée ${outfit.times_worn} fois` : 'Cette tenue n’a jamais été portée.'}</p></section><div class="button-stack"><button class="button" data-outfit-worn="${outfit.id}">Porter aujourd’hui</button><button class="button secondary" data-outfit-favorite="${outfit.id}">${outfit.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</button><button class="button danger" data-delete-outfit="${outfit.id}">Supprimer la tenue</button></div></main>${nav()}`;
}

function calendarPage() {
  const chosen = new Date(`${state.selectedDate}T12:00:00`); const month = new Date(chosen.getFullYear(), chosen.getMonth(), 1); const offset = (month.getDay() + 6) % 7; const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); const cells = [...Array(offset).fill(null), ...Array.from({ length:days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))]; const plan = state.plans.find(item => item.planned_date === state.selectedDate); const upcoming = state.plans.filter(item => item.planned_date >= dateKey(new Date())).slice(0, 5);
  return `<main class="page">${brand()}<h1>Calendrier</h1><p class="subtitle">Prépare tes tenues sans stress.</p><section class="calendar card"><div class="calendar-head"><button data-month="-1">‹</button><h2>${new Intl.DateTimeFormat('fr-FR', { month:'long', year:'numeric' }).format(month)}</h2><button data-month="1">›</button></div><div class="weekdays">${['L','M','M','J','V','S','D'].map(x => `<span>${x}</span>`).join('')}</div><div class="calendar-days">${cells.map((date, index) => date ? `<button class="${dateKey(date) === state.selectedDate ? 'active' : ''}" data-date="${dateKey(date)}">${date.getDate()}${state.plans.some(p => p.planned_date === dateKey(date)) ? '<i></i>' : ''}</button>` : `<span key="${index}"></span>`).join('')}</div></section><section class="section"><h2>${formatDate(state.selectedDate)}</h2>${state.outfits.length ? `<form id="plan-form"><div class="field"><label>Tenue</label><select id="plan-outfit"><option value="">Choisir</option>${state.outfits.map(outfit => `<option value="${outfit.id}" ${plan?.outfit_id === outfit.id ? 'selected' : ''}>${esc(outfit.name)}</option>`).join('')}</select></div><div class="field"><label>Note</label><input id="plan-notes" value="${esc(plan?.notes)}" placeholder="Ex. Dîner à 20 h"></div><button class="button">Enregistrer la planification</button>${plan ? `<button class="button danger" type="button" data-delete-plan="${plan.id}">Supprimer</button>` : ''}</form>` : '<p class="muted">Crée d’abord une tenue.</p>'}</section><section class="section"><h2>Prochaines tenues</h2>${upcoming.length ? upcoming.map(item => `<div class="card plan-card"><small>${formatDate(item.planned_date)}</small><h3>${esc(outfitById(item.outfit_id)?.name || 'Tenue')}</h3>${item.notes ? `<p>${esc(item.notes)}</p>` : ''}</div>`).join('') : '<p class="muted">Aucune tenue planifiée.</p>'}</section></main>${nav()}`;
}

function profilePage() {
  const total = state.clothes.reduce((sum, item) => sum + Number(item.purchase_price || 0), 0); const never = state.clothes.filter(item => !item.times_worn).length; const sale = state.clothes.filter(item => item.is_for_sale).length; const max = Math.max(1, ...categories.slice(1).map(category => state.clothes.filter(item => item.category === category).length)); const sorted = [...state.clothes].sort((a, b) => (b.times_worn || 0) - (a.times_worn || 0));
  return `<main class="page">${brand()}<h1>Profil & statistiques</h1><p class="subtitle">Mieux connaître ton dressing.</p><section class="account-card"><span class="eyebrow">COMPTE SYNCHRONISÉ</span><h3>${esc(state.session.user.email)}</h3><p>Tes données sont disponibles sur tous tes appareils.</p></section><div class="profile-stats">${stat(state.clothes.length, 'vêtements')}${stat(state.outfits.length, 'tenues')}${stat(`${total.toFixed(0)} €`, 'valeur estimée')}${stat(never, 'jamais portés')}</div><section class="section"><h2>Utilisation</h2><div class="card detail-info"><p>Le plus porté : <strong>${esc(sorted[0]?.name || '—')}</strong></p><p>Le moins porté : <strong>${esc(sorted.at(-1)?.name || '—')}</strong></p><p>À vendre : <strong>${sale}</strong></p></div></section><section class="section"><h2>Répartition</h2><div class="card chart">${categories.slice(1).map(category => { const count = state.clothes.filter(item => item.category === category).length; return `<div class="bar-row"><span>${category}</span><i><b style="width:${count / max * 100}%"></b></i><strong>${count}</strong></div>`; }).join('')}</div></section><section class="section impact-card"><strong>${sale}</strong><h3>vêtements prêts à être remis en circulation</h3><p>${never} pièce${never > 1 ? 's' : ''} à redécouvrir. Le meilleur vêtement est souvent celui que tu possèdes déjà.</p></section><button class="button secondary section" data-sync>Synchroniser maintenant</button><button class="button danger" data-signout>Se déconnecter</button></main>${nav()}`;
}

function render() {
  if (!state.ready) app.innerHTML = loading();
  else if (!state.session) app.innerHTML = authPage();
  else {
    const views = { today:todayPage, dressing:dressingPage, add:addPage, detail:detailPage, outfits:outfitsPage, outfitForm:outfitFormPage, outfitDetail:outfitDetailPage, calendar:calendarPage, profile:profilePage };
    app.innerHTML = (views[state.page] || todayPage)();
  }
  bind();
}

function bind() {
  document.querySelectorAll('[data-go]').forEach(el => el.onclick = () => { if (el.dataset.go === 'add') state.editId = null; go(el.dataset.go); });
  document.getElementById('auth-form')?.addEventListener('submit', auth);
  document.getElementById('garment-form')?.addEventListener('submit', saveGarment);
  document.getElementById('outfit-form')?.addEventListener('submit', saveOutfit);
  document.getElementById('plan-form')?.addEventListener('submit', savePlan);
  const image = document.getElementById('image'); if (image) image.onchange = previewPhoto;
  const search = document.getElementById('search'); if (search) search.oninput = event => { state.search = event.target.value; dressingRefreshKeepingFocus(); };
  document.querySelectorAll('[data-category]').forEach(el => el.onclick = () => { state.category = el.dataset.category; render(); });
  document.querySelectorAll('[data-season]').forEach(el => el.onclick = () => { state.season = el.dataset.season; render(); });
  document.querySelectorAll('[data-favorites]').forEach(el => el.onclick = () => { state.favoritesOnly = !state.favoritesOnly; render(); });
  document.querySelectorAll('[data-sort]').forEach(el => el.onclick = () => { state.sort = el.dataset.sort; render(); });
  document.querySelectorAll('[data-detail]').forEach(el => el.onclick = () => go('detail', { selectedId:el.dataset.detail }));
  document.querySelectorAll('[data-edit]').forEach(el => el.onclick = () => go('add', { editId:el.dataset.edit }));
  document.querySelectorAll('[data-delete]').forEach(el => el.onclick = () => deleteGarment(el.dataset.delete));
  document.querySelectorAll('[data-worn]').forEach(el => el.onclick = () => markWorn(el.dataset.worn));
  document.querySelectorAll('[data-favorite]').forEach(el => el.onclick = () => toggleGarment(el.dataset.favorite, 'is_favorite'));
  document.querySelectorAll('[data-for-sale]').forEach(el => el.onclick = () => toggleGarment(el.dataset.forSale, 'is_for_sale'));
  document.querySelectorAll('[data-create-outfit]').forEach(el => el.onclick = () => state.clothes.length ? go('outfitForm') : toast('Ajoute d’abord un vêtement.', true));
  document.querySelectorAll('[data-outfit-detail]').forEach(el => el.onclick = () => go('outfitDetail', { selectedId:el.dataset.outfitDetail }));
  document.querySelectorAll('[data-outfit-worn]').forEach(el => el.onclick = () => markOutfitWorn(el.dataset.outfitWorn));
  document.querySelectorAll('[data-outfit-favorite]').forEach(el => el.onclick = () => toggleOutfit(el.dataset.outfitFavorite));
  document.querySelectorAll('[data-delete-outfit]').forEach(el => el.onclick = () => deleteOutfit(el.dataset.deleteOutfit));
  document.querySelector('[data-suggest]')?.addEventListener('click', generateSuggestion);
  document.querySelector('[data-save-suggestion]')?.addEventListener('click', saveSuggestion);
  document.querySelectorAll('[data-date]').forEach(el => el.onclick = () => { state.selectedDate = el.dataset.date; render(); });
  document.querySelectorAll('[data-month]').forEach(el => el.onclick = () => { const date = new Date(`${state.selectedDate}T12:00:00`); date.setMonth(date.getMonth() + Number(el.dataset.month)); state.selectedDate = dateKey(new Date(date.getFullYear(), date.getMonth(), 1)); render(); });
  document.querySelectorAll('[data-delete-plan]').forEach(el => el.onclick = () => deletePlan(el.dataset.deletePlan));
  document.querySelector('[data-signout]')?.addEventListener('click', () => db.auth.signOut());
  document.querySelector('[data-sync]')?.addEventListener('click', async () => { await loadAll(true); render(); });
}

function dressingRefreshKeepingFocus() { const position = document.getElementById('search')?.selectionStart || state.search.length; render(); const next = document.getElementById('search'); next?.focus(); next?.setSelectionRange(position, position); }
async function auth(event) {
  event.preventDefault(); const button = event.submitter; setBusy(button, true, 'Connexion…'); const email = value('auth-email'); const password = value('auth-password'); const firstName = value('auth-first-name') || 'Angélina';
  try {
    if (button.value === 'signup') {
      const { data, error } = await db.auth.signUp({ email, password, options:{ data:{ first_name:firstName }, emailRedirectTo:location.origin + location.pathname } }); if (error) throw error;
      toast(data.session ? 'Compte créé. Bienvenue !' : 'Compte créé. Vérifie ton e-mail.');
    } else { const { error } = await db.auth.signInWithPassword({ email, password }); if (error) throw error; }
  } catch (error) { toast(error.message, true); setBusy(button, false); }
}
function previewPhoto(event) { const file = event.target.files?.[0]; if (!file) return; const preview = document.getElementById('photo-preview'); preview.src = URL.createObjectURL(file); preview.hidden = false; preview.dataset.fileSelected = '1'; }
async function compressImage(file) {
  const bitmap = await createImageBitmap(file); const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale); canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .72));
}
async function saveGarment(event) {
  event.preventDefault(); const button = event.submitter; setBusy(button, true); const old = state.editId ? garmentById(state.editId) : null; let uploadedPath = '';
  try {
    const file = document.getElementById('image').files?.[0]; if (!file && !old?.image_path) throw new Error('Ajoute une photo du vêtement.');
    if (file) { const blob = await compressImage(file); uploadedPath = `${state.session.user.id}/${Date.now()}-${crypto.randomUUID()}.jpg`; const { error } = await db.storage.from('garments').upload(uploadedPath, blob, { contentType:'image/jpeg' }); if (error) throw error; }
    const price = Number(value('purchase-price').replace(',', '.'));
    const row = { user_id:state.session.user.id, name:value('name'), category:value('category'), subcategory:value('subcategory') || null, color:value('color'), secondary_color:value('secondary-color') || null, season:value('season'), style:value('style'), brand:value('brand') || null, size:value('size') || null, purchase_price:Number.isFinite(price) && price > 0 ? price : null, image_path:uploadedPath || old.image_path, room:value('room') || null, storage_unit:value('storage-unit') || null, storage_area:value('storage-area') || null, storage_details:value('storage-details') || null, notes:value('notes') || null };
    const { error } = old ? await db.from('garments').update(row).eq('id', old.id).eq('user_id', state.session.user.id) : await db.from('garments').insert(row); if (error) throw error;
    if (old?.image_path && uploadedPath) await db.storage.from('garments').remove([old.image_path]); state.editId = null; await loadAll(); go('dressing'); toast(old ? 'Vêtement modifié.' : 'Vêtement ajouté à ton dressing.');
  } catch (error) { if (uploadedPath) await db.storage.from('garments').remove([uploadedPath]); toast(error.message || 'Enregistrement impossible.', true); setBusy(button, false); }
}
async function deleteGarment(id) { const item = garmentById(id); if (!item || !confirm(`Supprimer ${item.name} ?`)) return; const { error } = await db.from('garments').delete().eq('id', id).eq('user_id', state.session.user.id); if (error) return toast(error.message, true); if (item.image_path) await db.storage.from('garments').remove([item.image_path]); await loadAll(); go('dressing'); toast('Vêtement supprimé.'); }
async function toggleGarment(id, field) { const item = garmentById(id); const { error } = await db.from('garments').update({ [field]:!item[field] }).eq('id', id).eq('user_id', state.session.user.id); if (error) return toast(error.message, true); await loadAll(); render(); }
async function markWorn(id) { const item = garmentById(id); const { error } = await db.from('garments').update({ times_worn:(item.times_worn || 0) + 1, last_worn_date:new Date().toISOString() }).eq('id', id).eq('user_id', state.session.user.id); if (error) return toast(error.message, true); await loadAll(); render(); toast('Port enregistré.'); }

async function createOutfit(name, occasion, season, ids) { const { data, error } = await db.from('outfits').insert({ user_id:state.session.user.id, name, occasion, season }).select('id').single(); if (error) throw error; const { error:itemError } = await db.from('outfit_items').insert(ids.map((garment_id, position) => ({ outfit_id:data.id, garment_id, position }))); if (itemError) { await db.from('outfits').delete().eq('id', data.id); throw itemError; } }
async function saveOutfit(event) { event.preventDefault(); const button = event.submitter; const ids = [...document.querySelectorAll('input[name="garments"]:checked')].map(item => item.value); if (!ids.length) return toast('Choisis au moins un vêtement.', true); setBusy(button, true); try { await createOutfit(value('outfit-name'), value('occasion'), value('outfit-season'), ids); await loadAll(); go('outfits'); toast('Tenue enregistrée.'); } catch (error) { toast(error.message, true); setBusy(button, false); } }
function weighted(items) { const sorted = [...items].sort((a, b) => (a.times_worn || 0) - (b.times_worn || 0)); return sorted[Math.floor(Math.random() * Math.max(1, Math.ceil(sorted.length / 2)))]; }
function generateSuggestion() { if (!state.clothes.length) return toast('Ajoute d’abord des vêtements.', true); const result = []; const dress = weighted(state.clothes.filter(x => x.category === 'Robes')); if (dress && Math.random() > .55) result.push(dress); else { const top = weighted(state.clothes.filter(x => x.category === 'Hauts')); if (top) result.push(top); const bottom = weighted(state.clothes.filter(x => x.category === 'Bas' && (!top || neutralColors.has(top.color) || neutralColors.has(x.color) || top.color === x.color))); if (bottom) result.push(bottom); } const shoes = weighted(state.clothes.filter(x => x.category === 'Chaussures')); if (shoes) result.push(shoes); const jacket = weighted(state.clothes.filter(x => x.category === 'Vestes')); if (jacket && Math.random() > .4) result.push(jacket); state.suggestion = result.filter(Boolean); render(); }
async function saveSuggestion(event) { const button = event.currentTarget; if (!state.suggestion.length) return; setBusy(button, true); try { await createOutfit(`Suggestion du ${new Date().toLocaleDateString('fr-FR')}`, 'Quotidien', 'Toute l’année', state.suggestion.map(item => item.id)); await loadAll(); toast('Suggestion enregistrée dans Mes tenues.'); render(); } catch (error) { toast(error.message, true); setBusy(button, false); } }
async function toggleOutfit(id) { const outfit = outfitById(id); const { error } = await db.from('outfits').update({ is_favorite:!outfit.is_favorite }).eq('id', id).eq('user_id', state.session.user.id); if (error) return toast(error.message, true); await loadAll(); render(); }
async function markOutfitWorn(id) { const outfit = outfitById(id); try { const now = new Date().toISOString(); const { error } = await db.from('outfits').update({ times_worn:(outfit.times_worn || 0) + 1, last_worn_date:now }).eq('id', id).eq('user_id', state.session.user.id); if (error) throw error; await Promise.all(outfit.garment_ids.map(async garmentId => { const item = garmentById(garmentId); if (item) await db.from('garments').update({ times_worn:(item.times_worn || 0) + 1, last_worn_date:now }).eq('id', item.id).eq('user_id', state.session.user.id); })); await loadAll(); render(); toast('Tenue portée aujourd’hui.'); } catch (error) { toast(error.message, true); } }
async function deleteOutfit(id) { const outfit = outfitById(id); if (!confirm(`Supprimer ${outfit.name} ?`)) return; const { error } = await db.from('outfits').delete().eq('id', id).eq('user_id', state.session.user.id); if (error) return toast(error.message, true); await loadAll(); go('outfits'); toast('Tenue supprimée.'); }
async function savePlan(event) { event.preventDefault(); const button = event.submitter; const outfitId = value('plan-outfit'); if (!outfitId) return toast('Choisis une tenue.', true); setBusy(button, true); const { error } = await db.from('planned_outfits').upsert({ user_id:state.session.user.id, outfit_id:outfitId, planned_date:state.selectedDate, notes:value('plan-notes') || null }, { onConflict:'user_id,planned_date' }); if (error) { toast(error.message, true); setBusy(button, false); } else { await loadAll(); render(); toast('Tenue planifiée.'); } }
async function deletePlan(id) { if (!confirm('Supprimer cette planification ?')) return; const { error } = await db.from('planned_outfits').delete().eq('id', id).eq('user_id', state.session.user.id); if (error) return toast(error.message, true); await loadAll(); render(); toast('Planification supprimée.'); }

init();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js');
