const APPS_URL = 'apps.json';
const GITHUB_USER = 'ahmeds2ad';
const GITHUB_REPO = 'assystemsai'; // ✅ تم تصحيح اسم المستودع هنا
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw9SrmIMqPBs2FzyCzU8HQdHeuTVPkYNRLq59--AaHYU4b-vAVNSSdql2-FwFeN9GXY/exec';

const grid = document.getElementById('appsGrid');
const search = document.getElementById('search');
const year = document.getElementById('year');
const modal = document.getElementById('downloadModal');
const modalClose = document.getElementById('modalClose');
const modalForm = document.getElementById('downloadForm');
const modalSuccess = document.getElementById('modalSuccess');
const modalAppName = document.getElementById('modalAppName');
const modalDownloadLink = document.getElementById('modalDownloadLink');

let ALL_APPS = [];
let DOWNLOAD_COUNTS = {};
let pendingDownload = null;

year.textContent = new Date().getFullYear();

/* ================== Navbar ================== */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive:true });

/* ================== Mobile Menu ================== */
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.querySelector('.nav-links');
menuBtn.addEventListener('click', () => navLinks.classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => navLinks.classList.remove('open'));
});

/* ================== Reveal ================== */
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold:.15 });

function observeReveals(){
  document.querySelectorAll('.card, .section-head, .about-text, .about-visual, .contact-box')
    .forEach(el => { el.classList.add('reveal'); io.observe(el); });
}

/* ================== Helpers ================== */
function formatSize(bytes){
  if (!bytes) return '';
  const mb = bytes / 1048576;
  return mb >= 1024 ? (mb/1024).toFixed(2) + ' GB' : mb.toFixed(1) + ' MB';
}

function escapeHTML(str){
  return String(str == null ? '' : str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const OS_ICONS = {
  'Windows': '💻', 'Android': '📱', 'macOS': '🍎',
  'Linux': '🐧', 'iOS': '📱', 'Web': '🌐',
};

/* ================== عدّاد التحميلات ================== */
async function loadDownloadCounts(){
  try {
    const cached = localStorage.getItem('dl_counts');
    const cachedTime = localStorage.getItem('dl_counts_time');
    if (cached && cachedTime) {
      const age = Date.now() - parseInt(cachedTime);
      if (age < 3600000) {
        DOWNLOAD_COUNTS = JSON.parse(cached);
        return;
      }
    }

    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases`,
      { headers: { 'Accept': 'application/vnd.github+json' } }
    );
    if (!res.ok) return;

    const releases = await res.json();
    const counts = {};

    releases.forEach(rel => {
      (rel.assets || []).forEach(asset => {
        counts[asset.name] = asset.download_count || 0;
      });
    });

    DOWNLOAD_COUNTS = counts;
    localStorage.setItem('dl_counts', JSON.stringify(counts));
    localStorage.setItem('dl_counts_time', Date.now().toString());
  } catch(e) {
    console.warn('تعذّر جلب عدّاد التحميلات', e);
  }
}

function getDownloadCount(platform){
  if (!platform || !platform.filename) return 0;
  return DOWNLOAD_COUNTS[platform.filename] || 0;
}

/* ================== SEO ================== */
function updateMetaKeywords(apps){
  const allKeywords = [];
  apps.forEach(a => {
    if (a.keywords) allKeywords.push(a.keywords);
    if (Array.isArray(a.tags)) allKeywords.push(a.tags.join(', '));
    if (Array.isArray(a.hashtags)) {
      allKeywords.push(a.hashtags.map(h => h.replace('#','')).join(', '));
    }
    if (Array.isArray(a.platforms)) {
      a.platforms.forEach(p => allKeywords.push(p.os));
    }
  });
  allKeywords.push('AS SYSTEMS', 'أحمد سعد كشيش', 'برامج', 'تطبيقات');

  let meta = document.querySelector('meta[name="keywords"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'keywords';
    document.head.appendChild(meta);
  }
  meta.content = allKeywords.join(', ');
}

function injectStructuredData(apps){
  const existing = document.getElementById('apps-jsonld');
  if (existing) existing.remove();

  const items = apps.map(a => {
    const platforms = a.platforms && a.platforms.length
      ? a.platforms
      : (a.downloadUrl ? [{os:'Windows', url:a.downloadUrl}] : []);
    return {
      "@type": "SoftwareApplication",
      "name": a.name,
      "softwareVersion": a.version || '1.0.0',
      "description": a.description || '',
      "operatingSystem": platforms.map(p => p.os).join(', '),
      "applicationCategory": "BusinessApplication",
      "downloadUrl": platforms[0] ? platforms[0].url : '',
      "datePublished": a.date || '',
      "keywords": [
        ...(a.tags || []),
        ...(a.hashtags || []).map(h => h.replace('#','')),
        a.keywords || ''
      ].filter(Boolean).join(', '),
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
    };
  });

  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.id = 'apps-jsonld';
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": items
  });
  document.head.appendChild(ld);
}

/* ================== Render ================== */
function render(list){
  if (!list.length){
    grid.innerHTML = '<div class="empty"><div class="empty-icon">📭</div><div>لا توجد برامج مطابقة لبحثك</div></div>';
    return;
  }

  grid.innerHTML = list.map((app, i) => {
    const iconHTML = app.icon
      ? '<img src="' + escapeHTML(app.icon) + '" alt="' + escapeHTML(app.name) + '">'
      : '📦';

    const tagsHTML = Array.isArray(app.tags) && app.tags.length
      ? '<div class="tags">' + app.tags.map(t =>
          '<span class="tag">' + escapeHTML(t) + '</span>').join('') + '</div>'
      : '';

    const hashtagsHTML = Array.isArray(app.hashtags) && app.hashtags.length
      ? '<div class="hashtags">' + app.hashtags.map(h => {
          const clean = h.startsWith('#') ? h : '#' + h;
          return '<a class="hashtag" href="https://www.google.com/search?q=' +
            encodeURIComponent(clean.replace('#','')) + '" target="_blank" rel="noopener">' +
            escapeHTML(clean) + '</a>';
        }).join('') + '</div>'
      : '';

    const dateHTML = app.date ? '<span>' + escapeHTML(app.date) + '</span>' : '';

    let platforms = app.platforms;
    if ((!platforms || !platforms.length) && app.downloadUrl) {
      platforms = [{ os:'Windows', url: app.downloadUrl, size: app.size }];
    }
    platforms = platforms || [];

    let platformsHTML = '';
    if (platforms.length){
      platformsHTML = '<div class="platforms">' + platforms.map(p => {
        const icon = OS_ICONS[p.os] || '📦';
        const dlCount = getDownloadCount(p);
        const badgeHTML = dlCount > 0
          ? '<span class="download-badge">⬇ ' + dlCount + '</span>' : '';

        return '<button type="button" class="platform-btn" ' +
          'data-app="' + escapeHTML(app.name) + '" ' +
          'data-version="' + escapeHTML(app.version || '1.0.0') + '" ' +
          'data-platform="' + escapeHTML(p.os) + '" ' +
          'data-url="' + escapeHTML(p.url || '#') + '">' +
          '<span class="platform-icon">' + icon + '</span>' +
          '<span class="platform-name">' + escapeHTML(p.os) + '</span>' +
          '<span class="platform-size">' + formatSize(p.size) + '</span>' +
          badgeHTML +
        '</button>';
      }).join('') + '</div>';
    }

    return '<div class="card" style="animation-delay:' + (i * 60) + 'ms">' +
      '<div class="card-head">' +
        '<div class="card-icon">' + iconHTML + '</div>' +
        '<div class="card-title-wrap">' +
          '<div class="card-title">' + escapeHTML(app.name) + '</div>' +
          '<div class="card-ver"><span class="chip-ver">v' + escapeHTML(app.version || '1.0.0') + '</span>' + dateHTML + '</div>' +
        '</div>' +
      '</div>' +
      (app.description ? '<p class="card-desc">' + escapeHTML(app.description) + '</p>' : '') +
      tagsHTML +
      hashtagsHTML +
      platformsHTML +
    '</div>';
  }).join('');

  document.querySelectorAll('.platform-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openDownloadModal({
        appName: btn.dataset.app,
        version: btn.dataset.version,
        platform: btn.dataset.platform,
        url: btn.dataset.url,
      });
    });
  });

  observeReveals();
}

/* ================== Modal ================== */
function openDownloadModal(data){
  pendingDownload = data;
  modalAppName.textContent = data.appName;
  modalForm.classList.remove('hidden');
  modalSuccess.classList.remove('active');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  document.getElementById('userName').value = '';
  document.getElementById('userOrg').value = '';
  document.getElementById('userEmail').value = '';
}

function closeDownloadModal(){
  modal.classList.remove('active');
  document.body.style.overflow = '';
  pendingDownload = null;
}

modalClose.addEventListener('click', closeDownloadModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeDownloadModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('active')) {
    closeDownloadModal();
  }
});

/* ================== إرسال النموذج ================== */
modalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!pendingDownload) return;

  const name = document.getElementById('userName').value.trim();
  const org = document.getElementById('userOrg').value.trim();
  const email = document.getElementById('userEmail').value.trim();

  if (!name || !org || !email) return;

  const submitBtn = document.getElementById('modalSubmit');
  submitBtn.disabled = true;
  submitBtn.querySelector('span').textContent = 'جاري التسجيل...';

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        name: name,
        organization: org,
        email: email,
        appName: pendingDownload.appName,
        appVersion: pendingDownload.version,
        platform: pendingDownload.platform,
      }),
    });
  } catch(err) {
    console.warn('Apps Script error:', err);
  }

  modalForm.classList.add('hidden');
  modalSuccess.classList.add('active');
  modalDownloadLink.href = pendingDownload.url;

  setTimeout(() => {
    const a = document.createElement('a');
    a.href = pendingDownload.url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, 1000);

  submitBtn.disabled = false;
  submitBtn.querySelector('span').textContent = 'تأكيد التحميل';
});

/* ================== Stats ================== */
function animateNumber(el, target, duration){
  duration = duration || 1200;
  const start = performance.now();
  function step(now){
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.floor(target * eased);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

function updateStats(list){
  const total = list.length;
  let totalDownloads = 0;

  list.forEach(a => {
    const platforms = a.platforms || (a.downloadUrl ? [{os:'Windows', filename:''}] : []);
    platforms.forEach(p => {
      totalDownloads += getDownloadCount(p);
    });
  });

  animateNumber(document.getElementById('statApps'), total);
  animateNumber(document.getElementById('statDownloads'), totalDownloads || total);
}

/* ================== Load ================== */
async function loadApps(){
  try{
    const [res] = await Promise.all([
      fetch(APPS_URL + '?t=' + Date.now(), { cache:'no-store' }),
      loadDownloadCounts(),
    ]);

    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    ALL_APPS = (data.apps || []).sort((a, b) => {
      const f = (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      if (f) return f;
      return new Date(b.date || 0) - new Date(a.date || 0);
    });

    render(ALL_APPS);
    updateStats(ALL_APPS);
    updateMetaKeywords(ALL_APPS);
    injectStructuredData(ALL_APPS);
  } catch(err){
    console.error(err);
    grid.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><div>تعذّر تحميل البرامج. حاول لاحقاً.</div></div>';
  }
}

/* ================== Search ================== */
search.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  if (!q){ render(ALL_APPS); return; }
  const filtered = ALL_APPS.filter(a => {
    const platformNames = (a.platforms || []).map(p => p.os).join(' ').toLowerCase();
    return (a.name || '').toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q) ||
      (a.tags || []).join(' ').toLowerCase().includes(q) ||
      (a.hashtags || []).join(' ').toLowerCase().includes(q) ||
      (a.keywords || '').toLowerCase().includes(q) ||
      platformNames.includes(q);
  });
  render(filtered);
});

loadApps();