const GITHUB_USER = 'ahmeds2ad';
const GITHUB_REPO = 'assystemsai'; // ✅ تم تصحيح اسم المستودع هنا
const GITHUB_BRANCH = 'main'; // تأكد من اسم الفرع (main أو master)
const FILE_PATH = 'apps.json';

let currentData = null;
let currentSha = null;
let githubToken = '';

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

function renderAppList() {
  const listDiv = document.getElementById('appList');
  if (!currentData.apps || currentData.apps.length === 0) {
    listDiv.innerHTML = '<p>لا توجد تطبيقات حالياً.</p>';
    return;
  }

  listDiv.innerHTML = currentData.apps.map((app, index) => `
    <div class="app-item">
      <div class="app-info">
        <h3>${app.name} <span style="font-size:12px; color:#60a5fa;">v${app.version}</span> ${app.featured ? '⭐' : ''}</h3>
        <p>${app.description || 'لا يوجد وصف'}</p>
        <p style="font-size:11px; margin-top:5px;">الملف: ${app.platforms[0]?.filename || 'غير محدد'}</p>
      </div>
      <div class="app-actions">
        <button class="btn btn-sm" style="background:#f59e0b;" onclick="editApp(${index})">تعديل</button>
        <button class="btn btn-danger btn-sm" onclick="deleteApp(${index})">حذف</button>
      </div>
    </div>
  `).join('');
}

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
  document.getElementById('appOS').value = 'Windows';
  document.getElementById('appTags').value = '';
  document.getElementById('appHashtags').value = '';
  document.getElementById('appKeywords').value = '';
  document.getElementById('appFeatured').checked = true;
  document.getElementById('appUrl').value = '';
  document.getElementById('appFile').value = '';
}

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
  document.getElementById('appOS').value = app.platforms[0]?.os || 'Windows';
  document.getElementById('appTags').value = (app.tags || []).join(', ');
  document.getElementById('appHashtags').value = (app.hashtags || []).join(', ');
  document.getElementById('appKeywords').value = app.keywords || '';
  document.getElementById('appFeatured').checked = app.featured || false;
  document.getElementById('appUrl').value = app.platforms[0]?.url || '';
  document.getElementById('appFile').value = '';
}

async function saveApp() {
  const index = parseInt(document.getElementById('appIndex').value);
  const name = document.getElementById('appName').value.trim();
  const version = document.getElementById('appVersion').value.trim();
  const desc = document.getElementById('appDesc').value.trim();
  const icon = document.getElementById('appIcon').value.trim();
  const os = document.getElementById('appOS').value.trim();
  const tags = document.getElementById('appTags').value.split(',').map(t => t.trim()).filter(Boolean);
  
  const rawHashtags = document.getElementById('appHashtags').value.split(',').map(h => h.trim()).filter(Boolean);
  const hashtags = rawHashtags.map(h => h.startsWith('#') ? h : '#' + h);
  
  const keywords = document.getElementById('appKeywords').value.split(',').map(k => k.trim()).filter(Boolean).join(', ');
  const featured = document.getElementById('appFeatured').checked;
  
  const manualUrl = document.getElementById('appUrl').value.trim();
  const fileInput = document.getElementById('appFile');
  const file = fileInput.files[0];

  if (!name || !version) {
    alert('الرجاء إدخال اسم التطبيق والإصدار على الأقل.');
    return;
  }

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.innerText = 'جاري المعالجة...';

  let finalUrl = manualUrl;
  let finalSize = 0;
  let finalFilename = manualUrl.split('/').pop() || '';

  if (file) {
    if (file.size > 100 * 1024 * 1024) {
      alert('عذراً، حجم الملف يتجاوز 100 ميجابايت. يرجى رفعه يدوياً أو استخدام رابط مباشر.');
      saveBtn.disabled = false;
      saveBtn.innerText = '💾 حفظ ونشر';
      return;
    }

    try {
      document.getElementById('progressContainer').style.display = 'block';
      const uploadResult = await uploadFileToGitHub(file, version);
      finalUrl = uploadResult.url;
      finalSize = uploadResult.size;
      finalFilename = uploadResult.name;
    } catch (error) {
      alert('حدث خطأ أثناء رفع الملف: ' + error.message);
      saveBtn.disabled = false;
      saveBtn.innerText = '💾 حفظ ونشر';
      return;
    }
  }

  if (!finalUrl) {
    alert('يجب عليك اختيار ملف للرفع أو وضع رابط تحميل جاهز.');
    saveBtn.disabled = false;
    saveBtn.innerText = '💾 حفظ ونشر';
    return;
  }

  const newApp = {
    name: name,
    version: version,
    description: desc,
    icon: icon,
    tags: tags,
    hashtags: hashtags,
    keywords: keywords,
    platforms: [
      { os: os, url: finalUrl, size: finalSize, filename: finalFilename }
    ],
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

function uploadFileToGitHub(file, version) {
  return new Promise(async (resolve, reject) => {
    const progressBar = document.getElementById('uploadProgress');
    const statusText = document.getElementById('statusText');
    const tagName = `v${version}-${Date.now()}`;

    try {
      statusText.innerText = 'جاري إنشاء إصدار جديد في GitHub...';
      
      const releaseRes = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tag_name: tagName,
          target_commitish: GITHUB_BRANCH,
          name: `إصدار ${version}`,
          body: 'تم الرفع تلقائياً من لوحة التحكم.',
          draft: false,
          prerelease: false
        })
      });

      if (!releaseRes.ok) throw new Error('فشل إنشاء الإصدار. تأكد من الصلاحيات.');
      const releaseData = await releaseRes.json();
      const releaseId = releaseData.id;

      statusText.innerText = 'جاري رفع الملف (قد يستغرق بعض الوقت)...';

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://uploads.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/${releaseId}/assets?name=${encodeURIComponent(file.name)}`);
      xhr.setRequestHeader('Authorization', `Bearer ${githubToken}`);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          progressBar.value = percent;
          statusText.innerText = `جاري الرفع: ${percent}% (${(event.loaded / 1048576).toFixed(1)} MB)`;
        }
      };

      xhr.onload = () => {
        if (xhr.status === 201) {
          const uploadData = JSON.parse(xhr.responseText);
          statusText.innerText = '✅ تم الرفع بنجاح!';
          progressBar.value = 100;
          resolve({
            url: uploadData.browser_download_url,
            size: uploadData.size,
            name: uploadData.name
          });
        } else {
          reject(new Error('فشل رفع الملف. رمز الخطأ: ' + xhr.status));
        }
      };

      xhr.onerror = () => reject(new Error('خطأ في الشبكة أثناء الرفع.'));
      xhr.send(file);

    } catch (err) {
      reject(err);
    }
  });
}

async function deleteApp(index) {
  if (!confirm('هل أنت متأكد من حذف هذا التطبيق؟ (لن يتم حذف الملف نفسه من GitHub، فقط من القائمة)')) return;
  currentData.apps.splice(index, 1);
  await pushToGitHub('حذف تطبيق');
}

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

window.onload = () => {
  const savedToken = sessionStorage.getItem('gh_token');
  if (savedToken) {
    document.getElementById('tokenInput').value = savedToken;
    login();
  }
};