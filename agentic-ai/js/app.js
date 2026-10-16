const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// ---- flatten ----
const DAYS = [];
WEEKS.forEach((w, wi) => w.days.forEach((d, di) => {
  DAYS.push({ id: "w" + (wi + 1) + "d" + (di + 1), n: DAYS.length + 1, week: wi, wd: WEEKDAYS[di], type: d[0], title: d[1], desc: d[2], deliv: d[3], links: d[4] || [], edge: !!d[5] });
}));
const TOTAL = DAYS.length;

// ---- state ----
let done = {};          // id -> "YYYY-MM-DD"
let filter = "all";
let store = null;
let armedReset = false;

const $ = (id) => document.getElementById(id);
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const today = () => ymd(new Date());

// Counts consecutive weekdays with at least one completion. Weekends never break it.
function streak() {
  const dates = new Set(Object.values(done));
  const d = new Date();
  const isWeekend = (x) => x.getDay() === 0 || x.getDay() === 6;
  if (isWeekend(d) || !dates.has(ymd(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  for (let guard = 0; guard < 400; guard++) {
    if (isWeekend(d)) { d.setDate(d.getDate() - 1); continue; }
    if (dates.has(ymd(d))) { n++; d.setDate(d.getDate() - 1); } else break;
  }
  return n;
}

function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs || {}) {
    if (k === "class") e.className = attrs[k];
    else if (k === "text") e.textContent = attrs[k];
    else e.setAttribute(k, attrs[k]);
  }
  kids.flat().forEach(c => c != null && e.append(c));
  return e;
}
function linkEls(links) { return links.map(([t, u]) => el("a", { href: u, target: "_blank", rel: "noopener", text: t })); }

const openWeeks = new Set();

function render() {
  const count = DAYS.filter(d => done[d.id]).length;
  const next = DAYS.find(d => !done[d.id]);
  const curWeek = next ? next.week : WEEKS.length - 1;
  if (!openWeeks.size) openWeeks.add(curWeek);

  $("statDone").textContent = count + " / " + TOTAL;
  $("statPct").textContent = Math.round(count / TOTAL * 100) + "%";
  $("statWeek").textContent = next ? "Week " + (curWeek + 1) : "Done";
  $("statWeekName").textContent = next ? WEEKS[curWeek].name : "all " + TOTAL + " days complete";
  $("statStreak").textContent = streak();
  $("mainBar").firstElementChild.style.width = (count / TOTAL * 100) + "%";
  $("mainBar").setAttribute("aria-valuenow", count);

  const nc = $("nextCard"); nc.replaceChildren();
  if (next) {
    const cb = el("button", { type: "button", class: "btn primary", text: "Mark Day " + next.n + " done" });
    cb.onclick = () => toggle(next.id, true);
    const go = el("button", { type: "button", class: "btn", text: "Show in plan" });
    go.onclick = () => { openWeeks.add(next.week); render(); document.getElementById("row-" + next.id)?.scrollIntoView({ behavior: "smooth", block: "center" }); };
    nc.append(
      el("div", { class: "eyebrow", text: "Up next · Day " + next.n + " · Week " + (next.week + 1) + " " + next.wd + " · " + next.type }),
      el("div", { class: "t", text: next.title }),
      el("p", { class: "desc", text: next.desc }),
      el("div", { class: "links" }, linkEls(next.links)),
      el("div", { class: "next-actions" }, cb, go)
    );
  } else {
    nc.append(el("div", { class: "t", text: "All " + TOTAL + " days done. Go pitch the proposal from your last Friday." }));
  }

  const rail = $("rail"); rail.replaceChildren();
  WEEKS.forEach((w, wi) => {
    const ds = DAYS.filter(d => d.week === wi); const c = ds.filter(d => done[d.id]).length;
    const b = el("button", { type: "button", class: c === ds.length ? "complete" : "", title: w.name, "aria-label": "Week " + (wi + 1) + ": " + w.name + ", " + c + " of " + ds.length + " done" },
      el("span", { class: "wk", text: "W" + (wi + 1) }),
      el("span", { class: "mini" }, el("i", { style: "width:" + (c / ds.length * 100) + "%" })));
    b.onclick = () => { openWeeks.add(wi); render(); document.getElementById("week-" + wi)?.scrollIntoView({ behavior: "smooth", block: "start" }); };
    rail.append(b);
  });

  const wrap = $("weeks"); wrap.replaceChildren();
  WEEKS.forEach((w, wi) => {
    const ds = DAYS.filter(d => d.week === wi);
    const c = ds.filter(d => done[d.id]).length;
    const shown = ds.filter(d => filter === "all" || !done[d.id]);
    if (filter === "left" && !shown.length) return;
    const det = el("details", { class: "week", id: "week-" + wi });
    if (openWeeks.has(wi)) det.open = true;
    det.addEventListener("toggle", () => { det.open ? openWeeks.add(wi) : openWeeks.delete(wi); });
    det.append(el("summary", {},
      el("div", { class: "week-head" },
        el("span", { class: "eyebrow", text: "Week " + (wi + 1) + " · Days " + ds[0].n + "–" + ds[ds.length - 1].n }),
        el("h2", { text: w.name }),
        el("span", { class: "week-goal", text: w.goal })),
      el("span", { class: "week-count", text: c + "/" + ds.length })));
    const ul = el("ul", { class: "days" });
    shown.forEach(d => {
      const isDone = !!done[d.id];
      const cb = el("input", { type: "checkbox", id: "cb-" + d.id, "aria-label": "Day " + d.n + " done" });
      cb.checked = isDone;
      cb.onchange = () => toggle(d.id, cb.checked);
      const meta = el("div", { class: "meta" },
        el("span", { text: d.wd + " · Day " + d.n }),
        el("span", { class: "tag " + d.type, text: d.type }),
        d.edge ? el("span", { class: "tag edge", text: "data edge" }) : null,
        el("span", { text: "60 min" }));
      const body = el("div", { class: "body" },
        meta,
        el("label", { class: "title", for: "cb-" + d.id, text: d.title }),
        el("p", { class: "desc", text: d.desc }),
        el("p", { class: "deliv" }, el("b", { text: "Done when: " }), d.deliv),
        d.links.length ? el("div", { class: "links" }, linkEls(d.links)) : null,
        isDone ? el("span", { class: "when", text: "Completed " + done[d.id] }) : null);
      ul.append(el("li", { class: "day" + (isDone ? " is-done" : "") + (next && next.id === d.id ? " is-next" : ""), id: "row-" + d.id }, cb, body));
    });
    det.append(ul);
    wrap.append(det);
  });
}

function renderShelf() {
  const s = $("shelf");
  SHELF.forEach(g => s.append(el("div", {}, el("h3", { text: g.h }),
    el("ul", {}, g.items.map(([lnk, note]) => el("li", {}, linkEls([lnk])[0], note ? el("span", { text: " · " + note }) : null))))));
}

let saving = Promise.resolve();
function persist() {
  const snapshot = { plan: "50-weekday-v2", done: { ...done }, updatedAt: new Date().toISOString() };
  saving = saving.then(() => store.save(snapshot)).then(
    () => { $("saveState").textContent = store.label; },
    () => { $("saveState").textContent = "Couldn't save. Your last change may be lost on reload."; });
}

function toggle(id, val) {
  if (val) done[id] = today(); else delete done[id];
  render(); persist();
}

function setFilter(f) {
  filter = f;
  $("fAll").setAttribute("aria-pressed", f === "all");
  $("fLeft").setAttribute("aria-pressed", f === "left");
  render();
}
$("fAll").onclick = () => setFilter("all");
$("fLeft").onclick = () => setFilter("left");

function renderReset() {
  const w = $("resetWrap"); w.replaceChildren();
  if (!armedReset) {
    const b = el("button", { type: "button", class: "btn", id: "resetBtn", text: "Reset progress" });
    b.onclick = () => { armedReset = true; renderReset(); };
    w.append(b);
  } else {
    const yes = el("button", { type: "button", class: "btn primary", text: "Clear all " + TOTAL });
    yes.onclick = () => { done = {}; armedReset = false; renderReset(); render(); persist(); };
    const no = el("button", { type: "button", class: "btn", text: "Cancel" });
    no.onclick = () => { armedReset = false; renderReset(); };
    w.append(el("span", { class: "confirm" }, "Clear all progress?", yes, no));
  }
}

// ---- storage: this browser's localStorage, plus export/import to move progress between devices ----
const LS_KEY = "agentic50.progress";
const validIds = new Set(DAYS.map(d => d.id));
const clean = (o) => { const r = {}; for (const k in (o || {})) if (validIds.has(k) && /^\d{4}-\d{2}-\d{2}$/.test(o[k])) r[k] = o[k]; return r; };

store = {
  label: "Saved in this browser",
  load: () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; } },
  save: async (o) => { localStorage.setItem(LS_KEY, JSON.stringify(o)); },
};

$("exportBtn").onclick = () => {
  const blob = new Blob([JSON.stringify({ plan: "50-weekday-v2", done }, null, 2)], { type: "application/json" });
  const a = el("a", { href: URL.createObjectURL(blob), download: "agentic-ai-progress-" + today() + ".json" });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$("importBtn").onclick = () => $("importFile").click();
$("importFile").onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    done = clean(data.done); render(); persist();
    $("saveState").textContent = "Imported " + Object.keys(done).length + " days";
  } catch {
    $("saveState").textContent = "That file isn't a progress export. Choose a .json file saved with Export.";
  }
  e.target.value = "";
};

// Keep other open tabs in sync.
window.addEventListener("storage", (e) => {
  if (e.key !== LS_KEY) return;
  try { done = clean(JSON.parse(e.newValue || "{}").done); render(); } catch {}
});

renderShelf(); renderReset();
done = clean(store.load().done);
$("saveState").textContent = store.label;
render();
