const STORAGE_DONE = "ncpick-manual-done";
const STORAGE_UNDONE = "ncpick-manual-undone";

const DIFF_COLORS = {
  Easy: "#3dd68c",
  Medium: "#ffc01e",
  Hard: "#ff6b6b",
};

let problems = [];
/** @type {Set<string>} */
let repoSolved = new Set();
/** @type {Set<string>} */
let manualDone = new Set();
/** @type {Set<string>} */
let manualUndone = new Set();

let pool = [];
let spinning = false;
let wheelRotation = 0;
let selected = null;

const wheelEl = document.getElementById("wheel");
const spinBtn = document.getElementById("spin-btn");
const statsEl = document.getElementById("stats");
const resultEl = document.getElementById("result");
const resultTitle = document.getElementById("result-title");
const resultMeta = document.getElementById("result-meta");
const resultNeetcode = document.getElementById("result-neetcode");
const resultLeetcode = document.getElementById("result-leetcode");
const markDoneBtn = document.getElementById("mark-done-btn");
const markUndoneBtn = document.getElementById("mark-undone-btn");
const remainingList = document.getElementById("remaining-list");
const doneList = document.getElementById("done-list");
const remainingCount = document.getElementById("remaining-count");
const doneCount = document.getElementById("done-count");

const ctx = wheelEl.getContext("2d");

function loadStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveStorage(key, set) {
  localStorage.setItem(key, JSON.stringify([...set]));
}

function isSolved(slug) {
  return (repoSolved.has(slug) || manualDone.has(slug)) && !manualUndone.has(slug);
}

function recomputePool() {
  pool = problems.filter((p) => !isSolved(p.slug));
}

function renderStats() {
  const done = problems.filter((p) => isSolved(p.slug));
  const fromRepo = problems.filter(
    (p) => repoSolved.has(p.slug) && !manualUndone.has(p.slug)
  ).length;

  statsEl.innerHTML = `
    <span class="stat-pill"><strong>${pool.length}</strong> left to spin</span>
    <span class="stat-pill"><strong>${done.length}</strong> / 150 done</span>
    <span class="stat-pill"><strong>${fromRepo}</strong> from submissions repo</span>
  `;
}

function drawWheel(highlightIndex = -1) {
  const size = wheelEl.width;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 4;

  ctx.clearRect(0, 0, size, size);

  if (pool.length === 0) {
    ctx.fillStyle = "#1a2332";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8b9cb3";
    ctx.font = "600 18px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("All done!", cx, cy);
    return;
  }

  const slice = (Math.PI * 2) / pool.length;

  pool.forEach((p, i) => {
    const start = i * slice - Math.PI / 2;
    const end = start + slice;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();

    const base = DIFF_COLORS[p.difficulty] || "#8b9cb3";
    ctx.fillStyle = i === highlightIndex ? base : `${base}99`;
    ctx.fill();
    ctx.strokeStyle = "#0f1419";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + slice / 2);
    ctx.fillStyle = "#0f1419";
    ctx.font = pool.length > 40 ? "9px system-ui" : "11px system-ui";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const label =
      p.title.length > 18 ? `${p.title.slice(0, 16)}…` : p.title;
    ctx.fillText(label, radius - 10, 0);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, Math.PI * 2);
  ctx.fillStyle = "#0f1419";
  ctx.fill();
  ctx.strokeStyle = "#ffc01e";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function showResult(problem) {
  selected = problem;
  resultEl.hidden = false;
  resultTitle.textContent = problem.title;
  resultMeta.innerHTML = `<span class="difficulty-${problem.difficulty.toLowerCase()}">${problem.difficulty}</span>`;
  resultNeetcode.href = problem.nurl;
  resultLeetcode.href = problem.url;

  const solved = isSolved(problem.slug);
  markDoneBtn.hidden = solved;
  markUndoneBtn.hidden = !solved;
}

function renderLists() {
  remainingList.innerHTML = "";
  doneList.innerHTML = "";

  const remaining = problems.filter((p) => !isSolved(p.slug));
  const done = problems.filter((p) => isSolved(p.slug));

  remainingCount.textContent = String(remaining.length);
  doneCount.textContent = String(done.length);

  for (const p of remaining.sort((a, b) => a.title.localeCompare(b.title))) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${p.title}</span>`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Mark done";
    btn.addEventListener("click", () => markDone(p.slug));
    li.appendChild(btn);
    remainingList.appendChild(li);
  }

  for (const p of done.sort((a, b) => a.title.localeCompare(b.title))) {
    const li = document.createElement("li");
    const source = manualUndone.has(p.slug)
      ? ""
      : manualDone.has(p.slug) && !repoSolved.has(p.slug)
        ? " (manual)"
        : repoSolved.has(p.slug)
          ? " (repo)"
          : "";
    li.innerHTML = `<span>${p.title}${source}</span>`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Not done";
    btn.addEventListener("click", () => markUndone(p.slug));
    li.appendChild(btn);
    doneList.appendChild(li);
  }
}

function refresh() {
  recomputePool();
  drawWheel();
  renderStats();
  renderLists();
  spinBtn.disabled = pool.length === 0 || spinning;

  if (selected) {
    showResult(selected);
  }
}

function markDone(slug) {
  manualDone.add(slug);
  manualUndone.delete(slug);
  saveStorage(STORAGE_DONE, manualDone);
  saveStorage(STORAGE_UNDONE, manualUndone);
  refresh();
}

function markUndone(slug) {
  manualUndone.add(slug);
  manualDone.delete(slug);
  saveStorage(STORAGE_DONE, manualDone);
  saveStorage(STORAGE_UNDONE, manualUndone);
  refresh();
}

function spin() {
  if (spinning || pool.length === 0) return;

  spinning = true;
  spinBtn.disabled = true;

  const index = Math.floor(Math.random() * pool.length);
  const sliceDeg = 360 / pool.length;
  const extraSpins = 5 + Math.floor(Math.random() * 3);
  const targetMod =
    (360 - index * sliceDeg - sliceDeg / 2 + 360) % 360;
  const currentMod = ((wheelRotation % 360) + 360) % 360;
  let delta = targetMod - currentMod;
  if (delta <= 0) delta += 360;
  delta += extraSpins * 360;

  const startRotation = wheelRotation;
  const duration = 4200;
  const start = performance.now();

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const angle = startRotation + delta * easeOutCubic(t);
    wheelEl.style.transform = `rotate(${angle}deg)`;
    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      wheelRotation = angle;
      spinning = false;
      spinBtn.disabled = pool.length === 0;
      drawWheel(index);
      showResult(pool[index]);
    }
  }

  requestAnimationFrame(frame);
}

async function init() {
  manualDone = loadStorage(STORAGE_DONE);
  manualUndone = loadStorage(STORAGE_UNDONE);

  const [problemsRes, slugsRes] = await Promise.all([
    fetch("data/problems.json"),
    fetch("data/repo-solved-slugs.json"),
  ]);

  problems = await problemsRes.json();
  const slugs = await slugsRes.json();
  repoSolved = new Set(slugs);

  refresh();

  spinBtn.addEventListener("click", spin);
  markDoneBtn.addEventListener("click", () => {
    if (selected) markDone(selected.slug);
  });
  markUndoneBtn.addEventListener("click", () => {
    if (selected) markUndone(selected.slug);
  });
}

init().catch((err) => {
  statsEl.innerHTML = `<span class="stat-pill">Failed to load data: ${err.message}</span>`;
});
