const KEY_DOC       = 'scratch_document';
const KEY_DOC_NAME  = 'scratch_document_name';
const KEY_FONT_SIZE = 'scratch_font_size';
const KEY_NOTES     = 'scratch_notes';
const KEY_ACCOUNTS  = 'scratch_accounts';      // { username: { hash, salt, created } }
const KEY_SESSION   = 'scratch_session';       // current logged-in username
const KEY_GATE_SKIP = 'scratch_gate_skipped';  // user clicked "skip" on login gate

const Store = {
  get(k, fallback)  { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(k, v)         { localStorage.setItem(k, JSON.stringify(v)); },
  raw(k, fallback)  { return localStorage.getItem(k) ?? fallback; },
  rawSet(k, v)      { localStorage.setItem(k, v); },
  remove(k)         { localStorage.removeItem(k); },
};



/* ─── AUTH HELPERS ────────────────────────────────────────── */

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

function getAccounts() { return Store.get(KEY_ACCOUNTS, {}); }
function setAccounts(a) { Store.set(KEY_ACCOUNTS, a); }

function currentUser() { return Store.raw(KEY_SESSION, ''); }

function signOut() {
  Store.remove(KEY_SESSION);
  // Stay on the same page; chip will refresh on next load
  location.reload();
}

function buildAccountFile(username, account) {
  const lines = [
    '── FOLIO ACCOUNT FILE ──',
    '',
    'Keep this file safe. It can be used to sign in on another device.',
    '',
    `username: ${username}`,
    `salt:     ${account.salt}`,
    `hash:     ${account.hash}`,
    `created:  ${new Date(account.created).toISOString()}`,
    '',
    '── END ──',
    ''
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

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ─── ACCOUNT CHIP IN NAV ─────────────────────────────────── */

function injectAccountChip() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const user = currentUser();
  const isLoginPage = document.body.dataset.page === 'login';
  // path prefix for the login link, depending on whether we're at root or in /pages
  const loginHref = document.body.dataset.page === 'index' ? 'pages/login.html' : 'login.html';

  if (user) {
    const chip = document.createElement('span');
    chip.className = 'account-chip signed-in';
    chip.innerHTML = `${escapeHtml(user)}<button class="account-chip-out" type="button">Sign out</button>`;
    chip.querySelector('.account-chip-out').addEventListener('click', signOut);
    nav.appendChild(chip);
  } else if (!isLoginPage) {
    const chip = document.createElement('a');
    chip.className = 'account-chip';
    chip.href = loginHref;
    chip.textContent = 'Sign in';
    nav.appendChild(chip);
  }
}

/* ─── LOGIN PAGE ──────────────────────────────────────────── */

function initLogin() {
  const tabs       = document.querySelectorAll('.auth-tab');
  const forms      = document.querySelectorAll('.auth-form');
  const formIn     = document.getElementById('form-signin');
  const formUp     = document.getElementById('form-signup');
  const inUser     = document.getElementById('signin-user');
  const inPass     = document.getElementById('signin-pass');
  const inFile     = document.getElementById('signin-file');
  const upUser     = document.getElementById('signup-user');
  const upPass     = document.getElementById('signup-pass');
  const upPass2    = document.getElementById('signup-pass2');
  const msgIn      = document.getElementById('signin-msg');
  const msgUp      = document.getElementById('signup-msg');
  const skipBtn    = document.getElementById('auth-skip');

  // Skip — set the skip flag and go home, login page won't bug them again
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      Store.rawSet(KEY_GATE_SKIP, '1');
      location.href = '../index.html';
    });
  }

  // Tab switching
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('form-' + t.dataset.tab).classList.add('active');
    msgIn.textContent = '';
    msgUp.textContent = '';
  }));

  // If already signed in, redirect home
  if (currentUser()) {
    msgIn.className = 'auth-msg ok';
    msgIn.textContent = `Already signed in as ${currentUser()}. Redirecting…`;
    setTimeout(() => location.href = '../index.html', 800);
    return;
  }

  // SIGN IN — username + password
  formIn.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgIn.textContent = '';
    const username = inUser.value.trim();
    const password = inPass.value;
    if (!username || !password) {
      msgIn.className = 'auth-msg error';
      msgIn.textContent = 'Username and password required.';
      return;
    }
    const accounts = getAccounts();
    const acct = accounts[username.toLowerCase()];
    if (!acct) {
      msgIn.className = 'auth-msg error';
      msgIn.textContent = 'No account with that username on this device. Try the account file?';
      return;
    }
    const hash = await sha256(acct.salt + ':' + password);
    if (hash !== acct.hash) {
      msgIn.className = 'auth-msg error';
      msgIn.textContent = 'Wrong password.';
      return;
    }
    Store.rawSet(KEY_SESSION, username);
    msgIn.className = 'auth-msg ok';
    msgIn.textContent = `Signed in. Welcome back, ${username}.`;
    setTimeout(() => location.href = '../index.html', 700);
  });

  // SIGN IN — via account file upload
  inFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    msgIn.textContent = '';
    try {
      const text = await file.text();
      const parsed = parseAccountFile(text);
      if (!parsed) throw new Error('That file does not look like a Scratch account file.');
      // Restore the account into local accounts store
      const accounts = getAccounts();
      accounts[parsed.username.toLowerCase()] = {
        salt: parsed.salt,
        hash: parsed.hash,
        created: parsed.created ? Date.parse(parsed.created) : Date.now(),
      };
      setAccounts(accounts);
      Store.rawSet(KEY_SESSION, parsed.username);
      msgIn.className = 'auth-msg ok';
      msgIn.textContent = `Signed in as ${parsed.username}. Redirecting…`;
      setTimeout(() => location.href = '../index.html', 700);
    } catch (err) {
      msgIn.className = 'auth-msg error';
      msgIn.textContent = err.message;
    }
    inFile.value = '';
  });

  // SIGN UP
  formUp.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgUp.textContent = '';
    const username = upUser.value.trim();
    const password = upPass.value;
    const confirm  = upPass2.value;

    if (!username || !password) {
      msgUp.className = 'auth-msg error';
      msgUp.textContent = 'Username and password required.';
      return;
    }
    if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) {
      msgUp.className = 'auth-msg error';
      msgUp.textContent = '3–32 chars: letters, numbers, dot, dash, underscore.';
      return;
    }
    if (password.length < 6) {
      msgUp.className = 'auth-msg error';
      msgUp.textContent = 'Password must be at least 6 characters.';
      return;
    }
    if (password !== confirm) {
      msgUp.className = 'auth-msg error';
      msgUp.textContent = 'Passwords do not match.';
      return;
    }

    const accounts = getAccounts();
    if (accounts[username.toLowerCase()]) {
      msgUp.className = 'auth-msg error';
      msgUp.textContent = 'That username already exists on this device.';
      return;
    }

    const salt = randomSalt();
    const hash = await sha256(salt + ':' + password);
    const account = { salt, hash, created: Date.now() };
    accounts[username.toLowerCase()] = account;
    setAccounts(accounts);
    Store.rawSet(KEY_SESSION, username);

    // Download the account file
    const fileText = buildAccountFile(username, account);
    downloadText(`${username}.account.txt`, fileText);

    msgUp.className = 'auth-msg ok';
    msgUp.textContent = `Account created. Your recovery file was downloaded. Redirecting…`;
    setTimeout(() => location.href = '../index.html', 1200);
  });
}

/* ─── EDITOR (HOMEPAGE) ───────────────────────────────────── */

function initEditor() {
  const filenameEl  = document.getElementById('filename');
  const editorEl    = document.getElementById('editor');
  const fileInput   = document.getElementById('file-input');
  const openBtn     = document.getElementById('btn-open');
  const saveBtn     = document.getElementById('btn-save');
  const newBtn      = document.getElementById('btn-new');
  const fontUpBtn   = document.getElementById('btn-font-up');
  const fontDownBtn = document.getElementById('btn-font-down');
  const fontSizeEl  = document.getElementById('font-size');
  const wordsEl     = document.getElementById('stat-words');
  const charsEl     = document.getElementById('stat-chars');
  const linesEl     = document.getElementById('stat-lines');
  const saveStatus  = document.getElementById('save-status');

  // Restore previous document
  const savedDoc  = Store.raw(KEY_DOC, '');
  const savedName = Store.raw(KEY_DOC_NAME, '');
  if (savedDoc) editorEl.value = savedDoc;
  if (savedName) filenameEl.value = savedName;

  // Restore font size
  let fontSize = parseInt(Store.raw(KEY_FONT_SIZE, '17'), 10);
  applyFontSize();

  function applyFontSize() {
    fontSize = Math.min(28, Math.max(12, fontSize));
    editorEl.style.fontSize = fontSize + 'px';
    fontSizeEl.textContent = fontSize;
    Store.rawSet(KEY_FONT_SIZE, String(fontSize));
  }

  // Stats
  function updateStats() {
    const text = editorEl.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const lines = text === '' ? 0 : text.split('\n').length;
    wordsEl.textContent = words.toLocaleString();
    charsEl.textContent = chars.toLocaleString();
    linesEl.textContent = lines.toLocaleString();
  }

  // Auto-save (debounced)
  let saveTimer = null;
  function markDirty() {
    saveStatus.classList.add('dirty');
    saveStatus.textContent = 'Saving…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      Store.rawSet(KEY_DOC, editorEl.value);
      Store.rawSet(KEY_DOC_NAME, filenameEl.value);
      saveStatus.classList.remove('dirty');
      saveStatus.textContent = 'Auto-saved';
    }, 400);
  }

  editorEl.addEventListener('input', () => { updateStats(); markDirty(); });
  filenameEl.addEventListener('input', markDirty);

  // Open file
  openBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large. Scratch is best with documents under 5 MB.');
      return;
    }
    try {
      const text = await file.text();
      editorEl.value = text;
      filenameEl.value = file.name;
      updateStats();
      markDirty();
      editorEl.focus();
    } catch (err) {
      alert('Could not read file: ' + err.message);
    }
    fileInput.value = ''; // allow re-opening the same file
  });

  // Save file (download)
  saveBtn.addEventListener('click', () => {
    const text = editorEl.value;
    let name = filenameEl.value.trim() || 'untitled.txt';
    if (!/\.[a-z0-9]{1,6}$/i.test(name)) name += '.txt';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // New document
  newBtn.addEventListener('click', () => {
    if (editorEl.value.trim() && !confirm('Discard the current document? Anything unsaved will be lost.')) return;
    editorEl.value = '';
    filenameEl.value = '';
    updateStats();
    markDirty();
    editorEl.focus();
  });

  // Font size
  fontUpBtn.addEventListener('click', () => { fontSize += 1; applyFontSize(); });
  fontDownBtn.addEventListener('click', () => { fontSize -= 1; applyFontSize(); });

  // Keyboard shortcuts
  editorEl.addEventListener('keydown', (e) => {
    const meta = e.ctrlKey || e.metaKey;
    if (meta && e.key === 's') { e.preventDefault(); saveBtn.click(); }
    if (meta && e.key === 'o') { e.preventDefault(); openBtn.click(); }
    if (e.key === 'Tab') {
      // insert two spaces, don't move focus
      e.preventDefault();
      const start = editorEl.selectionStart;
      const end = editorEl.selectionEnd;
      editorEl.setRangeText('  ', start, end, 'end');
      markDirty();
      updateStats();
    }
  });

  updateStats();
  saveStatus.textContent = savedDoc ? 'Auto-saved' : 'Empty';
}

/* ─── NOTES PAGE ──────────────────────────────────────────── */

function initNotes() {
  const titleEl = document.getElementById('note-title');
  const bodyEl  = document.getElementById('note-body');
  const saveBtn = document.getElementById('note-save');
  const clearBtn = document.getElementById('note-clear');
  const listEl  = document.getElementById('notes-list');
  const emptyEl = document.getElementById('notes-empty');

  function render() {
    const notes = Store.get(KEY_NOTES, []);
    listEl.innerHTML = '';
    if (!notes.length) { emptyEl.style.display = 'block'; return; }
    emptyEl.style.display = 'none';
    notes.forEach((n, i) => {
      const li = document.createElement('li');
      li.className = 'note-card';
      li.innerHTML = `
        <div class="note-card-header">
          <div class="note-title">${escapeHtml(n.title || 'Untitled')}</div>
          <div class="note-date">${formatDate(n.created)}</div>
        </div>
        <div class="note-body">${escapeHtml(n.body)}</div>
        <div class="note-card-actions">
          <button class="btn ghost small" data-act="del">Delete</button>
        </div>
      `;
      const delBtn = li.querySelector('[data-act="del"]');



      delBtn.addEventListener('click', () => {
        if (!confirm('Delete this note?')) return;
        const all = Store.get(KEY_NOTES, []);
        all.splice(i, 1);
        Store.set(KEY_NOTES, all);
        render();
      });

      listEl.appendChild(li);
    });
  }

  saveBtn.addEventListener('click', () => {
    const title = titleEl.value.trim();
    const body  = bodyEl.value.trim();
    if (!body) { bodyEl.focus(); return; }
    const notes = Store.get(KEY_NOTES, []);
    notes.unshift({ title, body, created: Date.now(), summary: '' });
    Store.set(KEY_NOTES, notes);
    titleEl.value = '';
    bodyEl.value  = '';
    render();
  });

  clearBtn.addEventListener('click', () => {
    titleEl.value = '';
    bodyEl.value = '';
    titleEl.focus();
  });

  render();
}







/* ─── UTILITIES ───────────────────────────────────────────── */

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─── BOOT ────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  // Login gate — if landing on homepage without a session and without having skipped, redirect to login
  const page = document.body.dataset.page;
  if (page === 'index' && !currentUser() && !Store.raw(KEY_GATE_SKIP, '')) {
    location.replace('pages/login.html?gate=1');
    return;
  }

  injectAccountChip();
  switch (page) {
    case 'index':     initEditor();    break;
    case 'notes':     initNotes();     break;
    case 'login':     initLogin();     break;
  }
});
