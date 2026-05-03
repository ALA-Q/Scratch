**PAGES — body data attributes**

  Each HTML page sets data-page on <body>. app.js reads this and runs the
  matching initializer function.

    page name      data-page value    runs in app.js
    ─────────      ───────────────    ──────────────
    editor         "index"            initEditor()
    notes          "notes"            initNotes()
    quiz           "quiz"             initQuiz()
    summarize      "summarize"        initSummarize()
    support        "support"          initSupport()

    
  **CSS VARIABLES (defined on :root in styles.css)**
   PAPER / SURFACE COLOURS
    --paper          #f6f3ec    main page background
    --paper-warm     #ede8da    cards and panels
    --paper-shade    #e0d9c4    code backgrounds
    --sheet          #fbf9f2    the editor surface (lightest)

  INK / TEXT COLOURS
    --ink            #1c1f24    primary text
    --ink-soft       #4a4d54    body paragraphs
    --ink-faint      #8b8a82    hints, labels

  ACCENT (BLUE)
    --accent         #2c5fa6    main brand blue
    --accent-soft    #6a8fc8    lighter variant (rare)
    --accent-pale    #d5e0f0    very pale, used for "soon" badges

  RULES / BORDERS
    --rule           rgba(28,31,36,0.14)    soft dividers
    --rule-strong    rgba(28,31,36,0.28)    visible borders

  FONTS
    --serif          Times New Roman + Tinos + Amiri (Arabic) + fallbacks
    --mono           Times New Roman + Courier New (for code)

  LAYOUT
    --max            1100px    max-width of main content

**CSS CLASS by purpose**
 HEADER & NAV
    .site-header          top bar wrapper
    .header-inner         constrained inner row
    .brand                logo link
    .brand-mark           "scratch" logo text
    .brand-tag            tagline, hidden on mobile
    .nav                  nav links container
    .nav a.active         current page (gets blue underline)

  TYPOGRAPHY & LAYOUT
    main                  centered content, max 1100px wide
    .hairline             horizontal divider line
    .eyebrow              small italic label above headings
    h1.display            large display heading (use <em> inside for blue)
    .lead                 large intro paragraph
    .section-head         page intro wrapper
    .saved-header         h2 + meta row above lists
    .empty-state          italic "nothing here yet"

  BUTTONS
    .btn                  primary button (dark background)
    .btn.ghost            outlined transparent button
    .btn.accent           blue button
    .btn.small            smaller variant

  EDITOR (homepage)
    .toolbar              the toolbar bar
    .toolbar-group        button group inside toolbar
    .tool-btn             toolbar button
    .filename-input       editable filename
    .font-size-display    A− [n] A+ display
    .sheet                paper-coloured wrapper around textarea
    .stats-bar            footer with word/char/line counts
    .save-status          "saved" / "saving…" indicator
    .editor-ai            AI shortcut row under editor

  NOTES PAGE
    .note-editor          new note input panel
    .notes-list           saved notes list
    .note-card            one saved note
    .note-card-header     title + date row
    .note-title           note title
    .note-date            small italic date
    .note-body            note content
    .note-card-actions    summarize/delete row

  QUIZ + SUMMARIZE (stubs for next iteration)
    .soon-panel           "coming soon" centred card
    .soon-badge           small blue pill "next week · ai"
    .sum-grid             two-column grid (input | output)
    .sum-panel            one side of the sum-grid
    .sum-output           output area
    .sum-controls         bottom buttons row

  SUPPORT PAGE & MARKDOWN
    .support-section      one section
    .api-card             API key card (next iteration)
    .md-content           wrapper for markdown-rendered content
    .md-h1, .md-h2, .md-h3   rendered headings
    .md-p                 rendered paragraph
    .md-ul, .md-ol        rendered lists
    .md-hr                rendered horizontal rule
    .md-loading           italic "loading…" message

  FOOTER
    .site-footer          bottom strip
**Element ids by page **
 index.html — EDITOR
    #filename             editable filename input
    #editor               main textarea
    #file-input           hidden file input for Open
    #btn-new              "new" button
    #btn-open             "open" button
    #btn-save             "save .txt" button
    #btn-font-up          "A+" button
    #btn-font-down        "A−" button
    #font-size            current font size display
    #stat-words           word count
    #stat-chars           character count
    #stat-lines           line count (newlines, not visual)
    #save-status          save status indicator
    #ai-summarize         stub button (alerts coming soon)
    #ai-quiz              stub button (alerts coming soon)

  pages/notes.html — NOTES
    #note-title           new note title input
    #note-body            new note body textarea
    #note-save            save note button
    #note-clear           clear inputs button
    #notes-list           saved notes <ul>
    #notes-empty          empty state message

  pages/quiz.html — QUIZ (UI only)
    #quiz-source-text     disabled textarea (placeholder)
    #quiz-coming-btn      stub button (alerts coming soon)

  pages/summarize.html — SUMMARIZE (UI only)
    #sum-input            source textarea
    #sum-output           output area
    #sum-run              "summarize" stub button
    #sum-clear            clear button (works — clears input)

  pages/support.html — SUPPORT
    #support-content      div where markdown content renders

**LOCALSTORAGE KEYS**
 All keys live in one object called KEY in app.js:

    scratch_doc           string         current editor text (auto-saved)
    scratch_doc_name      string         current filename
    scratch_font_size     string         editor font size, e.g. "17"
    scratch_notes         JSON array     [{ title, body, created }]


**Javascript Functions**

 STORAGE (the Store object)

    Store.get(key, fallback)
        Reads a JSON value from localStorage. Returns the fallback if the
        key doesn't exist or isn't valid JSON.

    Store.set(key, value)
        Writes a value to localStorage as JSON.

    Store.raw(key, fallback)
        Reads a plain string from localStorage (no JSON parsing).

    Store.rawSet(key, value)
        Writes a plain string to localStorage.

  UTILITIES

    $(id)
        Shorthand for document.getElementById. Saves typing.

    escapeHtml(s)
        Converts <, >, &, ", ' into their HTML-safe versions (&lt; &gt; etc).
        Used when rendering user input — prevents the browser from accidentally
        treating user text as HTML tags. Security best practice.

    formatDate(timestamp)
        Turns a millisecond timestamp into a string like "30 Apr 2026".
        Used on the note cards.

    downloadText(filename, content)
        Triggers a file download in the user's browser. Used by the
        Save .txt button.

    comingSoon(featureName)
        Shows an alert telling the user a feature is coming next iteration.
        Used by all the AI stub buttons.

  PAGE INITIALIZERS

    initEditor()
        Sets up everything on the homepage editor — restoring the saved
        document, wiring up all the toolbar buttons, listening for typing,
        auto-saving on changes, and handling keyboard shortcuts.

    initNotes()
        Sets up the notes page — handles saving new notes, displaying the
        list of saved notes, and the delete button on each note.

    initQuiz()
        Wires up the stubbed quiz button on the quiz page. Just shows the
        coming-soon alert when clicked.

    initSummarize()
        Wires up the summarize page buttons. The Clear button works fully;
        the Summarize button shows the coming-soon alert.

    initSupport()
        Loads the support content from content/support.md, runs it through
        the markdown renderer, and inserts it into the page. Auto-detects
        Arabic content and switches to RTL direction.

  MARKDOWN RENDERER

    renderMarkdown(md)
        Converts a markdown string to HTML. Supports headings (# ## ###),
        bold (**text**), italic (*text*), inline code (`code`), links,
        bullet and numbered lists, and horizontal rules (---).

    inline(s)
        Helper used inside renderMarkdown — handles the inline formatting
        like bold, italic, and links. Not called directly anywhere else.

**keyboard shortcut**

  Ctrl/Cmd + S           save current document as .txt (downloads file)
  Ctrl/Cmd + O           open file picker
  Tab                    insert two spaces (does not move focus)

**HOW IT WORKS**

  When a page loads:
    1. Browser loads HTML and CSS.
    2. app.js runs at DOMContentLoaded.
    3. app.js reads document.body.dataset.page (e.g. "index").
    4. Calls the matching init function (e.g. initEditor()).
    5. The init function attaches event listeners using the IDs above.
    6. The page is now interactive.

  Every page must have:
    - <body data-page="..."> with the correct value
    - All the IDs the init function expects
    - <script src="..."> pointing to app.js

**Known problems**
  - Line counter tracks newline characters, not visually wrapped lines.
    Pressing Enter increments it; long wrapped lines do not.
    Fix planned for next iteration.

  - All data is per-browser. Clearing browser storage = full reset.

  - Maximum file size for the Open button is 5 MB.

  - The support page requires a server (or GitHub Pages)
