const STORAGE = { clothes: 'aglaia_clothes', outfits: 'aglaia_outfits', profile: 'aglaia_profile' };
const categories = ['Tous', 'Hauts', 'Bas', 'Robes', 'Vestes', 'Chaussures', 'Sacs', 'Accessoires'];
const seasons = ['Toute l’année', 'Printemps', 'Été', 'Automne', 'Hiver'];
const state = {
  page: 'home', previous: 'home', selectedId: null, editId: null,
  filter: 'Tous', search: '',
  clothes: read(STORAGE.clothes, []), outfits: read(STORAGE.outfits, []),
  profile: read(STORAGE.profile, { firstName: 'Angélina', style: '', trend: 'Équilibré', colors: '' })
};

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function esc(value = '') { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function iconFor(category) { return ({Hauts:'👚', Bas:'👖', Robes:'👗', Vestes:'🧥', Chaussures:'👟', Sacs:'👜', Accessoires:'🕶️'})[category] || '👕'; }
function go(page, options = {}) { state.previous = state.page; state.page = page; Object.assign(state, options); render(); scrollTo({top:0, behavior:'smooth'}); }
function toast(message) { document.body.insertAdjacentHTML('beforeend', `<div class="toast">${esc(message)}</div>`); setTimeout(() => document.querySelector('.toast')?.remove(), 2200); }

function nav() {
  const items = [['home','⌂','Accueil'],['dressing','♧','Dressing'],['add','＋','Ajouter'],['outfits','◇','Tenues'],['profile','○','Profil']];
  return `<nav class="nav" aria-label="Navigation principale">${items.map(([page, icon, label]) => `<button class="${page === state.page ? 'active ' : ''}${page === 'add' ? 'add-nav' : ''}" data-go="${page}"><span>${icon}</span>${label}</button>`).join('')}</nav>`;
}
function brand() { return `<div class="brand"><span class="brand-mark">A</span><span>Aglaia</span></div>`; }
function back(title) { return `<div class="top-row"><button class="back" data-go="${state.previous === 'add' ? 'dressing' : state.previous}" aria-label="Retour">‹</button><h1>${title}</h1></div>`; }

function home() {
  return `<main class="page">${brand()}<h1>Bonjour ${esc(state.profile.firstName)} 👋</h1><p class="subtitle">Ton dressing devient intelligent.</p>
    <section class="card hero-card"><h2>Mon dressing</h2><div class="stats">
      <div class="stat"><strong>${state.clothes.length}</strong><span>vêtement${state.clothes.length !== 1 ? 's' : ''}</span></div>
      <div class="stat"><strong>${state.outfits.length}</strong><span>tenue${state.outfits.length !== 1 ? 's' : ''}</span></div>
      <div class="stat"><strong>${impactScore()}</strong><span>Score Impact</span></div></div>
      <button class="button hero-action" data-go="add">＋ ${state.clothes.length ? 'Ajouter un vêtement' : 'Ajouter mon premier vêtement'}</button></section>
    <div class="two-cards"><button class="card action-card" data-go="outfits"><span class="icon">◇</span><h3>Créer une tenue</h3></button><button class="card action-card" data-go="dressing"><span class="icon">⌕</span><h3>Retrouver un vêtement</h3></button></div>
    <section class="section"><div class="section-head"><h2>Aujourd’hui</h2><button class="chip" data-go="impact">Voir l’impact</button></div><div class="card today"><span class="today-icon">✦</span><p>${state.clothes.length ? 'Explore ton dressing et imagine une nouvelle combinaison.' : 'Commence par ajouter les vêtements que tu possèdes déjà.'}</p></div></section>
  </main>${nav()}`;
}
function dressing() {
  const visible = state.clothes.filter(c => (state.filter === 'Tous' || c.category === state.filter) && c.name.toLowerCase().includes(state.search.toLowerCase()));
  return `<main class="page">${brand()}<h1>Mon dressing</h1><p class="subtitle">Tout ce que tu possèdes, bien organisé.</p>
    <div class="search"><input id="search" value="${esc(state.search)}" placeholder="Rechercher un vêtement" aria-label="Rechercher"></div>
    <div class="filters">${categories.map(c => `<button class="chip ${state.filter === c ? 'active' : ''}" data-filter="${c}">${c}</button>`).join('')}</div>
    ${visible.length ? `<div class="clothes-grid">${visible.map(clothingCard).join('')}</div>` : `<div class="empty"><div class="empty-art">👗</div><h2>${state.clothes.length ? 'Aucun résultat' : 'Ton dressing est encore vide.'}</h2><p>${state.clothes.length ? 'Essaie une autre recherche ou un autre filtre.' : 'Ajoute une première pièce pour commencer à organiser ce que tu possèdes.'}</p><button class="button" data-go="add">Ajouter un vêtement</button></div>`}
  </main>${nav()}`;
}
function clothingCard(c) { return `<button class="card clothing" data-detail="${c.id}">${c.imagePath ? `<img src="${c.imagePath}" alt="${esc(c.name)}">` : `<div class="image-placeholder">${iconFor(c.category)}</div>`}<div class="clothing-copy"><h3>${esc(c.name)}</h3><span>${esc(c.category)} · ${esc(c.color)}</span></div></button>`; }

function addPage() {
  const c = state.editId ? state.clothes.find(x => x.id === state.editId) : null;
  return `<main class="page">${back(c ? 'Modifier' : 'Ajouter un vêtement')}<form id="clothing-form">
    <label class="photo-drop">📷<br><strong>${c?.imagePath ? 'Changer la photo' : 'Ajouter une photo'}</strong><br><span class="muted">Galerie ou appareil photo</span><input id="image" type="file" accept="image/*" capture="environment">${c?.imagePath ? `<img id="photo-preview" class="photo-preview" src="${c.imagePath}" alt="Aperçu">` : `<img id="photo-preview" class="photo-preview" hidden alt="Aperçu">`}</label>
    <div class="field"><label for="name">Nom du vêtement *</label><input id="name" required value="${esc(c?.name)}" placeholder="Ex. Chemise blanche"></div>
    <div class="form-grid"><div class="field"><label for="category">Catégorie *</label><select id="category" required><option value="">Choisir</option>${categories.slice(1).map(x => `<option ${c?.category === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div class="field"><label for="color">Couleur *</label><input id="color" required value="${esc(c?.color)}" placeholder="Ex. Écru"></div></div>
    <div class="form-grid"><div class="field"><label for="brand">Marque (facultatif)</label><input id="brand" value="${esc(c?.brand)}"></div><div class="field"><label for="season">Saison</label><select id="season">${seasons.map(x => `<option ${c?.season === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>
    <section class="section"><h2>Emplacement</h2><div class="form-grid"><div class="field"><label for="room">Pièce</label><input id="room" value="${esc(c?.room)}" placeholder="Chambre"></div><div class="field"><label for="storageUnit">Armoire ou meuble</label><input id="storageUnit" value="${esc(c?.storageUnit)}" placeholder="Armoire principale"></div></div>
    <div class="form-grid"><div class="field"><label for="storageArea">Zone</label><select id="storageArea"><option value="">Choisir</option>${['Penderie','Étagère','Tiroir'].map(x => `<option ${c?.storageArea === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div class="field"><label for="storageDetails">Précision</label><input id="storageDetails" value="${esc(c?.storageDetails)}" placeholder="En haut à droite"></div></div></section>
    <div class="field"><label for="notes">Notes (facultatif)</label><textarea id="notes" placeholder="Coupe, matière, idées…">${esc(c?.notes)}</textarea></div>
    <button class="button" type="submit">Enregistrer le vêtement</button></form></main>${nav()}`;
}
function detail() {
  const c = state.clothes.find(x => x.id === state.selectedId); if (!c) return dressing();
  const location = [c.room, c.storageUnit, c.storageArea, c.storageDetails].filter(Boolean).join(' · ') || 'Non renseigné';
  return `<main class="page">${back('Détail du vêtement')}${c.imagePath ? `<img class="detail-photo" src="${c.imagePath}" alt="${esc(c.name)}">` : `<div class="detail-photo">${iconFor(c.category)}</div>`}<h1>${esc(c.name)}</h1><p class="muted">${esc(c.category)} · ${esc(c.color)}</p>
    <div class="detail-meta"><div class="meta-box"><small>Marque</small>${esc(c.brand || 'Non renseignée')}</div><div class="meta-box"><small>Saison</small>${esc(c.season)}</div></div>
    <section class="card"><h3>Emplacement précis</h3><p class="muted" style="margin:0">${esc(location)}</p></section>${c.notes ? `<section class="section"><h3>Notes</h3><p class="muted">${esc(c.notes)}</p></section>` : ''}
    <div class="button-stack"><button class="button" data-add-outfit="${c.id}">Ajouter à une tenue</button><button class="button secondary" data-edit="${c.id}">Modifier</button><button class="button danger" data-delete="${c.id}">Supprimer</button></div></main>${nav()}`;
}
function outfits() {
  return `<main class="page">${brand()}<h1>Mes tenues</h1><p class="subtitle">Crée de nouvelles combinaisons avec ce que tu possèdes.</p>
    ${state.outfits.length ? `<div class="button-stack">${state.outfits.map(o => `<article class="card"><h2>${esc(o.name)}</h2><div class="outfit-items">${o.clothingIds.map(id => { const c=state.clothes.find(x=>x.id===id); return c ? (c.imagePath ? `<img class="outfit-thumb" src="${c.imagePath}" alt="${esc(c.name)}">` : `<div class="outfit-thumb">${iconFor(c.category)}</div>`) : '' }).join('')}</div><button class="chip" data-delete-outfit="${o.id}">Supprimer</button></article>`).join('')}</div>` : `<div class="empty"><div class="empty-art">◇</div><h2>Crée ta première tenue</h2><p>Crée ta première tenue avec les vêtements que tu possèdes déjà.</p><button class="button" data-create-outfit>Créer une tenue</button></div>`}
    ${state.outfits.length ? `<button class="button section" data-create-outfit>Créer une tenue</button>` : ''}</main>${nav()}`;
}
function outfitForm(preselect = '') {
  if (!state.clothes.length) { toast('Ajoute d’abord un vêtement à ton dressing.'); go('add'); return; }
  state.page = 'outfitForm';
  document.getElementById('app').innerHTML = `<main class="page">${back('Créer une tenue')}<form id="outfit-form"><div class="field"><label for="outfitName">Nom de la tenue</label><input id="outfitName" required placeholder="Ex. Déjeuner du dimanche"></div><h2>Choisis les vêtements</h2><div class="check-list">${state.clothes.map(c => `<label class="check-row"><input type="checkbox" name="clothes" value="${c.id}" ${c.id === preselect ? 'checked' : ''}>${c.imagePath ? `<img src="${c.imagePath}" alt="">` : `<span>${iconFor(c.category)}</span>`}<span>${esc(c.name)}</span></label>`).join('')}</div><button class="button" type="submit">Enregistrer la tenue</button></form></main>${nav()}`;
  bind();
}
function impactScore() { return Math.min(100, state.clothes.length * 4 + state.outfits.length * 8); }
function impact() { return `<main class="page">${back('Mon Impact')}<section class="card impact-score"><div class="score-ring">${impactScore()}</div><h2>Score Impact</h2><p class="muted">Ce score récompense l’utilisation et l’organisation de ton dressing, jamais l’achat.</p></section><section class="section"><h2>Ce que tu valorises</h2><div class="impact-grid">${[['↺','Vêtements redécouverts'],['✦','Nouvelles combinaisons créées'],['≠','Achats doublons évités'],['◌','Vêtements différents portés']].map(([i,t]) => `<div class="card impact-item"><span class="icon">${i}</span><h3>${t}</h3><span class="muted">À découvrir progressivement</span></div>`).join('')}</div></section><section class="section card today"><span class="today-icon">♡</span><p>Le meilleur vêtement est souvent celui que tu possèdes déjà.</p></section></main>${nav()}`; }
function profile() { const p=state.profile; return `<main class="page">${brand()}<div class="profile-avatar">${esc(p.firstName.slice(0,1).toUpperCase())}</div><h1>Mon profil</h1><p class="subtitle">Des préférences pour mieux t’accompagner.</p><form id="profile-form"><div class="field"><label for="firstName">Prénom</label><input id="firstName" required value="${esc(p.firstName)}"></div><div class="field"><label for="style">Style préféré</label><input id="style" value="${esc(p.style)}" placeholder="Ex. Minimaliste, romantique…"></div><div class="field"><label>Niveau de tendance</label><div class="radio-row">${['Intemporel','Équilibré','Très tendance'].map(x => `<label><input type="radio" name="trend" value="${x}" ${p.trend===x?'checked':''}><span>${x}</span></label>`).join('')}</div></div><div class="field"><label for="colors">Préférences de couleurs</label><input id="colors" value="${esc(p.colors)}" placeholder="Ex. Neutres, vert, rose poudré"></div><button class="button" type="submit">Enregistrer mes préférences</button></form><section class="section"><h2>Sauvegarde</h2><div class="card"><h3>Protéger mes données</h3><p class="muted">Exporte régulièrement une copie dans iCloud Drive. La restauration remplace les données présentes sur cet appareil.</p><div class="button-stack"><button class="button soft" type="button" id="export-backup">Exporter ma sauvegarde</button><label class="button secondary" for="import-backup">Restaurer une sauvegarde</label><input id="import-backup" type="file" accept="application/json,.json" hidden></div></div></section><section class="section"><h2>Paramètres</h2><div class="card"><h3>Données locales</h3><p class="muted">Tes informations restent uniquement sur cet appareil.</p></div></section></main>${nav()}`; }

function render() {
  const views = {home, dressing, add:addPage, detail, outfits, impact, profile};
  document.getElementById('app').innerHTML = (views[state.page] || home)(); bind();
}
function bind() {
  document.querySelectorAll('[data-go]').forEach(el => el.onclick = () => { const page=el.dataset.go; if(page==='add') state.editId=null; go(page); });
  document.querySelectorAll('[data-filter]').forEach(el => el.onclick = () => { state.filter=el.dataset.filter; render(); });
  const search=document.getElementById('search'); if(search) search.oninput=e=>{ state.search=e.target.value; render(); document.getElementById('search')?.focus(); };
  document.querySelectorAll('[data-detail]').forEach(el => el.onclick=()=>go('detail',{selectedId:el.dataset.detail}));
  document.querySelectorAll('[data-edit]').forEach(el => el.onclick=()=>go('add',{editId:el.dataset.edit}));
  document.querySelectorAll('[data-delete]').forEach(el => el.onclick=()=>{ if(confirm('Supprimer ce vêtement ?')) { state.clothes=state.clothes.filter(c=>c.id!==el.dataset.delete); state.outfits=state.outfits.map(o=>({...o,clothingIds:o.clothingIds.filter(id=>id!==el.dataset.delete)})); save(STORAGE.clothes,state.clothes); save(STORAGE.outfits,state.outfits); go('dressing'); toast('Vêtement supprimé.'); }});
  document.querySelectorAll('[data-create-outfit]').forEach(el => el.onclick=()=>outfitForm());
  document.querySelectorAll('[data-add-outfit]').forEach(el => el.onclick=()=>outfitForm(el.dataset.addOutfit));
  document.querySelectorAll('[data-delete-outfit]').forEach(el => el.onclick=()=>{ state.outfits=state.outfits.filter(o=>o.id!==el.dataset.deleteOutfit); save(STORAGE.outfits,state.outfits); render(); });
  const image=document.getElementById('image'); if(image) image.onchange=e=>{ const file=e.target.files[0]; if(!file)return; const reader=new FileReader(); reader.onload=()=>{const preview=document.getElementById('photo-preview'); preview.src=reader.result; preview.hidden=false; preview.dataset.value=reader.result;}; reader.readAsDataURL(file); };
  document.getElementById('clothing-form')?.addEventListener('submit', saveClothing);
  document.getElementById('outfit-form')?.addEventListener('submit', saveOutfit);
  document.getElementById('profile-form')?.addEventListener('submit', saveProfile);
  document.getElementById('export-backup')?.addEventListener('click', exportBackup);
  document.getElementById('import-backup')?.addEventListener('change', importBackup);
}
function saveClothing(e) { e.preventDefault(); const old=state.editId ? state.clothes.find(c=>c.id===state.editId) : null; const preview=document.getElementById('photo-preview'); const item={id:old?.id||crypto.randomUUID(),name:value('name'),category:value('category'),color:value('color'),brand:value('brand'),season:value('season'),imagePath:preview?.dataset.value||old?.imagePath||'',room:value('room'),storageUnit:value('storageUnit'),storageArea:value('storageArea'),storageDetails:value('storageDetails'),notes:value('notes'),createdAt:old?.createdAt||new Date().toISOString()}; state.clothes=old?state.clothes.map(c=>c.id===old.id?item:c):[item,...state.clothes]; save(STORAGE.clothes,state.clothes); state.editId=null; go('dressing'); toast(old?'Vêtement modifié.':'Vêtement ajouté à ton dressing.'); }
function saveOutfit(e) { e.preventDefault(); const ids=[...document.querySelectorAll('input[name="clothes"]:checked')].map(x=>x.value); if(!ids.length){toast('Choisis au moins un vêtement.');return;} state.outfits.unshift({id:crypto.randomUUID(),name:value('outfitName'),clothingIds:ids,createdAt:new Date().toISOString()}); save(STORAGE.outfits,state.outfits); go('outfits'); toast('Tenue créée.'); }
function saveProfile(e) { e.preventDefault(); state.profile={firstName:value('firstName'),style:value('style'),trend:document.querySelector('input[name="trend"]:checked')?.value||'Équilibré',colors:value('colors')}; save(STORAGE.profile,state.profile); render(); toast('Préférences enregistrées.'); }
function exportBackup() {
  const backup = { app: 'Aglaia', version: 1, exportedAt: new Date().toISOString(), clothes: state.clothes, outfits: state.outfits, profile: state.profile };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `aglaia-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Sauvegarde prête à enregistrer dans Fichiers.');
}
function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const backup = JSON.parse(reader.result);
      if (backup.app !== 'Aglaia' || !Array.isArray(backup.clothes) || !Array.isArray(backup.outfits) || !backup.profile) throw new Error('invalid');
      if (!confirm('Restaurer cette sauvegarde ? Les données actuelles seront remplacées.')) return;
      state.clothes = backup.clothes;
      state.outfits = backup.outfits;
      state.profile = backup.profile;
      save(STORAGE.clothes, state.clothes);
      save(STORAGE.outfits, state.outfits);
      save(STORAGE.profile, state.profile);
      render();
      toast('Sauvegarde restaurée.');
    } catch {
      toast('Ce fichier n’est pas une sauvegarde Aglaia valide.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}
function value(id) { return document.getElementById(id)?.value.trim() || ''; }
render();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js');
