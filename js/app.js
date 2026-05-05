/*txt files saving*/

const KEY = {
  doc:      'scratch_doc',
  docName:  'scratch_doc_name',
  fontSize: 'scratch_font_size',
  notes:    'scratch_notes',
  user:     'scratch_user_session',
  accounts: 'scratch_accounts',
  skipped:  'scratch_skipped'
};

const Store = {
  get: (k, fb) => { try { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch { return fb; } },
  set: (k, v)  => localStorage.setItem(k, JSON.stringify(v)),
  raw: (k, fb) => localStorage.getItem(k) ?? fb,
  rawSet: (k, v) => localStorage.setItem(k, v),
};

/*helpers*/

function $(id) { return document.getElementById(id); }
/*safety functions added to stop outer scripting*/
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function comingSoon(featureName) {
  alert(`${featureName} is coming in the next iteration — we're hooking up the AI for it next week.`);
}

/*Txt files editor*/

function initEditor() {
  const filename = $('filename');
  const editor   = $('editor');
  const fileIn   = $('file-input');
  const stats    = { words: $('stat-words'), chars: $('stat-chars'), lines: $('stat-lines') };
  const status   = $('save-status');
  const fontSizeEl = $('font-size');

  /*File session load*/
  editor.value   = Store.raw(KEY.doc, '');
  filename.value = Store.raw(KEY.docName, '');

  let fontSize = parseInt(Store.raw(KEY.fontSize, '17'), 10);
  applyFont();

  function applyFont() {
    fontSize = Math.min(28, Math.max(12, fontSize));
    editor.style.fontSize = fontSize + 'px';
    fontSizeEl.textContent = fontSize;
    Store.rawSet(KEY.fontSize, String(fontSize));
  }

  function updateStats() {
    const t = editor.value;
    stats.words.textContent = (t.trim() ? t.trim().split(/\s+/).length : 0).toLocaleString();
    stats.chars.textContent = t.length.toLocaleString();
    stats.lines.textContent = (t === '' ? 0 : t.split('\n').length).toLocaleString();
  }

  /*auto save to local */
  let saveTimer;
  function markDirty() {
    status.classList.add('dirty');
    status.textContent = 'saving…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      Store.rawSet(KEY.doc, editor.value);
      Store.rawSet(KEY.docName, filename.value);
      status.classList.remove('dirty');
      status.textContent = 'saved';
    }, 400);
  }

  editor.addEventListener('input', () => { updateStats(); markDirty(); });
  filename.addEventListener('input', markDirty);

  /*open files from machine*/
  $('btn-open').addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('that file is huge bro, try something under 5MB'); return; }
    try {
      editor.value = await file.text();
      filename.value = file.name;
      updateStats();
      markDirty();
      editor.focus();
    } catch (err) { alert('could not read that file: ' + err.message); }
    fileIn.value = '';
  });

  /*save files already done to user*/
  $('btn-save').addEventListener('click', () => {
    let name = filename.value.trim() || 'untitled.txt';
    if (!/\.[a-z0-9]{1,6}$/i.test(name)) name += '.txt';
    downloadText(name, editor.value);
  });

  /*make new file*/
  $('btn-new').addEventListener('click', () => {
    if (editor.value.trim() && !confirm('toss the current scratch? unsaved stuff is gone forever')) return;
    editor.value = '';
    filename.value = '';
    updateStats();
    markDirty();
    editor.focus();
  });

  /*font size control to main page*/
  $('btn-font-up').addEventListener('click',   () => { fontSize++; applyFont(); });
  $('btn-font-down').addEventListener('click', () => { fontSize--; applyFont(); });

  /*ai tools place holder*/
  $('ai-summarize').addEventListener('click', () => comingSoon('summarize'));
  $('ai-quiz').addEventListener('click',      () => comingSoon('quiz'));

  /*keyboard*/
  editor.addEventListener('keydown', e => {
    const meta = e.ctrlKey || e.metaKey;
    if (meta && e.key === 's') { e.preventDefault(); $('btn-save').click(); }
    if (meta && e.key === 'o') { e.preventDefault(); $('btn-open').click(); }
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = editor.selectionStart, n = editor.selectionEnd;
      editor.setRangeText('  ', s, n, 'end');
      markDirty(); updateStats();
    }
  });

  updateStats();
  status.textContent = editor.value ? 'saved' : 'empty';
}

/*Notes page*/

function initNotes() {
  const titleEl = $('note-title');
  const bodyEl  = $('note-body');
  const listEl  = $('notes-list');
  const emptyEl = $('notes-empty');

  function render() {
    const notes = Store.get(KEY.notes, []);
    listEl.innerHTML = '';
    emptyEl.style.display = notes.length ? 'none' : 'block';

    notes.forEach((n, i) => {
      const li = document.createElement('li');
      li.className = 'note-card';
      li.innerHTML = `
        <div class="note-card-header">
          <div class="note-title">${escapeHtml(n.title || 'untitled scratch')}</div>
          <div class="note-date">${formatDate(n.created)}</div>
        </div>
        <div class="note-body">${escapeHtml(n.body)}</div>
        <div class="note-card-actions">
          <button class="btn ghost small" data-act="sum">summarize (soon)</button>
          <button class="btn ghost small" data-act="del">delete</button>
        </div>
      `;
      li.querySelector('[data-act="sum"]').addEventListener('click', () => comingSoon('note summary'));
      li.querySelector('[data-act="del"]').addEventListener('click', () => {
        if (!confirm('toss this scratch?')) return;
        const all = Store.get(KEY.notes, []);
        all.splice(i, 1);
        Store.set(KEY.notes, all);
        render();
      });
      listEl.appendChild(li);
    });
  }

  $('note-save').addEventListener('click', () => {
    const title = titleEl.value.trim();
    const body = bodyEl.value.trim();
    if (!body) { bodyEl.focus(); return; }
    const notes = Store.get(KEY.notes, []);
    notes.unshift({ title, body, created: Date.now() });
    Store.set(KEY.notes, notes);
    titleEl.value = ''; bodyEl.value = '';
    render();
  });

  $('note-clear').addEventListener('click', () => {
    titleEl.value = ''; bodyEl.value = '';
    titleEl.focus();
  });

  render();
}

/*quiz page no ai features for now untill teacher asks for it*/

function initQuiz() {
  $('quiz-coming-btn')?.addEventListener('click', () => comingSoon('the quiz feature'));
}

/*Summarize page for ai not making it until my teacher says so*/

function initSummarize() {
  $('sum-run')?.addEventListener('click', () => comingSoon('summarize'));
  $('sum-clear')?.addEventListener('click', () => {
    $('sum-input').value = '';
    const out = $('sum-output');
    out.classList.add('empty');
    out.textContent = 'the summary will land here when AI is hooked up next week.';
  });
}

/*support page for making sure markdown or md files are loaded into it*/

function initSupport() {
  const content = $('support-content');
  if (!content) return;
  fetch('../content/support.md')
    .then(r => r.ok ? r.text() : Promise.reject(`HTTP ${r.status}`))
    .then(md => {
      content.innerHTML = renderMarkdown(md);
      if (/[\u0600-\u06FF]/.test(md)) {
        content.setAttribute('dir', 'rtl');
        content.setAttribute('lang', 'ar');
      }
    })
    .catch(err => {
      content.innerHTML = `<p class="md-loading">support content didn't load (${err}). make sure content/support.md exists and you're running on a server.</p>`;
    });
}

/*md file upload reminder*/

function renderMarkdown(md) {
  let s = escapeHtml(md);
  const codeStash = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => { codeStash.push(c); return `\u0001${codeStash.length - 1}\u0001`; });

  const out = [];
  for (const raw of s.split(/\n\s*\n/)) {
    const block = raw.trim();
    if (!block) continue;

    if (/^---+$/.test(block)) { out.push('<hr class="md-hr">'); continue; }

    const h = block.match(/^(#{1,3})\s+(.+)$/);
    if (h && !block.includes('\n')) {
      const lvl = h[1].length;
      out.push(`<h${lvl + 1} class="md-h${lvl}">${inline(h[2])}</h${lvl + 1}>`);
      continue;
    }

    const lines = block.split('\n').filter(l => l.trim());
    if (lines.every(l => /^[-*]\s+/.test(l))) {
      out.push(`<ul class="md-ul">${lines.map(l => `<li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`);
      continue;
    }
    if (lines.every(l => /^\d+\.\s+/.test(l))) {
      out.push(`<ol class="md-ol">${lines.map(l => `<li>${inline(l.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`);
      continue;
    }

    out.push(`<p class="md-p">${inline(block).replace(/\n/g, '<br>')}</p>`);
  }

  return out.join('\n').replace(/\u0001(\d+)\u0001/g, (_, i) => `<code>${codeStash[+i]}</code>`);
}

function inline(s) {
  return s
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
}


document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  ({
    index:     initEditor,
    notes:     initNotes,
    quiz:      initQuiz,
    summarize: initSummarize,
    support:   initSupport,
  })[page]?.();
});

function initLogin() {
  const tabs = document.querySelectorAll('.auth-tab');
  const forms = document.querySelectorAll('.auth-form');
  const signInMsg = $('signin-msg');
  const signUpMsg = $('signup-msg');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      forms.forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      $(tab.dataset.tab === 'signin' ? 'form-signin' : 'form-signup').classList.add('active');
    });
  });

  $('form-signup').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = $('signup-user').value.trim();
    const pass = $('signup-pass').value;
    const pass2 = $('signup-pass2').value;

    if (!user || !pass) return showMsg(signUpMsg, 'fill in all fields', 'error');
    if (pass !== pass2) return showMsg(signUpMsg, 'passwords do not match', 'error');

    const accounts = Store.get(KEY.accounts, {});
    if (accounts[user]) return showMsg(signUpMsg, 'username already taken', 'error');

    accounts[user] = { password: pass, created: Date.now() };
    Store.set(KEY.accounts, accounts);

    const accountData = JSON.stringify({ user, password: pass });
    downloadText(`${user}.account.txt`, accountData);

    showMsg(signUpMsg, 'account created! downloading key file...', 'success');
    
    setTimeout(() => login(user), 1500);
  });

  $('form-signin').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = $('signin-user').value.trim();
    const pass = $('signin-pass').value;

    const accounts = Store.get(KEY.accounts, {});
    if (accounts[user] && accounts[user].password === pass) {
      login(user);
    } else {
      showMsg(signInMsg, 'invalid username or password', 'error');
    }
  });

  $('signin-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.user && data.password) {
        // Add to local database if it's from another device
        const accounts = Store.get(KEY.accounts, {});
        accounts[data.user] = { password: data.password, created: Date.now() };
        Store.set(KEY.accounts, accounts);
        
        login(data.user);
      }
    } catch (err) {
      showMsg(signInMsg, 'corrupt or invalid account file', 'error');
    }
  });

  $('auth-skip').addEventListener('click', () => {
    window.location.href = '../index.html';
  });

  function showMsg(el, text, type) {
    el.textContent = text;
    el.className = `auth-msg ${type}`;
  }

  function login(username) {
    Store.rawSet(KEY.user, username);
    window.location.href = '../index.html';
  }
}
