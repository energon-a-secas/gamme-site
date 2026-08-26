// ── Event wiring ─────────────────────────────────────────────
// Every listener is bound here. No inline onclick in index.html.

import { state, save, clearRecord, accuracy } from './state.js';
import { render } from './render.js';
import { allPatterns } from './registry.js';
import { el, $ } from './utils.js';

// ── Modal plumbing ───────────────────────────────────────────
function getFocusable(root) {
  const sel = ['a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'].join(',');
  return Array.from(root.querySelectorAll(sel)).filter((node) => {
    if (node.hasAttribute('disabled') || node.getAttribute('aria-hidden') === 'true') return false;
    return node.getClientRects().length > 0;
  });
}

let _modalLastFocus = null;

export function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  _modalLastFocus = document.activeElement;
  modal.removeAttribute('hidden');
  document.body.classList.add('modal-open');
  const dialog = modal.querySelector('.modal__dialog');
  const list = dialog ? getFocusable(dialog) : [];
  const closeBtn = modal.querySelector('.modal__header [data-modal-close]');
  const toFocus = closeBtn && list.includes(closeBtn) ? closeBtn : list[0];
  if (toFocus) toFocus.focus();
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.setAttribute('hidden', '');
  document.body.classList.remove('modal-open');
  if (_modalLastFocus && typeof _modalLastFocus.focus === 'function') _modalLastFocus.focus();
  _modalLastFocus = null;
}

function getOpenModal() { return document.querySelector('.modal:not([hidden])'); }

function onDocumentKeydown(e) {
  const menu = $('gameMenu');
  if (menu && !menu.hidden && e.key === 'Escape') { closeGameMenu(); return; }

  const modal = getOpenModal();
  if (!modal || !modal.id) return;
  if (e.key === 'Escape') { e.preventDefault(); closeModal(modal.id); return; }
  if (e.key !== 'Tab') return;
  const dialog = modal.querySelector('.modal__dialog');
  const list = dialog ? getFocusable(dialog) : [];
  if (!list.length) return;
  const first = list[0], last = list[list.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function onModalClick(e) {
  const modal = e.target.closest('.modal');
  if (!modal || modal.hasAttribute('hidden')) return;
  if (e.target.closest('[data-modal-close]')) closeModal(modal.id);
}

// ── Game switcher ────────────────────────────────────────────
function openGameMenu() {
  const menu = $('gameMenu');
  const btn = $('gameSwitchBtn');
  if (!menu || !btn) return;
  menu.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  const rect = btn.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 8}px`;
  menu.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
  menu.querySelector('button')?.focus();
}

function closeGameMenu() {
  const menu = $('gameMenu');
  const btn = $('gameSwitchBtn');
  if (!menu || !btn) return;
  menu.hidden = true;
  btn.setAttribute('aria-expanded', 'false');
}

// ── Progress ─────────────────────────────────────────────────
function renderProgress() {
  const body = $('progressBody');
  if (!body) return;
  const byGame = new Map();
  for (const p of allPatterns()) {
    if (!byGame.has(p.gameId)) byGame.set(p.gameId, { name: p.gameName, rows: [] });
    byGame.get(p.gameId).rows.push({ p, acc: accuracy(p.id), rec: state.record[p.id] });
  }

  const anyAttempts = [...byGame.values()].some((g) => g.rows.some((r) => r.rec));
  if (!anyAttempts) {
    body.replaceChildren(el('p', { text: 'Nothing drilled yet. Every pattern starts untested, and the Drill tab is what fills this in.' }));
    return;
  }

  body.replaceChildren(...[...byGame.values()].map((g) => el('div', { class: 'progblock' },
    el('h3', { class: 'progblock__title', text: g.name }),
    el('table', { class: 'progtable' },
      el('thead', {}, el('tr', {},
        el('th', { text: 'Pattern' }), el('th', { text: 'Tried' }),
        el('th', { text: 'Right' }), el('th', { text: 'Accuracy' }), el('th', { text: 'Best' }),
      )),
      el('tbody', {}, g.rows.map(({ p, acc, rec }) => el('tr', { class: rec ? '' : 'is-untested' },
        el('td', { text: p.name }),
        el('td', { text: rec ? String(rec.attempts) : '--' }),
        el('td', { text: rec ? String(rec.correct) : '--' }),
        el('td', { text: acc === null ? '--' : `${Math.round(acc * 100)}%` }),
        el('td', { text: rec && rec.bestMs != null ? `${(rec.bestMs / 1000).toFixed(1)}s` : '--' }),
      ))),
    ),
  )));
}

// ── Bind ─────────────────────────────────────────────────────
export function bindEvents(s = state) {
  document.addEventListener('keydown', onDocumentKeydown);
  document.addEventListener('click', onModalClick);

  $('viewTabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-view]');
    if (!btn) return;
    s.view = btn.dataset.view;
    save(s);
    render(s);
  });

  $('gameSwitchBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = $('gameMenu');
    if (menu && menu.hidden) openGameMenu(); else closeGameMenu();
  });

  $('gameMenu')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-game]');
    if (!btn) return;
    s.game = btn.dataset.game;
    save(s);
    closeGameMenu();
    render(s);
  });

  document.addEventListener('click', (e) => {
    const menu = $('gameMenu');
    if (!menu || menu.hidden) return;
    if (e.target.closest('#gameMenu') || e.target.closest('#gameSwitchBtn')) return;
    closeGameMenu();
  });

  $('progressBtn')?.addEventListener('click', () => { renderProgress(); openModal('progressModal'); });
  $('aboutBtn')?.addEventListener('click', () => openModal('aboutModal'));

  $('resetProgress')?.addEventListener('click', () => {
    clearRecord();
    renderProgress();
    render(s);
  });

  // Number keys 1-4 switch views when nothing has focus in a field.
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (getOpenModal()) return;
    // A focused board owns its own keys. Switching views out from under a
    // drill because the player pressed 2 is worse than losing the shortcut.
    if (document.activeElement?.closest('.msboard, .gboard, [data-board]')) return;
    const views = ['learn', 'drill', 'play', 'rules'];
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4) { s.view = views[n - 1]; save(s); render(s); }
  });

  window.addEventListener('resize', () => { if (!$('gameMenu')?.hidden) openGameMenu(); });
}
