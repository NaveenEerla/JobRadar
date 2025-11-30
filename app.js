//const API_BASE = "https://floral-bird-8171.naveeneerla2022.workers.dev";

// Injected via <script> tags in index.html
const sb = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

// Load jobs from Worker API
async function loadJobs() {
  try {
    const res = await fetch("https://floral-bird-8171.naveeneerla2022.workers.dev/api/jobs");
    const jobs = await res.json();

    console.log("Loaded jobs:", jobs);

    window.ALL_JOBS = jobs;
    renderJobs(jobs);
  } catch (err) {
    console.error("Failed to load jobs:", err);
  }
}

function renderJobs(jobs) {
  const list = document.getElementById("jobsList");
  list.innerHTML = "";

  for (const job of jobs) {
    const div = document.createElement("div");
    div.className = "job-card";

    div.innerHTML = `
      <div class="p-4 bg-slate-900 border border-slate-700 rounded-xl mb-4">
        <h2 class="text-lg font-semibold">${job.title}</h2>
        <p class="text-slate-400">${job.company}</p>
        <p class="text-slate-500 text-sm mt-1">${job.posted_at}</p>
        <a href="${job.url}" class="text-emerald-400 mt-2 inline-block" target="_blank">Apply</a>
      </div>
    `;

    list.appendChild(div);
  }
}

loadJobs();
