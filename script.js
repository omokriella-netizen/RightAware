// Mobile menu
const menuBtn = document.getElementById('menuBtn');
const mobileNav = document.getElementById('mobileNav');
menuBtn.addEventListener('click', () => {
  const open = mobileNav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
});
mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileNav.classList.remove('open')));

// Rights data (sample — expand into full pages next)
const RIGHTS = [
  { icon: '🛡', title: 'Fundamental Human Rights', desc: 'Life, dignity, liberty, fair hearing and privacy under Chapter IV of the 1999 Constitution.', law: '1999 Constitution, Chapter IV', keywords: 'fundamental human rights constitution dignity liberty fair hearing privacy', slug: null },
  { icon: '🚔', title: 'Police & Arrest Rights', desc: 'What police can and cannot do, your right to silence, bail, and how to report abuse.', law: 'Police Act 2020 • ACJA 2015', keywords: 'police arrest bail detain station silence lawyer charge', slug: 'rights/arrest-rights.html' },
  { icon: '🏠', title: 'Rent & Tenancy Rights', desc: 'Notice periods, lawful eviction process, and what to do if your landlord locks you out.', law: 'Lagos Tenancy Law 2011 • State Rent Laws', keywords: 'rent tenancy landlord evict notice quit lockout house shop' },
  { icon: '💼', title: 'Employment Rights', desc: 'Minimum wage, wrongful dismissal, unpaid salary, maternity leave and workplace safety.', law: 'Labour Act • Minimum Wage Act 2024', keywords: 'employment work job sack dismiss salary wage sack maternity' },
  { icon: '🗳', title: 'Voting & Civic Rights', desc: 'Voter registration, PVC, voting on election day, and reporting vote-buying.', law: 'Electoral Act 2022 • INEC Guidelines', keywords: 'voting vote pvc inec election civic' },
  { icon: '👨‍👩‍👧', title: 'Family & Gender Rights', desc: 'Marriage, custody, inheritance, and protection against domestic violence.', law: 'VAPP Act 2015 • Child Rights Act 2003', keywords: 'family marriage divorce custody domestic violence inheritance gender child' },
  { icon: '🌾', title: 'Land & Property Rights', desc: 'Buying land safely, C of O, governor consent, and avoiding land grabbers (omo onile).', law: 'Land Use Act 1978', keywords: 'land property plot c of o omo onile grabber buy' },
  { icon: '🎓', title: 'Education & Student Rights', desc: 'Admission fairness, school fees disputes, NYSC, and campus harassment reporting.', law: 'UBE Act 2004 • NYSC Act', keywords: 'education school student university nysc fees admission' },
  { icon: '🏥', title: 'Health & Consumer Rights', desc: 'Patient rights, fake drugs, refunds for faulty goods, and reporting to NAFDAC/FCCPC.', law: 'FCCPA 2018 • NAFDAC Act', keywords: 'health hospital consumer patient drugs nafdac refund goods' },
];

const grid = document.getElementById('rightsGrid');
function renderRights(list) {
  grid.innerHTML = list.map(r => `
    <article class="card">
      <div class="icon">${r.icon}</div>
      <h3>${r.title}</h3>
      <p>${r.desc}</p>
      <span class="tag">${r.law}</span><br/><br/>
      ${r.slug
        ? `<a class="link" href="${r.slug}">Read guide →</a>`
        : `<a class="link" href="#explore" onclick="alert('Full guide for: ${r.title} — coming next')">Read guide →</a>`}
    </article>`).join('');
}
renderRights(RIGHTS);

// Search
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

function doSearch(q) {
  q = (q || '').trim().toLowerCase();
  if (!q) { searchResults.innerHTML = ''; return; }
  const hits = RIGHTS.filter(r =>
    (r.title + ' ' + r.desc + ' ' + r.law + ' ' + r.keywords).toLowerCase().includes(q)
  );
  if (!hits.length) {
    searchResults.innerHTML = `<div class="result">No direct match for "<strong>${q}</strong>". Try: arrest, rent, salary, voting, land. Or <a class="link" href="#help">ask for help →</a></div>`;
    return;
  }
  searchResults.innerHTML = hits.map(r =>
    `<div class="result"><strong>${r.icon} ${r.title}</strong><br/>${r.desc}<br/><small>${r.law}</small>${r.slug ? ` <a class="link" href="${r.slug}">Read guide →</a>` : ''}</div>`
  ).join('');
}
function searchRights() {
  const v = document.getElementById('heroSearchInput').value;
  document.getElementById('explore').scrollIntoView({ behavior: 'smooth' });
  searchInput.value = v;
  doSearch(v);
}
searchForm.addEventListener('submit', e => { e.preventDefault(); doSearch(searchInput.value); });
searchInput.addEventListener('input', e => doSearch(e.target.value));
document.querySelectorAll('.quick-tags button').forEach(b =>
  b.addEventListener('click', () => { searchInput.value = b.dataset.q; doSearch(b.dataset.q); })
);

// Help + newsletter demo handlers
document.getElementById('helpForm').addEventListener('submit', e => {
  e.preventDefault();
  const text = document.getElementById('helpText').value.trim();
  const state = document.getElementById('helpState').value;
  document.getElementById('helpNote').textContent =
    text ? `Received. Based on your description in ${state}, a guidance summary will appear here in Phase 2. For now call 112 in emergencies.` : 'Please describe what happened first.';
});
document.getElementById('newsletterForm').addEventListener('submit', e => {
  e.preventDefault();
  e.target.reset();
  alert('Subscribed! Weekly rights tips will arrive soon.');
});
