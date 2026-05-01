# scratch

a tiny plain-text editor for `.txt` files. school project, April 2026.

## structure

```
scratch/
├── index.html              the editor
├── pages/
│   ├── notes.html          side notes
│   ├── quiz.html           AI quiz (next iteration)
│   ├── summarize.html      AI summarize (next iteration)
│   └── support.html        help & FAQ
├── styles/
│   └── styles.css          all styles
├── js/
│   └── app.js              all logic
└── content/
    └── support.md          editable help content
```

## running locally

option 1 — just open `index.html` in a browser. works for everything except the support page (which fetches markdown).

option 2 — for the support page to work, run a local server:

```bash
python -m http.server
# then visit http://localhost:8000
```

## deploying to GitHub Pages

so your classmates can access it from anywhere with just a link.

### 1. create a github account (if you don't have one)

go to [github.com](https://github.com) and sign up. free.

### 2. create a new repo

- click the **+** in the top right → **New repository**
- name it something like `scratch` (or whatever you want)
- make it **public**
- don't initialize with a README (you have one)
- click **Create repository**

### 3. push your code

github will show you commands. you want the "push an existing repository" set:

```bash
cd /path/to/your/scratch/folder
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/scratch.git
git push -u origin main
```

if you don't have git installed:
- **windows** — install [git for windows](https://git-scm.com/download/win)
- **mac** — `brew install git` or just use the github desktop app
- **linux** — `sudo apt install git` (or your distro's equivalent)

alternative: use **github desktop** (graphical app, no command line needed) or upload files directly through the github website's "Add file → Upload files" button.

### 4. enable github pages

- in your repo, go to **Settings → Pages** (in the left sidebar)
- under **Source**, pick **Deploy from a branch**
- pick branch **main** and folder **/ (root)**
- click **Save**

wait 1-2 minutes, then your site will be live at:

```
https://YOUR_USERNAME.github.io/scratch/
```

share that link with your class.

### 5. updating the site

every time you change something:

```bash
git add .
git commit -m "describe what changed"
git push
```

github pages auto-updates within a minute or two.

## team

- **lead developer** — [your name]
- **support / presentation** — [name]
- **documentation 1 (testing)** — [name]
- **documentation 2 (screenshots)** — [name]

## next iteration

- AI summarize, hooked up to Groq API
- AI quiz generation
- AI note summaries
- API key setup on support page
