// -----------------------------------------------------
//  INITIALIZE SUPABASE
// -----------------------------------------------------
const supabase = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

// global memory
let ALL_JOBS = [];
let saved = new Set();

// -----------------------------------------------------
//  LOAD JOBS FROM CLOUDFLARE WORKER
// -----------------------------------------------------
async function loadJobs() {
  try {
    const res = await fetch("https://floral-bird-8171.naveeneerla2022.workers.dev/api/jobs");
    if (!res.ok) throw new Error("API error");

    const jobs = await res.json();
    ALL_JOBS = jobs;

    renderJobs(jobs);
  } catch (err) {
    console.error("Failed to load jobs:", err);
  }
}

// -----------------------------------------------------
//  RENDER JOB CARD
// -----------------------------------------------------
function createJobCard(job) {
  const div = document.createElement("div");
  div.className = "bg-slate-900 border border-slate-700 p-4 rounded-xl";

  div.innerHTML = `
    <h3 class="text-lg font-semibold">${job.title}</h3>
    <p class="text-slate-300">${job.company}</p>

    <div class="mt-3 flex gap-3">
      <button class="px-3 py-1 border rounded-xl" onclick="toggleSave('${job.id}')">
        ${saved.has(job.id) ? "⭐" : "☆"} Save
      </button>

      <a href="${job.url}" target="_blank"
        class="px-3 py-1 border rounded-xl text-emerald-400">
        Apply
      </a>
    </div>
  `;

  return div;
}

// -----------------------------------------------------
//  RENDER JOB LIST
// -----------------------------------------------------
function renderJobs(jobs) {
  const list = document.getElementById("jobsList");
  const noJobs = document.getElementById("noJobs");
  const search = document.getElementById("searchInput").value.toLowerCase();

  const filtered = jobs.filter(j =>
    (j.title + " " + j.company).toLowerCase().includes(search)
  );

  if (filtered.length === 0) {
    noJobs.classList.remove("hidden");
    list.innerHTML = "";
    return;
  }

  noJobs.classList.add("hidden");
  list.innerHTML = "";

  filtered.forEach(job => list.appendChild(createJobCard(job)));
}

// search event
document.getElementById("searchInput").addEventListener("input", () => {
  renderJobs(ALL_JOBS);
});

// Dummy login button
document.getElementById("loginBtn").onclick = () => {
  alert("Login system not added yet!");
};

// save/unsave (local only)
function toggleSave(id) {
  if (saved.has(id)) saved.delete(id);
  else saved.add(id);

  renderJobs(ALL_JOBS);
}

// -----------------------------------------------------
//  START
// -----------------------------------------------------
loadJobs();

