const KEY_DOC       = 'scratch_document';
const KEY_DOC_NAME  = 'scratch_document_name';
const KEY_FONT_SIZE = 'scratch_font_size';
const KEY_NOTES     = 'scratch_notes';
const KEY_ACCOUNTS  = 'scratch_accounts';
const KEY_SESSION   = 'scratch_session';
const KEY_SKIPPED   = 'scratch_skipped';

const Store = {
  get(k, fallback)  { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(k, v)         { localStorage.setItem(k, JSON.stringify(v)); },
  raw(k, fallback)  { return localStorage.getItem(k) ?? fallback; },
  rawSet(k, v)      { localStorage.setItem(k, v); },
  remove(k)         { localStorage.removeItem(k); },
};

async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function buildAccountFile(username, account) {
  const lines = [
    '── SCRATCH ACCOUNT FILE ──',
    '',
    `username: ${username}`,
    `salt:     ${account.salt}`,
    `hash:     ${account.hash}`,
    `created:  ${new Date(account.created).toISOString()}`,
    '',
    '── END ──'
  ];
  return lines.join('\n');
}

function parseAccountFile(text) {
  const out = {};
  text.split(/\r?\n/).forEach(line => {
    const m = line.match(/^(username|salt|hash|created):\s*(.+)$/);
    if (m) out[m[1]] = m[2].trim();
  });
  if (!out.username || !out.salt || !out.hash) return null;
  return out;
}

function checkAuth() {
  const page = document.body.dataset.page;
  if (page === 'login') return;
  const user = Store.raw(KEY_SESSION, '');
  const skipped = Store.raw(KEY_SKIPPED, '');
  if (!user && !skipped) {
    const prefix = page === 'index' ? 'pages/' : '';
    window.location.href = prefix + 'login.html';
  }
}

function initLogin() {
  const tabs = document.querySelectorAll('.auth-tab');
  const forms = document.querySelectorAll('.auth-form');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('form-' + t.dataset.tab).classList.add('active');
  }));

  document.getElementById('form-signin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('signin-user').value.trim().toLowerCase();
    const pass = document.getElementById('signin-pass').value;
    const accounts = Store.get(KEY_ACCOUNTS, {});
    const acct = accounts[user];
    if (acct) {
      const hash = await sha256(acct.salt + ':' + pass);
      if (hash === acct.hash) {
        Store.rawSet(KEY_SESSION, user);
        window.location.href = '../index.html';
        return;
      }
    }
    document.getElementById('signin-msg').textContent = 'Error.';
  });

  document.getElementById('signin-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseAccountFile(text);
      if (parsed) {
        const accounts = Store.get(KEY_ACCOUNTS, {});
        accounts[parsed.username.toLowerCase()] = parsed;
        Store.set(KEY_ACCOUNTS, accounts);
        Store.rawSet(KEY_SESSION, parsed.username);
        window.location.href = '../index.html';
      }
    } catch (err) {}
  });

  document.getElementById('form-signup').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('signup-user').value.trim();
    const pass = document.getElementById('signup-pass').value;
    if (pass !== document.getElementById('signup-pass2').value) return;
    const salt = randomSalt();
    const hash = await sha256(salt + ':' + pass);
    const account = { salt, hash, created: Date.now() };
    const accounts = Store.get(KEY_ACCOUNTS, {});
    accounts[user.toLowerCase()] = account;
    Store.set(KEY_ACCOUNTS, accounts);
    Store.rawSet(KEY_SESSION, user);
    downloadText(`${user}.account.txt`, buildAccountFile(user, account));
    window.location.href = '../index.html';
  });

  document.getElementById('auth-skip').addEventListener('click', () => {
    Store.rawSet(KEY_SKIPPED, 'true');
    window.location.href = '../index.html';
  });
}

function initEditor() {
  const filenameEl = document.getElementById('filename');
  const editorEl   = document.getElementById('editor');
  const status     = document.getElementById('save-status');
  const fontSizeEl = document.getElementById('font-size');
  editorEl.value = Store.raw(KEY_DOC, '');
  filenameEl.value = Store.raw(KEY_DOC_NAME, '');
  let fontSize = parseInt(Store.raw(KEY_FONT_SIZE, '17'), 10);
  const applyFont = () => {
    fontSize = Math.min(28, Math.max(12, fontSize));
    editorEl.style.fontSize = fontSize + 'px';
    fontSizeEl.textContent = fontSize;
    Store.rawSet(KEY_FONT_SIZE, String(fontSize));
  };
  applyFont();
  const updateStats = () => {
    const text = editorEl.value;
    document.getElementById('stat-words').textContent = (text.trim() ? text.trim().split(/\s+/).length : 0).toLocaleString();
    document.getElementById('stat-chars').textContent = text.length.toLocaleString();
    document.getElementById('stat-lines').textContent = (text === '' ? 0 : text.split('\n').length).toLocaleString();
  };
  let saveTimer;
  const markDirty = () => {
    status.textContent = '...';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      Store.rawSet(KEY_DOC, editorEl.value);
      Store.rawSet(KEY_DOC_NAME, filenameEl.value);
      status.textContent = 'Saved';
    }, 400);
  };
  editorEl.addEventListener('input', () => { updateStats(); markDirty(); });
  filenameEl.addEventListener('input', markDirty);
  document.getElementById('btn-save').addEventListener('click', () => {
    let name = filenameEl.value.trim() || 'untitled.txt';
    downloadText(name, editorEl.value);
  });
  document.getElementById('btn-font-up').addEventListener('click', () => { fontSize++; applyFont(); });
  document.getElementById('btn-font-down').addEventListener('click', () => { fontSize--; applyFont(); });
  updateStats();
}

function initNotes() {
  const listEl = document.getElementById('notes-list');
  const render = () => {
    const notes = Store.get(KEY_NOTES, []);
    listEl.innerHTML = '';
    document.getElementById('notes-empty').style.display = notes.length ? 'none' : 'block';
    notes.forEach((n, i) => {
      const li = document.createElement('li');
      li.className = 'note-card';
      li.innerHTML = `<div>${escapeHtml(n.title)}</div><div>${escapeHtml(n.body)}</div><button onclick="deleteNote(${i})">X</button>`;
      listEl.appendChild(li);
    });
  };
  document.getElementById('note-save').addEventListener('click', () => {
    const title = document.getElementById('note-title').value.trim();
    const body  = document.getElementById('note-body').value.trim();
    if (!body) return;
    const notes = Store.get(KEY_NOTES, []);
    notes.unshift({ title, body, created: Date.now() });
    Store.set(KEY_NOTES, notes);
    document.getElementById('note-title').value = '';
    document.getElementById('note-body').value = '';
    render();
  });
  window.deleteNote = (i) => {
    const all = Store.get(KEY_NOTES, []);
    all.splice(i, 1);
    Store.set(KEY_NOTES, all);
    render();
  };
  render();
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  const page = document.body.dataset.page;
  if (page === 'index') initEditor();
  if (page === 'notes') initNotes();
  if (page === 'login') initLogin();
});
