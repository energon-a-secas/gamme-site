// ── Shared utilities ─────────────────────────────────────────
// Small, pure helpers used across modules.

/** Cached element lookup by ID. */
const _els = {};
export function $(id) {
  return _els[id] || (_els[id] = document.getElementById(id));
}

/** Escape HTML special characters. */
export function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Build an element in one call. */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Show a temporary toast notification. */
let _toastTimer = null;
export function showToast(msg) {
  let node = document.getElementById('app-toast');
  if (!node) {
    node = document.createElement('div');
    node.id = 'app-toast';
    node.className = 'toast';
    node.setAttribute('role', 'status');
    document.body.appendChild(node);
  }
  node.textContent = msg;
  node.classList.add('visible');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => node.classList.remove('visible'), 2200);
}

/** Simple debounce. */
export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Integer in [0, n). */
export function randInt(n) {
  return Math.floor(Math.random() * n);
}

/** Random element of an array. */
export function pick(arr) {
  return arr[randInt(arr.length)];
}

/** Fisher-Yates, in place. */
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Milliseconds as a short human string. */
export function fmtMs(ms) {
  if (ms == null) return '--';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Yield to the browser so a long loop does not freeze the UI.
 *
 * Deliberately not requestAnimationFrame: rAF never fires in a hidden tab, so
 * a measurement started and then backgrounded would hang forever instead of
 * finishing slowly. A MessageChannel round trip is not throttled and does not
 * care whether anything is being painted.
 */
const _yieldQueue = [];
let _yieldChannel;

function yieldChannel() {
  if (_yieldChannel !== undefined) return _yieldChannel;
  if (typeof MessageChannel !== 'function') return (_yieldChannel = null);
  const channel = new MessageChannel();
  channel.port1.onmessage = () => {
    const fn = _yieldQueue.shift();
    // An open port keeps Node's event loop alive, so an idle channel would stop
    // a script from ever exiting. Holding it open only while a yield is pending
    // avoids that without letting the process exit mid-await, which is the
    // failure a plain unref causes.
    if (!_yieldQueue.length) channel.port1.unref?.();
    if (fn) fn();
  };
  channel.port1.unref?.();
  channel.port2.unref?.();
  return (_yieldChannel = channel);
}

export function yieldToBrowser() {
  const channel = yieldChannel();
  if (!channel) return new Promise((resolve) => setTimeout(resolve, 0));
  return new Promise((resolve) => {
    _yieldQueue.push(resolve);
    channel.port1.ref?.();
    channel.port2.postMessage(0);
  });
}

/** Kept for callers that genuinely want to wait for a paint. */
export function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
