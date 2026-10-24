const GITHUB_USER = 'ahmeds2ad';
const GITHUB_REPO = 'assystemsai';
const GITHUB_BRANCH = 'main';
const FILE_PATH = 'apps.json';

let currentData = null;
let currentSha = null;
let githubToken = '';

/* ================== الدخول ================== */
async function login() {
  const token = document.getElementById('tokenInput').value.trim();
  if (!token) return;

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Unauthorized');

    githubToken = token;
    sessionStorage.setItem('gh_token', token);
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    loadApps();
  } catch (e) {
    document.getElementById('loginError').style.display = 'block';
  }
}

/* ================== جلب التطبيقات ================== */
async function loadApps() {
  const listDiv = document.getElementById('appList');
  listDiv.innerHTML = 'جاري التحميل...';

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
    listDiv.innerHTML = '❌ خطأ في جلب البيانات. تأكد من التوكن والفرع.';
  }
}

/* ================== عرض القائمة ================== */
function renderAppList() {
  const listDiv = document.getElementById('appList');
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
  document.getElementById('appForm').style.display = 'block';
  document.getElementById('formTitle').innerText = 'إضافة تطبيق جديد';
  document.getElementById('appIndex').value = '-1';
  document.getElementById('progressContainer').style.display = 'none';
  clearForm();
}

function hideForm() {
  document.getElementById('appForm').style.display = 'none';
}

function clearForm() {
  document.getElementById('appName').value = '';
  document.getElementById('appVersion').value = '';
  document.getElementById('appDesc').value = '';
  document.getElementById('appIcon').value = '';
  document.getElementById('appTags').value = '';
  document.getElementById('appHashtags').value = '';
  document.getElementById('appKeywords').value = '';
  document.getElementById('appFeatured').checked = true;
  document.getElementById('appUrl').value = '';
  document.getElementById('appFile').value = '';
  document.getElementById('appUrlAndroid').value = '';
  document.getElementById('appFileAndroid').value = '';
}

/* ================== تعديل تطبيق ================== */
function editApp(index) {
  const app = currentData.apps[index];
  document.getElementById('appForm').style.display = 'block';
  document.getElementById('formTitle').innerText = 'تعديل التطبيق';
  document.getElementById('appIndex').value = index;
  document.getElementById('progressContainer').style.display = 'none';
  
  document.getElementById('appName').value = app.name;
  document.getElementById('appVersion').value = app.version;
  document.getElementById('appDesc').value = app.description || '';
  document.getElementById('appIcon').value = app.icon || '';
  document.getElementById('appTags').value = (app.tags || []).join(', ');
  document.getElementById('appHashtags').value = (app.hashtags || []).join(', ');
  document.getElementById('appKeywords').value = app.keywords || '';
  document.getElementById('appFeatured').checked = app.featured || false;

  // منصة Windows
  const winPlatform = (app.platforms || []).find(p => p.os === 'Windows');
  document.getElementById('appUrl').value = winPlatform?.url || '';
  document.getElementById('appFile').value = '';

  // منصة Android
  const androidPlatform = (app.platforms || []).find(p => p.os === 'Android');
  document.getElementById('appUrlAndroid').value = androidPlatform?.url || '';
  document.getElementById('appFileAndroid').value = '';
}

/* ================== تحويل الملف إلى Base64 ================== */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
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
  const index = parseInt(document.getElementById('appIndex').value);
  const name = document.getElementById('appName').value.trim();
  const version = document.getElementById('appVersion').value.trim();
  const desc = document.getElementById('appDesc').value.trim();
  const icon = document.getElementById('appIcon').value.trim();
  const tags = document.getElementById('appTags').value.split(',').map(t => t.trim()).filter(Boolean);
  
  const rawHashtags = document.getElementById('appHashtags').value.split(',').map(h => h.trim()).filter(Boolean);
  const hashtags = rawHashtags.map(h => h.startsWith('#') ? h : '#' + h);
  
  const keywords = document.getElementById('appKeywords').value.split(',').map(k => k.trim()).filter(Boolean).join(', ');
  const featured = document.getElementById('appFeatured').checked;

  if (!name || !version) {
    alert('الرجاء إدخال اسم التطبيق والإصدار على الأقل.');
    return;
  }

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.innerText = 'جاري المعالجة...';

  const platforms = [];

  /* ---------- معالجة Windows ---------- */
  const manualUrl = document.getElementById('appUrl').value.trim();
  const fileInput = document.getElementById('appFile');
  const file = fileInput.files[0];

  let winUrl = manualUrl;
  let winSize = 0;
  let winFilename = manualUrl.split('/').pop() || '';

  if (file) {
    if (file.size > 25 * 1024 * 1024) {
      openGitHubReleaseForUpload(name, version, desc, 'Windows');
      saveBtn.disabled = false;
      saveBtn.innerText = '💾 حفظ ونشر';
      return;
    }
    try {
      document.getElementById('progressContainer').style.display = 'block';
      document.getElementById('statusText').innerText = 'جاري رفع ملف Windows...';
      const r = await uploadFileToGitHub(file);
      winUrl = r.url;
      winSize = r.size;
      winFilename = r.name;
    } catch (e) {
      alert('حدث خطأ أثناء رفع ملف Windows: ' + e.message);
      saveBtn.disabled = false;
      saveBtn.innerText = '💾 حفظ ونشر';
      return;
    }
  }

  if (winUrl) {
    platforms.push({ os: 'Windows', url: winUrl, size: winSize, filename: winFilename });
  }

  /* ---------- معالجة Android ---------- */
  const manualUrlAndroid = document.getElementById('appUrlAndroid').value.trim();
  const fileAndroidInput = document.getElementById('appFileAndroid');
  const fileAndroid = fileAndroidInput.files[0];

  let androidUrl = manualUrlAndroid;
  let androidSize = 0;
  let androidFilename = manualUrlAndroid.split('/').pop() || '';

  if (fileAndroid) {
    if (fileAndroid.size > 25 * 1024 * 1024) {
      openGitHubReleaseForUpload(name, version, desc, 'Android');
      saveBtn.disabled = false;
      saveBtn.innerText = '💾 حفظ ونشر';
      return;
    }
    try {
      document.getElementById('progressContainer').style.display = 'block';
      document.getElementById('statusText').innerText = 'جاري رفع ملف Android...';
      const r = await uploadFileToGitHub(fileAndroid);
      androidUrl = r.url;
      androidSize = r.size;
      androidFilename = r.name;
    } catch (e) {
      alert('حدث خطأ أثناء رفع ملف Android: ' + e.message);
      saveBtn.disabled = false;
      saveBtn.innerText = '💾 حفظ ونشر';
      return;
    }
  }

  if (androidUrl) {
    platforms.push({ os: 'Android', url: androidUrl, size: androidSize, filename: androidFilename });
  }

  /* ---------- التحقق ---------- */
  if (platforms.length === 0) {
    alert('يجب عليك إضافة منصة واحدة على الأقل (Windows أو Android).');
    saveBtn.disabled = false;
    saveBtn.innerText = '💾 حفظ ونشر';
    return;
  }

  /* ---------- بناء كائن التطبيق ---------- */
  const newApp = {
    name: name,
    version: version,
    description: desc,
    icon: icon,
    tags: tags,
    hashtags: hashtags,
    keywords: keywords,
    platforms: platforms,
    date: new Date().toISOString().split('T')[0],
    featured: featured,
    releaseTag: "v" + version
  };

  if (index === -1) {
    currentData.apps.push(newApp);
  } else {
    currentData.apps[index] = newApp;
  }

  await pushToGitHub('تحديث بيانات التطبيقات - ' + name);
  
  saveBtn.disabled = false;
  saveBtn.innerText = '💾 حفظ ونشر';
  hideForm();
}

/* ================== رفع الملف (للملفات الصغيرة فقط) ================== */
async function uploadFileToGitHub(file) {
  const progressBar = document.getElementById('uploadProgress');
  const statusText = document.getElementById('statusText');
  
  progressBar.value = 10;
  statusText.innerText = 'جاري تحضير الملف...';

  try {
    const base64 = await fileToBase64(file);
    progressBar.value = 30;
    statusText.innerText = 'جاري رفع الملف إلى GitHub...';

    const path = `uploads/${file.name}`;

    // التحقق إذا كان الملف موجود مسبقاً للحصول على SHA
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

    progressBar.value = 50;
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

    progressBar.value = 90;

    if (!res.ok) {
      const errText = await res.text();
      throw new Error('فشل الرفع: ' + errText);
    }

    progressBar.value = 100;
    statusText.innerText = '✅ تم الرفع بنجاح!';

    return {
      url: `https://ahmeds2ad.github.io/assystemsai/${path}`,
      size: file.size,
      name: file.name
    };

  } catch (err) {
    throw err;
  }
}

/* ================== حذف تطبيق ================== */
async function deleteApp(index) {
  if (!confirm('هل أنت متأكد من حذف هذا التطبيق؟ (لن يتم حذف الملفات نفسها من GitHub، فقط من القائمة)')) return;
  currentData.apps.splice(index, 1);
  await pushToGitHub('حذف تطبيق');
}

/* ================== حفظ التغييرات في apps.json ================== */
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

/* ================== التحقق من الجلسة عند التحميل ================== */
window.onload = () => {
  const savedToken = sessionStorage.getItem('gh_token');
  if (savedToken) {
    document.getElementById('tokenInput').value = savedToken;
    login();
  }
};