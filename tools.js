/* JOMATH tools: calculator, graph, table, answer checking, public counters.
   © 2026 Dr. Amer Al-Daboubi. All rights reserved. */
(() => {
const M = () => window.math;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = { get(k) { try { return localStorage.getItem(k) } catch (e) { return null } }, set(k, v) { try { localStorage.setItem(k, v) } catch (e) { } } };
const FUNCS = new Set(['sqrt', 'cbrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'log10', 'ln', 'exp', 'abs', 'Abs', 'nthRoot', 'factorial', 'sec', 'csc', 'cot', 'floor', 'ceil', 'round']);
const CONST = new Set(['pi', 'e', 'E', 'i', 'I', 'Infinity']);

/* ---------- input normalisation (student typing) ---------- */
function norm(s) {
  s = String(s || '').trim();
  s = s.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  s = s.replace(/٫/g, '.').replace(/[،؛]/g, ',').replace(/\s+(أو|او|or|و)\s+/g, ',');
  s = s.replace(/[×✕·]/g, '*').replace(/÷/g, '/').replace(/[−–—]/g, '-').replace(/π/g, 'pi').replace(/[°%]/g, '')
    .replace(/²/g, '^2').replace(/³/g, '^3').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/≠/g, '!=')
    .replace(/س/g, 'x').replace(/ص/g, 'y').replace(/\bln\b/g, 'log').replace(/θ/g, 'theta');
  s = s.replace(/√\s*(\d+(\.\d+)?|[a-z])/g, 'sqrt($1)').replace(/√/g, 'sqrt');
  s = s.replace(/([a-zA-Z]+)\s*\(/g, (m, w) => FUNCS.has(w) ? w + '(' : (w.length === 1 ? w + '*(' : w + '('));
  s = s.replace(/\)\s*\(/g, ')*(');
  return s;
}
function topsplit(s) {
  const out = []; let d = 0, cur = '';
  for (const c of s) { if ('([{'.includes(c)) d++; if (')]}'.includes(c)) d--; if (d === 0 && (c === ',' || c === ';')) { out.push(cur); cur = ''; } else cur += c; }
  out.push(cur); return out.map(x => x.trim()).filter(Boolean);
}
const simpleLhs = l => /^\s*[A-Za-z](_?[A-Za-z0-9]+)?'*\s*(\(\s*[A-Za-z]\s*\))?\s*$/.test(l) || /^\s*(sin|cos|tan)\b[^+\-]*$/.test(l) || /^\s*[A-Z]{1,3}\s*$/.test(l);
function parseItem(raw) {
  const m = raw.match(/^(>=|<=|!=|>|<)$/); if (m) return null;
  const ineq = raw.split(/(>=|<=|!=|>|<)/);
  if (ineq.length === 3) {
    let [l, o, r] = ineq;
    if (!simpleLhs(l) && simpleLhs(r)) { [l, r] = [r, l]; o = { '>=': '<=', '<=': '>=', '>': '<', '<': '>', '!=': '!=' }[o]; }
    return [{ i: o, x: l.trim(), e: r }];
  }
  if (ineq.length === 5) { const [a, o1, x, o2, b] = ineq; const fl = { '<': '>', '<=': '>=' }; return [{ i: fl[o1] || o1, x: x.trim(), e: a }, { i: o2, x: x.trim(), e: b }]; }
  const pm = raw.match(/^\s*([A-Za-z]'*)?\s*\((.*)\)\s*$/);
  if (pm && topsplit(pm[2]).length >= 2) return [{ p: topsplit(pm[2]).map(c => c.split('=').pop()) }];
  const segs = raw.split('=');
  if (segs.length === 1) return [{ e: raw }];
  const last = segs[segs.length - 1].trim();
  if (segs.length === 2 && !simpleLhs(segs[0])) return [{ q: `(${segs[0]})-(${segs[1]})`, e: last }];
  return [{ e: last }];
}
function student(s) { return topsplit(norm(s)).flatMap(parseItem).filter(Boolean); }

/* ---------- evaluation ---------- */
function symbols(expr) {
  const out = new Set();
  try { M().parse(expr).traverse((n, path, parent) => { if (n.isSymbolNode && !(parent && parent.isFunctionNode && parent.fn === n) && !CONST.has(n.name) && !FUNCS.has(n.name)) out.add(n.name); }); } catch (e) { }
  return out;
}
const scopeBase = () => ({ E: Math.E, I: M().complex(0, 1), log: x => M().log(x), Abs: x => M().abs(x), ln: x => M().log(x), sec: x => M().divide(1, M().cos(x)), csc: x => M().divide(1, M().sin(x)), cot: x => M().divide(1, M().tan(x)) });
function ev(expr, sc) { const v = M().evaluate(expr.replace(/\bI\b/g, 'I'), Object.assign(scopeBase(), sc)); return typeof v === 'number' ? M().complex(v, 0) : M().complex(v); }
function decTol(str) { const m = String(str).trim().match(/^-?\d*\.(\d+)$/); return m ? 0.51 * Math.pow(10, -m[1].length) : 0; }
function closeVal(a, b, tol) { const d = M().abs(M().subtract(a, b)); const mag = Math.max(1, M().abs(a)); return d <= Math.max(1e-7 * mag, tol); }
function points(vars) { const pts = []; for (let k = 0; k < 4; k++) { const sc = {}; vars.forEach(v => sc[v] = 0.37 + 1.71 * Math.random() + k * 0.13); pts.push(sc); } return pts; }
function sameExpr(t, s, approx) {
  const vars = new Set([...symbols(t), ...symbols(s)]);
  const tol = Math.max(decTol(t), decTol(s), approx ? 0.006 * Math.abs(+t || 0) : 0);
  try { for (const sc of points(vars)) { if (!closeVal(ev(t, sc), ev(s, sc), tol)) return false; } return true; } catch (e) { return false; }
}
function propEq(t, s) {
  const vars = new Set([...symbols(t), ...symbols(s)]); let r = null;
  try { for (const sc of points(vars)) { const a = ev(t, sc), b = ev(s, sc); if (M().abs(b) < 1e-12) { if (M().abs(a) > 1e-9) return false; continue; } const q = M().divide(a, b); if (r === null) r = q; else if (!closeVal(r, q, 1e-6)) return false; } return r !== null && M().abs(r) > 1e-12; } catch (e) { return false; }
}
function matchOne(t, s) {
  if (t.p) return !!s.p && s.p.length === t.p.length && t.p.every((c, k) => sameExpr(c, s.p[k], false));
  if (t.i) return !!s.i && s.i === t.i && sameExpr(t.e, s.e, false);
  if (t.q) return (s.q && propEq(t.q, s.q)) || false;
  if (t.e !== undefined) return s.e !== undefined && !s.i && sameExpr(t.e, s.e, t.a);
  return false;
}
function check(keys, input) {
  const ss = student(input); if (!ss.length) return { st: 'empty' };
  const used = new Set(); let hit = 0;
  for (const t of keys) { const j = ss.findIndex((s, k) => !used.has(k) && matchOne(t, s)); if (j >= 0) { used.add(j); hit++; } }
  if (hit === keys.length && used.size === ss.length) return { st: 'ok' };
  if (hit) return { st: 'part', hit, n: keys.length };
  return { st: 'no' };
}
function preview(input) {
  try { return topsplit(norm(input)).map(p => M().parse(p.replace(/(>=|<=|!=)/g, m => ({ '>=': '>=', '<=': '<=', '!=': '!=' }[m]))).toTex({ parenthesis: 'auto', implicit: 'hide' })).join(',\\ '); } catch (e) { return null; }
}

/* ---------- counters (public) ---------- */
const NS = 'jomath-amer-aldaboubi';
const CNT = { base: 'https://abacus.jasoncameron.dev' };
async function hit(key) { try { const r = await fetch(`${CNT.base}/hit/${NS}/${key}`); return (await r.json()).value; } catch (e) { return null; } }
async function getC(key) { try { const r = await fetch(`${CNT.base}/get/${NS}/${key}`); if (!r.ok) return 0; return (await r.json()).value; } catch (e) { return null; } }
const stats = { users: null, solved: null, visits: null, listeners: [] };
function emit() { stats.listeners.forEach(f => f(stats)); document.querySelectorAll('[data-stat]').forEach(el => { const v = stats[el.dataset.stat]; if (v != null) el.textContent = Number(v).toLocaleString('ar-JO'); }); }
async function initCounters() {
  let first = !store.get('jm_uid');
  if (first) store.set('jm_uid', Math.random().toString(36).slice(2));
  let ses = false; try { ses = sessionStorage.getItem('jm_ses'); sessionStorage.setItem('jm_ses', 1); } catch (e) { }
  const [u, v, s] = await Promise.all([first ? hit('users') : getC('users'), ses ? getC('visits') : hit('visits'), getC('solved')]);
  stats.users = u; stats.visits = v; stats.solved = s; emit();
}
function solvedOnce(id) {
  let set; try { set = JSON.parse(store.get('jm_solved') || '[]'); } catch (e) { set = []; }
  if (set.includes(id)) return; set.push(id); store.set('jm_solved', JSON.stringify(set.slice(-5000)));
  stats.solved = (stats.solved || 0) + 1; emit();
  hit('solved').then(v => { if (v != null) { stats.solved = v; emit(); } });
}
const mySolved = () => { try { return JSON.parse(store.get('jm_solved') || '[]').length; } catch (e) { return 0; } };

/* ---------- tool dock ---------- */
const TOOLS = { c: 'آلة حاسبة', g: 'رسم بياني', t: 'جدول' };
const ICON = {
  c: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="8" y="5.5" width="8" height="4" rx="1" fill="currentColor"/><circle cx="9" cy="13" r="1.2" fill="currentColor"/><circle cx="12" cy="13" r="1.2" fill="currentColor"/><circle cx="15" cy="13" r="1.2" fill="currentColor"/><circle cx="9" cy="17" r="1.2" fill="currentColor"/><circle cx="12" cy="17" r="1.2" fill="currentColor"/><circle cx="15" cy="17" r="1.2" fill="currentColor"/></svg>',
  g: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M3 21V3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 17c3-9 6-9 8-4s4 4 7-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  t: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 9h18M3 14.5h18M10 4v16" stroke="currentColor" stroke-width="2"/></svg>'
};
function chips(tl) { return (tl || '').split('').filter(c => TOOLS[c]).map(c => `<button type="button" class="tchip" data-tool="${c}" title="افتح ${TOOLS[c]}">${ICON[c]}${TOOLS[c]}</button>`).join(''); }

let dock;
function buildDock() {
  if (dock) return dock;
  dock = document.createElement('aside'); dock.className = 'tdock'; dock.hidden = true; dock.setAttribute('aria-label', 'أدوات الحل');
  dock.innerHTML = `<div class="tdh"><div class="ttabs" role="tablist">${Object.entries(TOOLS).map(([k, n]) => `<button type="button" role="tab" data-tab="${k}">${ICON[k]}${n}</button>`).join('')}</div><button type="button" class="tclose" aria-label="إغلاق الأدوات">✕</button></div>
  <div class="tpane" data-pane="c">${calcHTML()}</div><div class="tpane" data-pane="g">${graphHTML()}</div><div class="tpane" data-pane="t">${tableHTML()}</div>`;
  document.body.appendChild(dock);
  dock.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => openTool(b.dataset.tab));
  $('.tclose', dock).onclick = () => { dock.hidden = true; document.body.classList.remove('tool-open'); };
  wireCalc(); wireGraph(); wireTable();
  return dock;
}
function addFab() {
  if (!document.body || document.querySelector('.tfab')) return;
  const fab = document.createElement('button'); fab.type = 'button'; fab.className = 'tfab'; fab.innerHTML = ICON.c + '<span>الأدوات</span>';
  fab.onclick = () => (!dock || dock.hidden) ? openTool(store.get('jm_tool') || 'c') : $('.tclose', dock).click();
  document.body.appendChild(fab);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addFab); else addFab();
function openTool(k) {
  buildDock(); dock.hidden = false; document.body.classList.add('tool-open'); store.set('jm_tool', k);
  dock.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === k)));
  dock.querySelectorAll('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== k);
  if (k === 'g') setTimeout(drawGraph, 0);
  if (k === 'c') setTimeout(() => $('#cIn', dock).focus({ preventScroll: true }), 0);
}

/* ---------- calculator ---------- */
const C = { mode: 'calc', deg: true, ans: 0, frac: false, shift: false, mem: 0 };
function calcHTML() {
  const K = [
    ['SHIFT', 'sh', 'fn'], ['DEG', 'deg', 'fn'], ['S⇔D', 'sd', 'fn'], ['(', '(', 'op'], [')', ')', 'op'],
    ['sin', 'sin(', 'fn', 'sin⁻¹', 'asin('], ['cos', 'cos(', 'fn', 'cos⁻¹', 'acos('], ['tan', 'tan(', 'fn', 'tan⁻¹', 'atan('], ['log', 'log10(', 'fn', '10ˣ', '10^('], ['ln', 'ln(', 'fn', 'eˣ', 'e^('],
    ['√', 'sqrt(', 'fn', '∛', 'cbrt('], ['x²', '^2', 'fn', 'x³', '^3'], ['xʸ', '^', 'fn', 'ʸ√x', 'nthRoot('], ['x⁻¹', '^(-1)', 'fn', 'x!', '!'], ['|x|', 'abs(', 'fn', '%', '/100'],
    ['7', '7'], ['8', '8'], ['9', '9'], ['DEL', 'del', 'del'], ['AC', 'ac', 'del'],
    ['4', '4'], ['5', '5'], ['6', '6'], ['×', '*', 'op'], ['÷', '/', 'op'],
    ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+', 'op'], ['−', '-', 'op'],
    ['0', '0'], ['.', '.'], ['π', 'pi', 'fn', 'e', 'e'], ['Ans', 'Ans', 'fn', 'x', 'x'], ['=', 'eq', 'eq']
  ];
  return `<div class="cmode" role="tablist"><button type="button" data-cm="calc" aria-selected="true">حساب</button><button type="button" data-cm="solve">حل معادلة</button><button type="button" data-cm="stat">إحصاء</button><button type="button" data-cm="frac">تحليل وكسور</button></div>
  <div class="cscreen" dir="ltr"><div class="cflags"><span id="cDeg">D</span><span id="cSh"></span><span id="cModeL">COMP</span></div>
    <input id="cIn" class="cin" type="text" inputmode="text" autocomplete="off" spellcheck="false" aria-label="المدخل" placeholder="0">
    <div class="cprev" id="cPrev"></div><div class="cout" id="cOut">0</div></div>
  <div class="chelp" id="cHelp"></div>
  <div class="ckeys" dir="ltr">${K.map(([l, v, c, sl, sv]) => `<button type="button" class="ck ${c || 'num'}" data-k="${esc(v)}"${sv ? ` data-sk="${esc(sv)}"` : ''}>${sl ? `<small>${sl}</small>` : ''}${l}</button>`).join('')}</div>`;
}
const HELP = {
  calc: '', solve: 'اكتب معادلة بالمتغيّر x، مثل: <code>2x^2-3x-5=0</code> أو <code>x^3=x+1</code> ثم اضغط =. تظهر الحلول الحقيقية.',
  stat: 'اكتب القيم مفصولة بفواصل، مثل: <code>12, 15, 15, 18, 21</code>. وللتكرارات اكتب القيمة:التكرار مثل <code>2:3, 4:5, 6:2</code>.',
  frac: 'اكتب عددًا أو عبارة: يظهر الناتج كسرًا، وتحليل العدد الصحيح إلى عوامله الأولية، وتبسيط الجذر. أو اكتب كثير حدود بالمتغيّر x لتحليله إن أمكن، مثل <code>x^2-5x+6</code>.'
};
function trigScope() {
  const m = M(), k = C.deg ? Math.PI / 180 : 1;
  const r = v => (Math.abs(v) < 1e-13 ? 0 : v);
  return {
    sin: x => r(Math.sin(x * k)), cos: x => r(Math.cos(x * k)), tan: x => { const c = Math.cos(x * k); if (Math.abs(c) < 1e-13) throw new Error('Math ERROR'); return r(Math.tan(x * k)); },
    asin: x => Math.asin(x) / k, acos: x => Math.acos(x) / k, atan: x => Math.atan(x) / k, ln: x => m.log(x), log10: x => m.log10(x),
    Ans: C.ans, x: C.mem
  };
}
function calcPrep(s) { return norm(s).replace(/\bAns\b/g, 'Ans').replace(/(\d)!/g, 'factorial($1)').replace(/\)!/g, ')!'); }
function fmt(v) {
  const m = M();
  if (v && v.isComplex) { if (Math.abs(v.im) < 1e-12) v = v.re; else return m.format(v, { precision: 10 }); }
  if (typeof v !== 'number') return m.format(v, { precision: 10 });
  if (!isFinite(v)) return 'Math ERROR';
  if (C.frac) { const f = toFrac(v); if (f) return f; }
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e10 || a < 1e-9)) return v.toExponential(9).replace(/\.?0+e/, '×10^').replace('×10^+', '×10^');
  return String(+v.toPrecision(10));
}
function toFrac(v) {
  if (Number.isInteger(v)) return null;
  try { const f = M().fraction(v); if (f.d > 100000) return surd(v); const s = (f.s < 0 ? '-' : '') + f.n + '/' + f.d; if (Math.abs(f.s * f.n / f.d - v) < 1e-12) return s; } catch (e) { }
  return surd(v);
}
function surd(v) { // a√b / c recognition
  for (let b = 2; b <= 200; b++) { if (Math.sqrt(b) % 1 === 0) continue; const q = v / Math.sqrt(b); try { const f = M().fraction(q); if (f.d <= 50 && f.n <= 500 && Math.abs(f.s * f.n / f.d - q) < 1e-10) { const a = f.s * f.n; return `${a === 1 ? '' : a === -1 ? '-' : a}√${b}${f.d > 1 ? '/' + f.d : ''}`; } } catch (e) { } }
  return null;
}
function calcEval() {
  const inp = $('#cIn', dock).value, out = $('#cOut', dock);
  if (!inp.trim()) return;
  try {
    if (C.mode === 'solve') out.innerHTML = solveEq(inp);
    else if (C.mode === 'stat') out.innerHTML = statOf(inp);
    else if (C.mode === 'frac') out.innerHTML = fracOf(inp);
    else { const v = M().evaluate(calcPrep(inp), trigScope()); C.ans = typeof v === 'number' ? v : (v && v.isComplex && Math.abs(v.im) < 1e-12 ? v.re : v); out.textContent = fmt(C.ans); }
  } catch (e) { out.textContent = /ERROR/.test(e.message) ? e.message : 'Syntax ERROR'; }
}
function solveEq(s) {
  let [l, r] = norm(s).split('='); r = r === undefined ? '0' : r;
  const f = M().compile(`(${l})-(${r})`), sc = trigScope();
  const F = x => { try { const v = f.evaluate(Object.assign({}, sc, { x })); return typeof v === 'number' ? v : (v.isComplex && Math.abs(v.im) < 1e-9 ? v.re : NaN); } catch (e) { return NaN; } };
  const roots = []; const add = x => { if (isFinite(x) && Math.abs(F(x)) < 1e-7 && !roots.some(y => Math.abs(y - x) < 1e-6)) roots.push(x); };
  const N = 40000, A = -1000, B = 1000; let px = A, pv = F(A);
  for (let k = 1; k <= N; k++) {
    const x = A + (B - A) * k / N, v = F(x);
    if (isFinite(pv) && isFinite(v)) {
      if (pv === 0) add(px);
      else if (pv * v < 0) { let a = px, b = x, fa = pv; for (let it = 0; it < 80; it++) { const m = (a + b) / 2, fm = F(m); if (fa * fm <= 0) b = m; else { a = m; fa = fm; } } add((a + b) / 2); }
      else if (Math.abs(v) < 1e-3) { let x0 = x; for (let it = 0; it < 50; it++) { const h = 1e-6, d = (F(x0 + h) - F(x0 - h)) / (2 * h); if (!d) break; x0 -= F(x0) / d; } add(x0); }
    }
    px = x; pv = v;
  }
  roots.sort((a, b) => a - b);
  if (!roots.length) return '<span class="cr">لا توجد حلول حقيقية في الفترة [−1000، 1000]</span>';
  return roots.slice(0, 8).map((x, k) => `<span class="cr">x<sub>${k + 1}</sub> = ${esc(fmtR(x))}</span>`).join('');
}
const fmtR = x => { const r = Math.round(x * 1e9) / 1e9; const f = toFrac(r); return Number.isInteger(r) ? String(r) : (f ? `${f} ≈ ${+r.toPrecision(8)}` : String(+r.toPrecision(10))); };
function statOf(s) {
  const vals = [];
  topsplit(norm(s).replace(/\s+/g, ',')).forEach(t => { const [v, f] = t.split(':'); const n = f === undefined ? 1 : +M().evaluate(f); const x = +M().evaluate(v); for (let k = 0; k < n; k++) vals.push(x); });
  if (!vals.length) throw new Error();
  const a = [...vals].sort((x, y) => x - y), n = a.length, sum = a.reduce((p, x) => p + x, 0), mean = sum / n;
  const med = arr => arr.length % 2 ? arr[(arr.length - 1) / 2] : (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2;
  const lo = a.slice(0, Math.floor(n / 2)), hi = a.slice(Math.ceil(n / 2));
  const ss = a.reduce((p, x) => p + (x - mean) ** 2, 0);
  const cnt = {}; a.forEach(x => cnt[x] = (cnt[x] || 0) + 1); const mx = Math.max(...Object.values(cnt)); const mode = mx > 1 ? Object.keys(cnt).filter(k => cnt[k] === mx).join('، ') : 'لا يوجد';
  const r = x => String(+x.toPrecision(8));
  const rows = [['n العدد', n], ['Σx المجموع', r(sum)], ['x̄ الوسط الحسابي', r(mean)], ['الوسيط', r(med(a))], ['المنوال', mode], ['المدى', r(a[n - 1] - a[0])], ['Q₁ الربيع الأدنى', n > 1 ? r(med(lo)) : '-'], ['Q₃ الربيع الأعلى', n > 1 ? r(med(hi)) : '-'], ['σ الانحراف المعياري (مجتمع)', r(Math.sqrt(ss / n))], ['s الانحراف المعياري (عيّنة)', n > 1 ? r(Math.sqrt(ss / (n - 1))) : '-'], ['σ² التباين', r(ss / n)]];
  return `<table class="cst">${rows.map(([k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('')}</table>`;
}
function primeF(n) { const f = []; let d = 2; while (n > 1 && d * d <= n) { while (n % d === 0) { f.push(d); n /= d; } d++; } if (n > 1) f.push(n); const c = {}; f.forEach(p => c[p] = (c[p] || 0) + 1); return Object.entries(c).map(([p, k]) => k > 1 ? `${p}<sup>${k}</sup>` : p).join(' × '); }
function fracOf(s) {
  const t = norm(s); const out = [];
  if (/x/.test(t)) {
    const fz = factorPoly(t); out.push(fz ? `<span class="cr">${esc(fz)}</span>` : '<span class="cr">لا يمكن تحليلها إلى عوامل نسبية</span>');
    return out.join('');
  }
  const v = M().evaluate(t, trigScope()); const num = typeof v === 'number' ? v : v.re;
  const fr = toFrac(num); out.push(`<span class="cr">${esc(fr || fmt(num))}</span>`);
  if (fr && !fr.includes('√')) { const f = M().fraction(num); const w = Math.trunc(f.n / f.d); if (w && f.d > 1) out.push(`<span class="cr small">عدد كسري: ${f.s < 0 ? '-' : ''}${w} و ${f.n % f.d}/${f.d}</span>`); }
  out.push(`<span class="cr small">عشري: ${+num.toPrecision(10)}</span>`);
  if (Number.isInteger(num) && Math.abs(num) > 1 && Math.abs(num) < 1e12) out.push(`<span class="cr small">التحليل إلى عوامل أولية: ${num < 0 ? '−1 × ' : ''}${primeF(Math.abs(num))}</span>`);
  if (Number.isInteger(num) && num > 1) { let a = 1, b = num; for (let k = Math.floor(Math.sqrt(num)); k > 1; k--) if (num % (k * k) === 0) { a = k; b = num / (k * k); break; } if (a > 1) out.push(`<span class="cr small">√${num} = ${a}√${b}</span>`); }
  return out.join('');
}
function factorPoly(t) { // integer-coefficient polynomial in x up to degree 6, rational roots
  let co; try { const r = M().rationalize(t, {}, true); if (!r.coefficients || !r.coefficients.length) return null; co = r.coefficients.map(c => +c); if (r.denominator && r.denominator.toString() !== '1') return null; } catch (e) { return null; }
  while (co.length && Math.abs(co[co.length - 1]) < 1e-12) co.pop();
  if (co.length < 3 || co.some(c => !Number.isInteger(c))) return null;
  const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
  let g = co.reduce((a, c) => gcd(a, c), 0); if (co[co.length - 1] < 0) g = -g;
  let p = co.map(c => c / g); const fac = [];
  const divs = n => { n = Math.abs(n); const d = []; for (let k = 1; k <= n; k++) if (n % k === 0) d.push(k); return d; };
  let zeros = 0; while (p.length > 1 && p[0] === 0) { p.shift(); zeros++; }
  let changed = true;
  while (p.length > 2 && changed) {
    changed = false;
    for (const q of divs(p[p.length - 1])) { for (const r0 of divs(p[0])) { for (const sg of [1, -1]) {
      const r = sg * r0 / q; const val = p.reduce((a, c, k) => a + c * r ** k, 0);
      if (Math.abs(val) < 1e-9) { // divide by (q x - sg r0)
        const hi = [...p].reverse(); const out = []; let carry = 0;
        for (let k = 0; k < hi.length - 1; k++) { const c = (hi[k] + carry) / q; out.push(c); carry = c * sg * r0; }
        p = out.reverse(); fac.push(`(${q === 1 ? '' : q}x ${sg * r0 > 0 ? '−' : '+'} ${r0})`); changed = true; break;
      } } if (changed) break; } if (changed) break; }
  }
  if (!fac.length && !zeros && Math.abs(g) === 1) return null;
  const rest = p.length > 1 ? polyStr(p) : (p[0] === 1 ? '' : String(p[0]));
  return `${g === 1 ? '' : g === -1 ? '−' : g}${zeros ? (zeros > 1 ? `x^${zeros}` : 'x') : ''}${fac.join('')}${rest && rest !== '1' ? (fac.length || zeros ? `(${rest})` : rest) : ''}`;
}
function polyStr(p) { return p.map((c, k) => [c, k]).reverse().filter(([c]) => c).map(([c, k], j) => `${c < 0 ? (j ? ' − ' : '−') : (j ? ' + ' : '')}${Math.abs(c) === 1 && k ? '' : Math.abs(c)}${k ? (k > 1 ? `x^${k}` : 'x') : ''}`).join(''); }
function wireCalc() {
  const inp = $('#cIn', dock), prev = $('#cPrev', dock);
  const upd = () => { const t = preview(calcPrep(inp.value).replace(/\bAns\b/g, 'Ans')); if (t && window.katex) { try { katex.render(t, prev, { throwOnError: false }); } catch (e) { prev.textContent = ''; } } else prev.textContent = ''; };
  inp.addEventListener('input', upd);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); calcEval(); } });
  const ins = v => { const a = inp.selectionStart ?? inp.value.length, b = inp.selectionEnd ?? a; inp.value = inp.value.slice(0, a) + v + inp.value.slice(b); const p = a + v.length; inp.setSelectionRange(p, p); upd(); };
  dock.querySelectorAll('.ck').forEach(b => b.onclick = () => {
    let k = b.dataset.k;
    if (C.shift && b.dataset.sk) { k = b.dataset.sk; C.shift = false; $('#cSh', dock).textContent = ''; }
    if (k === 'sh') { C.shift = !C.shift; $('#cSh', dock).textContent = C.shift ? 'S' : ''; return; }
    if (k === 'deg') { C.deg = !C.deg; $('#cDeg', dock).textContent = C.deg ? 'D' : 'R'; b.textContent = C.deg ? 'DEG' : 'RAD'; return calcEval(); }
    if (k === 'sd') { C.frac = !C.frac; if (C.mode === 'calc') $('#cOut', dock).textContent = fmt(C.ans); return; }
    if (k === 'eq') return calcEval();
    if (k === 'ac') { inp.value = ''; $('#cOut', dock).textContent = '0'; upd(); return; }
    if (k === 'del') { const a = inp.selectionStart ?? inp.value.length; if (a > 0) { inp.value = inp.value.slice(0, a - 1) + inp.value.slice(a); inp.setSelectionRange(a - 1, a - 1); } upd(); return; }
    if (k === 'x' && C.mode !== 'solve' && C.mode !== 'frac') k = 'x';
    ins(k); if (!matchMedia('(pointer:coarse)').matches) inp.focus();
  });
  dock.querySelectorAll('[data-cm]').forEach(b => b.onclick = () => {
    C.mode = b.dataset.cm; dock.querySelectorAll('[data-cm]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    $('#cModeL', dock).textContent = { calc: 'COMP', solve: 'SOLVE', stat: 'STAT', frac: 'FRAC' }[C.mode];
    $('#cHelp', dock).innerHTML = HELP[C.mode]; $('#cOut', dock).textContent = ''; inp.focus();
  });
}

/* ---------- graph ---------- */
const GCOL = ['#2457d6', '#d9283f', '#16a05d', '#c88a06', '#7b3fe4'];
const G = { cx: 0, cy: 0, sc: 40, fns: [], pts: [], drag: null, mouse: null };
function graphHTML() {
  return `<div class="gfns" id="gFns"></div>
  <div class="grow"><button type="button" class="btn" id="gAdd">+ اقتران</button><button type="button" class="btn" id="gIn">تكبير +</button><button type="button" class="btn" id="gOut">تصغير −</button><button type="button" class="btn" id="gHome">الأصل</button></div>
  <div class="gwrap"><canvas id="gCv" aria-label="لوحة الرسم البياني"></canvas><div class="gtip" id="gTip" dir="ltr"></div></div>
  <p class="ghint">اكتب الاقتران مثل <code>y=x^2-4x+3</code> أو <code>sin(x)</code> أو مستقيمًا رأسيًا <code>x=2</code>، أو نقاطًا <code>(1,2), (3,-1)</code>. اسحب لتحريك المستوى، واستخدم عجلة الفأرة أو إصبعين للتكبير. تظهر نقاط التقاطع مع المحورين وبين المنحنيات عند لمسها.</p>`;
}
function fnRow(v, k) { return `<div class="gfn"><i style="background:${GCOL[k % GCOL.length]}"></i><input dir="ltr" type="text" value="${esc(v)}" data-gf="${k}" placeholder="y = …" aria-label="الاقتران ${k + 1}" autocomplete="off" spellcheck="false"><button type="button" data-gx="${k}" aria-label="حذف">✕</button></div>`; }
function wireGraph() {
  const box = $('#gFns', dock);
  let rows = JSON.parse(store.get('jm_gfns') || '["y=x^2-2x-3",""]');
  const redraw = () => { box.innerHTML = rows.map(fnRow).join(''); box.querySelectorAll('[data-gf]').forEach(i => i.oninput = () => { rows[+i.dataset.gf] = i.value; store.set('jm_gfns', JSON.stringify(rows)); compileFns(rows); drawGraph(); }); box.querySelectorAll('[data-gx]').forEach(b => b.onclick = () => { rows.splice(+b.dataset.gx, 1); if (!rows.length) rows.push(''); store.set('jm_gfns', JSON.stringify(rows)); redraw(); compileFns(rows); drawGraph(); }); };
  G.setRows = r => { rows = r; store.set('jm_gfns', JSON.stringify(rows)); redraw(); compileFns(rows); drawGraph(); };
  G.rows = () => rows;
  redraw(); compileFns(rows);
  $('#gAdd', dock).onclick = () => { if (rows.length < 5) { rows.push(''); redraw(); box.querySelectorAll('input')[rows.length - 1].focus(); } };
  $('#gIn', dock).onclick = () => { G.sc *= 1.4; drawGraph(); };
  $('#gOut', dock).onclick = () => { G.sc /= 1.4; drawGraph(); };
  $('#gHome', dock).onclick = () => { G.cx = 0; G.cy = 0; G.sc = 40; drawGraph(); };
  const cv = $('#gCv', dock);
  const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const ptrs = new Map(); let pinch = null;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, pos(e)); if (ptrs.size === 1) G.drag = { p: pos(e), cx: G.cx, cy: G.cy }; else { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), sc: G.sc }; G.drag = null; } });
  cv.addEventListener('pointermove', e => {
    const p = pos(e);
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, p);
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; G.sc = Math.min(4000, Math.max(2, pinch.sc * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)); drawGraph(); return; }
    if (G.drag) { G.cx = G.drag.cx - (p[0] - G.drag.p[0]) / G.sc; G.cy = G.drag.cy + (p[1] - G.drag.p[1]) / G.sc; drawGraph(); return; }
    G.mouse = p; drawGraph();
  });
  const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) G.drag = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', () => { G.mouse = null; drawGraph(); });
  cv.addEventListener('wheel', e => { e.preventDefault(); const p = pos(e), W = cv.clientWidth, H = cv.clientHeight; const wx = G.cx + (p[0] - W / 2) / G.sc, wy = G.cy - (p[1] - H / 2) / G.sc; G.sc = Math.min(4000, Math.max(2, G.sc * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); G.cx = wx - (p[0] - W / 2) / G.sc; G.cy = wy + (p[1] - H / 2) / G.sc; drawGraph(); }, { passive: false });
  window.addEventListener('resize', () => { if (!dock.hidden) drawGraph(); });
}
function compileFns(rows) {
  G.fns = []; G.pts = [];
  rows.forEach((r, k) => {
    const s = norm(r); if (!s) return;
    const col = GCOL[k % GCOL.length];
    if (/^\s*\(/.test(s) && /\)\s*$/.test(s)) { topsplit(s).forEach(p => { const m = p.match(/^\(\s*([^,]+),([^)]+)\)$/); if (m) try { G.pts.push({ x: +M().evaluate(m[1]), y: +M().evaluate(m[2]), col }); } catch (e) { } }); return; }
    const vx = s.match(/^\s*x\s*=\s*(.+)$/); if (vx) { try { G.fns.push({ vx: +M().evaluate(vx[1]), col }); } catch (e) { } return; }
    const rhs = s.replace(/^\s*(y|f\s*\(\s*x\s*\)|[a-z]\s*\(\s*x\s*\))\s*=\s*/, '');
    try { const c = M().compile(rhs); G.fns.push({ f: x => { try { const v = c.evaluate(Object.assign(trigScopeRad(), { x })); return typeof v === 'number' ? v : (v && v.isComplex && Math.abs(v.im) < 1e-9 ? v.re : NaN); } catch (e) { return NaN; } }, col }); } catch (e) { }
  });
}
function trigScopeRad() { return { ln: x => M().log(x), log10: x => M().log10(x), sec: x => 1 / Math.cos(x), csc: x => 1 / Math.sin(x), cot: x => 1 / Math.tan(x) }; }
function niceStep(sc) { const raw = 80 / sc, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 2 ? 1 : m < 5 ? 2 : 5) * p; }
function drawGraph() {
  if (!dock || dock.hidden) return;
  const cv = $('#gCv', dock); const W = cv.clientWidth, H = cv.clientHeight; if (!W) return;
  const dpr = window.devicePixelRatio || 1; cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.direction = 'ltr'; g.clearRect(0, 0, W, H);
  const X = x => W / 2 + (x - G.cx) * G.sc, Y = y => H / 2 - (y - G.cy) * G.sc;
  const x0 = G.cx - W / 2 / G.sc, x1 = G.cx + W / 2 / G.sc, y0 = G.cy - H / 2 / G.sc, y1 = G.cy + H / 2 / G.sc;
  const st = niceStep(G.sc); g.lineWidth = 1; g.font = '11px system-ui'; g.fillStyle = '#6b7280';
  for (let x = Math.ceil(x0 / st) * st; x <= x1; x += st) { g.strokeStyle = Math.abs(x) < st / 2 ? '#0e1a3c' : '#e5e9f2'; g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), H); g.stroke(); if (Math.abs(x) > st / 2) g.fillText(+x.toPrecision(6), X(x) + 2, Math.min(H - 4, Math.max(12, Y(0) + 12))); }
  for (let y = Math.ceil(y0 / st) * st; y <= y1; y += st) { g.strokeStyle = Math.abs(y) < st / 2 ? '#0e1a3c' : '#e5e9f2'; g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(W, Y(y)); g.stroke(); if (Math.abs(y) > st / 2) g.fillText(+y.toPrecision(6), Math.min(W - 30, Math.max(2, X(0) + 3)), Y(y) - 2); }
  g.lineWidth = 2.4;
  for (const F of G.fns) {
    g.strokeStyle = F.col; g.beginPath();
    if (F.vx !== undefined) { g.moveTo(X(F.vx), 0); g.lineTo(X(F.vx), H); g.stroke(); continue; }
    let pen = false, py = null;
    for (let px = 0; px <= W; px += 1) { const x = x0 + px / G.sc, y = F.f(x); if (!isFinite(y) || (py !== null && Math.abs(Y(y) - py) > H * 2)) { pen = false; py = null; continue; } const sy = Y(y); if (sy < -5 * H || sy > 6 * H) { pen = false; py = null; continue; } if (!pen) { g.moveTo(px, sy); pen = true; } else g.lineTo(px, sy); py = sy; }
    g.stroke();
  }
  for (const P of G.pts) { g.fillStyle = P.col; g.beginPath(); g.arc(X(P.x), Y(P.y), 4.5, 0, 7); g.fill(); }
  // special points: roots, y-intercepts, intersections
  const sp = [];
  const scan = (h, tag) => { let px = x0, pv = h(x0); const n = 600; for (let k = 1; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, v = h(x); if (isFinite(pv) && isFinite(v) && pv * v <= 0 && Math.abs(pv - v) < (y1 - y0)) { let a = px, b = x, fa = pv; for (let it = 0; it < 60; it++) { const m = (a + b) / 2, fm = h(m); if (fa * fm <= 0) b = m; else { a = m; fa = fm; } } sp.push({ x: (a + b) / 2, tag }); } px = x; pv = v; } };
  G.fns.filter(F => F.f).forEach((F, k, arr) => { scan(F.f, F); const y = F.f(0); if (isFinite(y)) sp.push({ x: 0, y, tag: F }); arr.slice(k + 1).forEach(H => scan(x => F.f(x) - H.f(x), F)); });
  sp.forEach(s => { if (s.y === undefined) s.y = s.tag.f(s.x); });
  g.fillStyle = '#0e1a3c'; sp.filter(s => isFinite(s.y)).forEach(s => { g.beginPath(); g.arc(X(s.x), Y(s.y), 3.2, 0, 7); g.fill(); });
  const tip = $('#gTip', dock); tip.hidden = true;
  if (G.mouse) {
    const [mx, my] = G.mouse; const near = [...sp, ...G.pts].filter(s => isFinite(s.y)).find(s => Math.hypot(X(s.x) - mx, Y(s.y) - my) < 12);
    let label = null, at = null;
    if (near) { label = `(${r4(near.x)}, ${r4(near.y)})`; at = [X(near.x), Y(near.y)]; }
    else { const x = x0 + mx / G.sc; for (const F of G.fns) { if (!F.f) continue; const y = F.f(x); if (isFinite(y) && Math.abs(Y(y) - my) < 14) { label = `(${r4(x)}, ${r4(y)})`; at = [mx, Y(y)]; g.fillStyle = F.col; g.beginPath(); g.arc(mx, Y(y), 4, 0, 7); g.fill(); break; } } }
    if (label) { tip.hidden = false; tip.textContent = label; tip.style.left = Math.min(W - 120, at[0] + 8) + 'px'; tip.style.top = Math.max(0, at[1] - 30) + 'px'; }
  }
}
const r4 = v => { const r = Math.round(v * 1e4) / 1e4; return Object.is(r, -0) ? 0 : r; };

/* ---------- table ---------- */
function tableHTML() {
  return `<div class="cmode" role="tablist"><button type="button" data-tm="f" aria-selected="true">جدول قيم اقتران</button><button type="button" data-tm="d">جدول بيانات</button></div>
  <div data-tp="f"><div class="trow"><label>f(x) =<input dir="ltr" id="tF" type="text" value="x^2-2x-3" autocomplete="off" spellcheck="false"></label></div>
    <div class="trow"><label>g(x) =<input dir="ltr" id="tG" type="text" placeholder="اختياري" autocomplete="off" spellcheck="false"></label></div>
    <div class="trow three"><label>البداية<input dir="ltr" id="tA" type="text" value="-3"></label><label>النهاية<input dir="ltr" id="tB" type="text" value="5"></label><label>الخطوة<input dir="ltr" id="tS" type="text" value="1"></label></div>
    <div class="grow"><button type="button" class="btn pri" id="tGo">أنشئ الجدول</button><button type="button" class="btn" id="tPlot">ارسمه بيانيًا</button></div>
    <div class="tout" id="tOut"></div></div>
  <div data-tp="d" hidden><p class="ghint">اكتب القيم في الجدول. يُحسب المجموع، ويمكن نقل الأزواج المرتّبة إلى الرسم البياني، أو حساب الإحصاءات للتكرارات.</p>
    <div class="tout"><table class="dtab" id="dTab" dir="ltr"></table></div>
    <div class="grow"><button type="button" class="btn" id="dAdd">+ عمود</button><button type="button" class="btn" id="dDel">− عمود</button><button type="button" class="btn" id="dPlot">ارسم النقاط</button><button type="button" class="btn" id="dStat">إحصاءات (القيمة والتكرار)</button></div>
    <div class="tout" id="dOut"></div></div>`;
}
function wireTable() {
  dock.querySelectorAll('[data-tm]').forEach(b => b.onclick = () => { dock.querySelectorAll('[data-tm]').forEach(x => x.setAttribute('aria-selected', String(x === b))); dock.querySelectorAll('[data-tp]').forEach(p => p.hidden = p.dataset.tp !== b.dataset.tm); });
  const make = () => {
    const out = $('#tOut', dock);
    try {
      const fs = ['#tF', '#tG'].map(id => $(id, dock).value.trim()).filter(Boolean).map(s => M().compile(norm(s).replace(/^\s*(y|[a-z]\s*\(\s*x\s*\))\s*=\s*/, '')));
      const a = +M().evaluate(norm($('#tA', dock).value)), b = +M().evaluate(norm($('#tB', dock).value)), s = +M().evaluate(norm($('#tS', dock).value));
      if (!(s > 0) || (b - a) / s > 200) throw new Error('step');
      let rows = '';
      for (let k = 0; a + k * s <= b + 1e-9; k++) { const x = +(a + k * s).toPrecision(12); rows += `<tr><td>${x}</td>${fs.map(f => { let v; try { v = f.evaluate(Object.assign(trigScope(), { x })); v = typeof v === 'number' ? (isFinite(v) ? +v.toPrecision(8) : 'ERROR') : M().format(v, { precision: 8 }); } catch (e) { v = 'ERROR'; } return `<td>${v}</td>`; }).join('')}</tr>`; }
      out.innerHTML = `<table class="vt" dir="ltr"><thead><tr><th>x</th><th>f(x)</th>${fs.length > 1 ? '<th>g(x)</th>' : ''}</tr></thead><tbody>${rows}</tbody></table>`;
    } catch (e) { out.innerHTML = '<p class="ghint">تحقّق من الاقتران والبداية والنهاية والخطوة (حتى 200 صف).</p>'; }
  };
  $('#tGo', dock).onclick = make; make();
  $('#tPlot', dock).onclick = () => { const r = ['y=' + $('#tF', dock).value]; if ($('#tG', dock).value.trim()) r.push('y=' + $('#tG', dock).value); G.setRows(r); openTool('g'); };
  let cols = 5; const tab = $('#dTab', dock);
  const vals = () => [...tab.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('input')].map(i => i.value.trim()));
  const build = (keep) => { const v = keep || vals(); tab.innerHTML = ['x', 'y / التكرار'].map((h, r) => `<tr><th>${h}</th>${Array.from({ length: cols }, (_, c) => `<td><input type="text" inputmode="decimal" value="${esc((v[r] || [])[c] || '')}" aria-label="${h} ${c + 1}"></td>`).join('')}<td class="sum" data-sum="${r}"></td></tr>`).join(''); tab.querySelectorAll('input').forEach(i => i.oninput = sums); sums(); };
  const sums = () => { vals().forEach((row, r) => { const s = row.filter(Boolean).reduce((a, x) => { try { return a + +M().evaluate(norm(x)); } catch (e) { return a; } }, 0); $(`[data-sum="${r}"]`, tab).textContent = 'Σ = ' + +s.toPrecision(10); }); };
  build([[], []]);
  $('#dAdd', dock).onclick = () => { if (cols < 20) { cols++; build(); } };
  $('#dDel', dock).onclick = () => { if (cols > 2) { cols--; build(vals().map(r => r.slice(0, cols))); } };
  $('#dPlot', dock).onclick = () => { const [xs, ys] = vals(); const pts = xs.map((x, k) => x && ys[k] ? `(${x},${ys[k]})` : '').filter(Boolean); if (pts.length) { G.setRows([pts.join(', '), ...G.rows().filter(r => r && !/^\s*\(/.test(r))].slice(0, 5)); openTool('g'); } };
  $('#dStat', dock).onclick = () => { const [xs, fs] = vals(); const s = xs.map((x, k) => x ? `${x}:${fs[k] || 1}` : '').filter(Boolean).join(','); try { $('#dOut', dock).innerHTML = statOf(s); } catch (e) { $('#dOut', dock).innerHTML = '<p class="ghint">أدخل القيم أولًا.</p>'; } };
}

window.JMT = { check, preview, chips, openTool, norm, initCounters, solvedOnce, mySolved, stats, ICON, TOOLS };
})();
