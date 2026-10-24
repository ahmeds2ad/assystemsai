const GITHUB_USER = 'ahmeds2ad';
const GITHUB_REPO = 'assystemsai';
const GITHUB_BRANCH = 'main';
const FILE_PATH = 'apps.json';

let currentData = null;
let currentSha = null;
let githubToken = '';

/* ================== دوال آمنة (تتجنب أخطاء null) ================== */
function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}
function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}
function getChecked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}
function getFile(id) {
  const el = document.getElementById(id);
  return (el && el.files) ? el.files[0] : null;
}
function show(id, displayType = 'block') {
  const el = document.getElementById(id);
  if (el) el.style.display = displayType;
}
function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.innerText = txt;
}

/* ================== الدخول ================== */
async function login() {
  const token = getVal('tokenInput');
  if (!token) return;

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Unauthorized');

    githubToken = token;
    sessionStorage.setItem('gh_token', token);
    show('loginScreen', 'none');
    show('dashboard', 'block');
    loadApps();
  } catch (e) {
    show('loginError', 'block');
  }
}

/* ================== جلب التطبيقات ================== */
async function loadApps() {
  setText('appList', 'جاري التحميل...');

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`, {
      headers: { 'Authorization': `Bearer ${githubToken}` }
    });
    const data = await res.json();
    
    currentSha = data.sha;
    const content = decodeURIComponent(escape(atob(data.content)));
    currentData = JSON.parse(content);

    renderAppList();
  } catch (e) {
    setText('appList', '❌ خطأ في جلب البيانات. تأكد من التوكن والفرع.');
  }
}

/* ================== عرض القائمة ================== */
function renderAppList() {
  const listDiv = document.getElementById('appList');
  if (!listDiv) return;

  if (!currentData.apps || currentData.apps.length === 0) {
    listDiv.innerHTML = '<p>لا توجد تطبيقات حالياً.</p>';
    return;
  }

  listDiv.innerHTML = currentData.apps.map((app, index) => {
    const platforms = (app.platforms || []).map(p => {
      const cls = p.os === 'Android' ? 'badge-and' : 'badge-win';
      const icon = p.os === 'Android' ? '📱' : '💻';
      return `<span class="platform-badge ${cls}">${icon} ${p.os}</span>`;
    }).join('');

    return `
    <div class="app-item">
      <div class="app-info">
        <h3>${app.name} <span style="font-size:12px; color:#60a5fa;">v${app.version}</span> ${app.featured ? '⭐' : ''}</h3>
        <p>${app.description || 'لا يوجد وصف'}</p>
        <p style="font-size:11px; margin-top:5px;">${platforms || 'لا توجد منصات'}</p>
      </div>
      <div class="app-actions">
        <button class="btn btn-sm" style="background:#f59e0b;" onclick="editApp(${index})">تعديل</button>
        <button class="btn btn-danger btn-sm" onclick="deleteApp(${index})">حذف</button>
      </div>
    </div>
    `;
  }).join('');
}

/* ================== إظهار/إخفاء النموذج ================== */
function showForm() {
  show('appForm', 'block');
  setText('formTitle', 'إضافة تطبيق جديد');
  setVal('appIndex', '-1');
  show('progressContainer', 'none');
  clearForm();
}

function hideForm() {
  show('appForm', 'none');
}

function clearForm() {
  setVal('appName', '');
  setVal('appVersion', '');
  setVal('appDesc', '');
  setVal('appIcon', '');
  setVal('appTags', '');
  setVal('appHashtags', '');
  setVal('appKeywords', '');
  const feat = document.getElementById('appFeatured');
  if (feat) feat.checked = true;
  setVal('appUrl', '');
  setVal('appFile', '');
  setVal('appUrlAndroid', '');
  setVal('appFileAndroid', '');
}

/* ================== تعديل تطبيق ================== */
function editApp(index) {
  const app = currentData.apps[index];
  show('appForm', 'block');
  setText('formTitle', 'تعديل التطبيق');
  setVal('appIndex', index);
  show('progressContainer', 'none');
  
  setVal('appName', app.name);
  setVal('appVersion', app.version);
  setVal('appDesc', app.description || '');
  setVal('appIcon', app.icon || '');
  setVal('appTags', (app.tags || []).join(', '));
  setVal('appHashtags', (app.hashtags || []).join(', '));
  setVal('appKeywords', app.keywords || '');
  const feat = document.getElementById('appFeatured');
  if (feat) feat.checked = app.featured || false;

  // منصة Windows
  const winPlatform = (app.platforms || []).find(p => p.os === 'Windows');
  setVal('appUrl', winPlatform?.url || '');
  setVal('appFile', '');

  // منصة Android
  const androidPlatform = (app.platforms || []).find(p => p.os === 'Android');
  setVal('appUrlAndroid', androidPlatform?.url || '');
  setVal('appFileAndroid', '');
}

/* ================== تحويل الملف إلى Base64 ================== */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ================== فتح GitHub Release للملفات الكبيرة ================== */
function openGitHubReleaseForUpload(name, version, desc, platformType) {
  const tagName = `v${version}-${Date.now()}`;
  const releaseUrl = `https://github.com/${GITHUB_USER}/${GITHUB_REPO}/releases/new?tag=${tagName}&title=${encodeURIComponent(name + ' v' + version + ' - ' + platformType)}&body=${encodeURIComponent(desc || 'تم الرفع من لوحة التحكم')}`;
  
  window.open(releaseUrl, '_blank');
  
  alert(`⚠️ حجم الملف (${platformType}) أكبر من 25 ميجابايت.\n\nتم فتح صفحة GitHub لإنشاء إصدار جديد.\n\nالرجاء:\n1. ارفع الملف في الصفحة التي فُتحت.\n2. انسخ رابط التحميل.\n3. ارجع للوحة، والصق الرابط في خانة "رابط تحميل ${platformType} جاهز".\n4. اضغط "حفظ ونشر" مرة أخرى.`);
}

/* ================== حفظ التطبيق ================== */
async function saveApp() {
  const index = parseInt(getVal('appIndex') || '-1');
  const name = getVal('appName');
  const version = getVal('appVersion');
  const desc = getVal('appDesc');
  const icon = getVal('appIcon');
  const tags = getVal('appTags').split(',').map(t => t.trim()).filter(Boolean);
  
  const rawHashtags = getVal('appHashtags').split(',').map(h => h.trim()).filter(Boolean);
  const hashtags = rawHashtags.map(h => h.startsWith('#') ? h : '#' + h);
  
  const keywords = getVal('appKeywords').split(',').map(k => k.trim()).filter(Boolean).join(', ');
  const featured = getChecked('appFeatured');

  if (!name || !version) {
    alert('الرجاء إدخال اسم التطبيق والإصدار على الأقل.');
    return;
  }

  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerText = 'جاري المعالجة...'; }

  const platforms = [];

  /* ---------- معالجة Windows ---------- */
  const manualUrl = getVal('appUrl');
  const file = getFile('appFile');

  let winUrl = manualUrl;
  let winSize = 0;
  let winFilename = manualUrl.split('/').pop() || '';

  if (file) {
    if (file.size > 25 * 1024 * 1024) {
      openGitHubReleaseForUpload(name, version, desc, 'Windows');
      if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = '💾 حفظ ونشر'; }
      return;
    }
    try {
      show('progressContainer', 'block');
      setText('statusText', 'جاري رفع ملف Windows...');
      const r = await uploadFileToGitHub(file);
      winUrl = r.url;
      winSize = r.size;
      winFilename = r.name;
    } catch (e) {
      alert('حدث خطأ أثناء رفع ملف Windows: ' + e.message);
      if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = '💾 حفظ ونشر'; }
      return;
    }
  }

  if (winUrl) {
    platforms.push({ os: 'Windows', url: winUrl, size: winSize, filename: winFilename });
  }

  /* ---------- معالجة Android (فقط إذا الحقول موجودة) ---------- */
  const hasAndroidField = document.getElementById('appUrlAndroid') !== null;

  if (hasAndroidField) {
    const manualUrlAndroid = getVal('appUrlAndroid');
    const fileAndroid = getFile('appFileAndroid');

    let androidUrl = manualUrlAndroid;
    let androidSize = 0;
    let androidFilename = manualUrlAndroid.split('/').pop() || '';

    if (fileAndroid) {
      if (fileAndroid.size > 25 * 1024 * 1024) {
        openGitHubReleaseForUpload(name, version, desc, 'Android');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = '💾 حفظ ونشر'; }
        return;
      }
      try {
        show('progressContainer', 'block');
        setText('statusText', 'جاري رفع ملف Android...');
        const r = await uploadFileToGitHub(fileAndroid);
        androidUrl = r.url;
        androidSize = r.size;
        androidFilename = r.name;
      } catch (e) {
        alert('حدث خطأ أثناء رفع ملف Android: ' + e.message);
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = '💾 حفظ ونشر'; }
        return;
      }
    }

    if (androidUrl) {
      platforms.push({ os: 'Android', url: androidUrl, size: androidSize, filename: androidFilename });
    }
  } else {
    console.warn('⚠️ حقل Android غير موجود في HTML الحالي. تم تخطي Android.');
  }

  /* ---------- التحقق ---------- */
  if (platforms.length === 0) {
    alert('يجب عليك إضافة منصة واحدة على الأقل (Windows أو Android).');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = '💾 حفظ ونشر'; }
    return;
  }

  /* ---------- بناء كائن التطبيق ---------- */
  const newApp = {
    name, version, description: desc, icon,
    tags, hashtags, keywords,
    platforms,
    date: new Date().toISOString().split('T')[0],
    featured,
    releaseTag: "v" + version
  };

  if (index === -1) currentData.apps.push(newApp);
  else currentData.apps[index] = newApp;

  await pushToGitHub('تحديث بيانات التطبيقات - ' + name);
  
  if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = '💾 حفظ ونشر'; }
  hideForm();
}

/* ================== رفع الملف (للملفات الصغيرة) ================== */
async function uploadFileToGitHub(file) {
  const progressBar = document.getElementById('uploadProgress');
  const statusText = document.getElementById('statusText');
  
  if (progressBar) progressBar.value = 10;
  if (statusText) statusText.innerText = 'جاري تحضير الملف...';

  const base64 = await fileToBase64(file);
  if (progressBar) progressBar.value = 30;
  if (statusText) statusText.innerText = 'جاري رفع الملف إلى GitHub...';

  const path = `uploads/${file.name}`;

  let sha = null;
  try {
    const checkRes = await fetch(
      `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`,
      { headers: { 'Authorization': `Bearer ${githubToken}` } }
    );
    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }
  } catch (e) {}

  const body = {
    message: `رفع ملف: ${file.name}`,
    content: base64,
    branch: GITHUB_BRANCH
  };
  if (sha) body.sha = sha;

  if (progressBar) progressBar.value = 50;
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  if (progressBar) progressBar.value = 90;

  if (!res.ok) {
    const errText = await res.text();
    throw new Error('فشل الرفع: ' + errText);
  }

  if (progressBar) progressBar.value = 100;
  if (statusText) statusText.innerText = '✅ تم الرفع بنجاح!';

  return {
    url: `https://ahmeds2ad.github.io/assystemsai/${path}`,
    size: file.size,
    name: file.name
  };
}

/* ================== حذف تطبيق ================== */
async function deleteApp(index) {
  if (!confirm('هل أنت متأكد من حذف هذا التطبيق؟')) return;
  currentData.apps.splice(index, 1);
  await pushToGitHub('حذف تطبيق');
}

/* ================== حفظ apps.json ================== */
async function pushToGitHub(commitMessage) {
  try {
    const jsonString = JSON.stringify(currentData, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

    const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: commitMessage,
        content: base64Content,
        sha: currentSha,
        branch: GITHUB_BRANCH
      })
    });

    if (res.ok) {
      alert('✅ تم تحديث الموقع بنجاح!');
      loadApps();
    } else {
      alert('❌ خطأ في تحديث ملف apps.json.');
    }
  } catch (e) {
    console.error(e);
    alert('❌ خطأ في الاتصال بـ GitHub.');
  }
}

/* ================== التشخيص عند التحميل ================== */
window.onload = () => {
  const hasAndroid = !!document.getElementById('appUrlAndroid');
  console.log('═══════════════════════════════════════');
  console.log('🔍 تشخيص لوحة التحكم:');
  console.log('   نسخة HTML:', hasAndroid ? '✅ جديدة (تدعم Android)' : '❌ قديمة (لا تدعم Android)');
  console.log('   الملف:', window.location.href);
  console.log('═══════════════════════════════════════');

  if (!hasAndroid) {
    console.warn('⚠️ تنبيه: ملف admin.html عندك لا يزال النسخة القديمة!');
    console.warn('   لازم ترفع النسخة الجديدة من admin.html إلى GitHub.');
  }

  const savedToken = sessionStorage.getItem('gh_token');
  if (savedToken) {
    const tokenInput = document.getElementById('tokenInput');
    if (tokenInput) tokenInput.value = savedToken;
    login();
  }
};