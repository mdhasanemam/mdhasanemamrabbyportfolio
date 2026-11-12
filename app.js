const SCHOLAR_URL = 'https://scholar.google.com/citations?user=UYvdcTkAAAAJ';
const GITHUB_USER = 'mdhasanemam';
const FEATURED_REPOSITORIES = [];
const publicationsURL = 'data/publications.json';

const store = {
  get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch (_) { /* storage blocked or full: ignore */ } }
};

const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

async function renderPublications() {
  const container = document.querySelector('#publication-list');
  try {
    const response = await fetch(publicationsURL, {cache: 'no-cache'});
    if (!response.ok) throw new Error('Publication records are temporarily unavailable.');
    const data = await response.json();
    // Only papers marked as visible are shown. Set "visible": false (or remove the entry)
    // to keep a paper off the site, e.g. while it is still under review.
    const publications = (Array.isArray(data.publications) ? data.publications : []).filter((paper) => paper && paper.visible !== false);
    if (!publications.length) {
      container.innerHTML = '<p class="empty-note">Publications will appear here. See Google Scholar for the current list.</p>';
      return;
    }
    container.innerHTML = publications.map((paper) => {
      const links = [
        paper.paperUrl && `<a href="${escapeHTML(paper.paperUrl)}" target="_blank" rel="noopener noreferrer">Paper ↗</a>`,
        paper.publisherUrl && `<a href="${escapeHTML(paper.publisherUrl)}" target="_blank" rel="noopener noreferrer">Publisher ↗</a>`,
        paper.pdfUrl && `<a href="${escapeHTML(paper.pdfUrl)}" target="_blank" rel="noopener noreferrer">PDF ↗</a>`,
        paper.doi && `<a href="https://doi.org/${escapeHTML(paper.doi)}" target="_blank" rel="noopener noreferrer">DOI ↗</a>`
      ].filter(Boolean).join('');
      const meta = [
        paper.year && `<strong>${escapeHTML(paper.year)}</strong>`,
        paper.venue && escapeHTML(paper.venue),
        paper.status && `<br><span class="publication-status">${escapeHTML(paper.status)}</span>`
      ].filter(Boolean).join('');
      return `<article class="publication-card"><div class="publication-meta">${meta}</div><div><h3>${escapeHTML(paper.title)}</h3>${paper.description ? `<p>${escapeHTML(paper.description)}</p>` : ''}${paper.authors ? `<p><strong>Authors:</strong> ${escapeHTML(paper.authors)}</p>` : ''}<div class="tag-list">${(paper.keywords || []).map((tag) => `<span>${escapeHTML(tag)}</span>`).join('')}</div>${links ? `<div class="publication-links">${links}</div>` : ''}</div></article>`;
    }).join('');
  } catch (error) {
    container.innerHTML = '<p class="empty-note">Publication records could not be loaded. Please try again later.</p>';
  }
}

function initCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach((button) => button.addEventListener('click', async () => {
    const text = button.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const area = document.createElement('textarea');
      area.value = text; area.style.position = 'fixed'; area.style.opacity = '0';
      document.body.appendChild(area); area.select();
      try { document.execCommand('copy'); } catch (__) { /* ignore */ }
      area.remove();
    }
    const original = button.textContent;
    button.textContent = 'Copied ✓';
    setTimeout(() => { button.textContent = original; }, 1800);
  }));
}

const researchTerms = /artificial intelligence|machine learning|deep learning|computer vision|medical|retina|retinal|knowledge graph|hypergraph|multimodal|classification|prediction|neural|\bnlp\b|pytorch|tensorflow|research|jupyter/i;
const webTerms = /\b(php|html|css|javascript|typescript|web|portfolio|website|database|mysql)\b/i;
function projectCategory(repo) {
  const text = `${repo.name} ${repo.description || ''} ${(repo.topics || []).join(' ')} ${repo.language || ''}`;
  if (researchTerms.test(text)) return 'ai';
  if (webTerms.test(text)) return 'web';
  return 'systems';
}
function rankRepository(repo) {
  const category = projectCategory(repo);
  return (FEATURED_REPOSITORIES.includes(repo.full_name) ? 100 : 0) + (category === 'ai' ? 30 : category === 'web' ? 10 : 0) + Math.min(repo.stargazers_count || 0, 10);
}
async function loadGitHubProjects() {
  const grid = document.querySelector('#github-projects');
  const status = document.querySelector('#github-status');
  const cacheKey = `portfolio:github:${GITHUB_USER}`;
  let repositories;
  try {
    const cached = JSON.parse(store.get(cacheKey) || 'null');
    if (cached && Array.isArray(cached.repositories) && Date.now() - cached.savedAt < 6 * 60 * 60 * 1000) repositories = cached.repositories;
  } catch (_) { /* Ignore malformed local cache. */ }
  try {
    if (!repositories) {
      let response;
      try {
        response = await fetch(`https://api.github.com/users/${encodeURIComponent(GITHUB_USER)}/repos?sort=updated&direction=desc&per_page=100`, {headers: {'Accept':'application/vnd.github+json'}});
      } catch (_) {
        throw new Error('GitHub repositories could not be reached. Check your connection and try again.');
      }
      if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? 'GitHub API rate limit reached. Try again later.' : 'GitHub repositories could not be loaded.');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('GitHub repositories could not be loaded.');
      // Keep only the fields the page uses so the cache stays small.
      repositories = data.map(({name, full_name, html_url, description, language, topics, stargazers_count, forks_count, fork, archived, pushed_at, updated_at}) =>
        ({name, full_name, html_url, description, language, topics, stargazers_count, forks_count, fork, archived, pushed_at, updated_at}));
      store.set(cacheKey, JSON.stringify({savedAt: Date.now(), repositories}));
    }
    const sorted = repositories.filter((repo) => !repo.fork && !repo.archived).sort((a,b) => rankRepository(b) - rankRepository(a) || new Date(b.pushed_at) - new Date(a.pushed_at));
    window.portfolioRepositories = sorted;
    const active = document.querySelector('.filter-chip.active');
    renderProjectFilter(active ? active.dataset.filter : 'all');
    status.textContent = `Public repositories from @${GITHUB_USER}; cached in this browser for up to 6 hours.`;
  } catch (error) {
    grid.innerHTML = `<p class="empty-note">${escapeHTML(error.message)} <a class="text-link" href="https://github.com/${GITHUB_USER}" target="_blank" rel="noopener noreferrer">Browse GitHub ↗</a></p>`;
    status.textContent = 'Live repository data is temporarily unavailable.';
  }
}
function renderProjectFilter(filter) {
  const grid = document.querySelector('#github-projects');
  if (!window.portfolioRepositories) return;
  const repos = window.portfolioRepositories.filter((repo) => filter === 'all' || projectCategory(repo) === filter);
  if (!repos.length) {
    grid.innerHTML = '<p class="empty-note">No repositories match this filter yet. Browse all repositories on GitHub.</p>';
    return;
  }
  grid.innerHTML = repos.slice(0, 9).map((repo) => `<article class="project-card"><span class="card-label">${projectCategory(repo) === 'ai' ? 'RESEARCH & AI' : projectCategory(repo) === 'web' ? 'WEB DEVELOPMENT' : 'SOFTWARE & COURSEWORK'}</span><h3><a href="${escapeHTML(repo.html_url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(repo.name)} ↗</a></h3><p>${escapeHTML(repo.description || 'Public repository by Md. Hasan Emam.')}</p><div class="project-bottom"><span class="language">${escapeHTML(repo.language || 'Code')}</span><span class="repo-stats">★ ${repo.stargazers_count || 0} &nbsp;⑂ ${repo.forks_count || 0}</span></div>${repo.topics && repo.topics.length ? `<div class="repo-topics">${repo.topics.slice(0,4).map((topic) => `<span>${escapeHTML(topic)}</span>`).join('')}</div>` : ''}<p class="repo-stats">Updated ${new Date(repo.updated_at).toLocaleDateString()}</p></article>`).join('');
}

function initTheme() {
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  const saved = store.get('portfolio-theme');
  if (saved) root.dataset.theme = saved;
  else if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.dataset.theme = 'dark';
  toggle.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    store.set('portfolio-theme', root.dataset.theme);
  });
}
function initNavigation() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
  });
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false');
  }));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('open')) {
      nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.focus();
    }
  });
  document.querySelector('#current-year').textContent = new Date().getFullYear();
}


function initMotion() {
  const root = document.documentElement;
  const supportsObserver = 'IntersectionObserver' in window;
  const show = (el) => el.classList.add('is-visible');
  const io = supportsObserver ? new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { show(entry.target); io.unobserve(entry.target); }
  }), {threshold: 0.12, rootMargin: '0px 0px -6% 0px'}) : null;

  // Tag children of a container so they reveal one after another.
  const tag = (parent, kind = 'up', step = 90) => {
    Array.from(parent.children).forEach((el, i) => {
      if (el.classList.contains('reveal')) return;
      el.classList.add('reveal'); el.dataset.reveal = kind;
      el.style.setProperty('--d', `${Math.min(i, 6) * step}ms`);
      io ? io.observe(el) : show(el);
    });
  };
  const tagSelf = (el, kind = 'up', delay = 0) => {
    if (!el || el.classList.contains('reveal')) return;
    el.classList.add('reveal'); el.dataset.reveal = kind; el.style.setProperty('--d', `${delay}ms`);
    io ? io.observe(el) : show(el);
  };
  const each = (selector, fn) => document.querySelectorAll(selector).forEach(fn);

  each('.hero-copy', (el) => tag(el, 'up', 110));
  tagSelf(document.querySelector('.hero-visual'), 'pop', 250);
  tagSelf(document.querySelector('.hero-bottom'), 'up', 100);
  each('.section-heading', (el) => tag(el, 'up', 100));
  each('.about-copy', (el) => tag(el, 'left', 100));
  tagSelf(document.querySelector('.education-card'), 'right', 150);
  each('.research-grid, .skills-grid', (el) => tag(el, 'up', 110));
  each('.filter-row', (el) => tagSelf(el, 'up'));
  each('.contact-grid > div:first-child', (el) => tag(el, 'left', 90));
  tagSelf(document.querySelector('.contact-aside'), 'pop', 200);
  tagSelf(document.querySelector('.footer-inner'), 'up');

  // Cards rendered later from JSON / the GitHub API get the same treatment.
  ['#publication-list', '#github-projects'].forEach((selector) => {
    const container = document.querySelector(selector);
    if (!container) return;
    tag(container, 'up', 100);
    new MutationObserver(() => tag(container, 'up', 100)).observe(container, {childList: true});
  });

  root.classList.add('motion-ready');

  // Scroll progress bar
  const bar = document.querySelector('.scroll-progress');
  let ticking = false;
  const update = () => {
    const max = root.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(scrollY / max, 1) : 0})`;
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, {passive: true});
  update();

  // Highlight the nav link of the section being read
  if (supportsObserver) {
    const links = new Map(Array.from(document.querySelectorAll('#primary-nav a[href^="#"]')).map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a, id) => a.setAttribute('aria-current', String(id === entry.target.id)));
    }), {rootMargin: '-40% 0px -55% 0px'});
    links.forEach((_, id) => { const section = document.getElementById(id); if (section) spy.observe(section); });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme(); initNavigation(); initMotion();
  renderPublications(); loadGitHubProjects();
  initCopyButtons();
  document.querySelectorAll('.filter-chip').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach((chip) => {chip.classList.toggle('active', chip === button); chip.setAttribute('aria-pressed', String(chip === button));});
    renderProjectFilter(button.dataset.filter);
  }));
});
