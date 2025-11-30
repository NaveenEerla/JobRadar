// ----------------------
// CONFIG
// ----------------------
const SUPABASE_URL = "https://motqrqculnywuovnibye.supabase.co";
const SUPABASE_ANON = "YOUR_PUBLIC_ANON_KEY"; // paste your anon key here
const API_BASE = "https://floral-bird-8171.naveeneerla2022.workers.dev";

// ----------------------
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

let currentUser = null;
let ALL_JOBS = [];
let SAVED = new Set();
let IS_PREMIUM = false;


// ----------------------
// UI Helper Functions
// ----------------------
function $(id) {
  return document.getElementById(id);
}

function openAuthModal() { $("authModal").classList.remove("hidden"); }
function closeAuthModal() { $("authModal").classList.add("hidden"); }

function openPremiumModal() { $("premiumModal").classList.remove("hidden"); }
function closePremiumModal() { $("premiumModal").classList.add("hidden"); }

function openResumeModal() { $("resumeModal").classList.remove("hidden"); }
function closeResumeModal() { $("resumeModal").classList.add("hidden"); }


// ----------------------
// LOGIN / SIGNUP LOGIC
// ----------------------
$("loginBtn").onclick = openAuthModal;

$("signupToggle").onclick = () => {
  const title = $("authTitle");
  title.textContent = title.textContent === "Login" ? "Sign Up" : "Login";
};

$("loginSubmit").onclick = async () => {
  const email = $("authEmail").value;
  const pass = $("authPassword").value;
  const mode = $("authTitle").textContent;
  const errorBox = $("authError");

  errorBox.classList.add("hidden");

  let result;

  if (mode === "Login") {
    result = await supabase.auth.signInWithPassword({ email, password: pass });
  } else {
    result = await supabase.auth.signUp({ email, password: pass });
  }

  if (result.error) {
    errorBox.textContent = result.error.message;
    errorBox.classList.remove("hidden");
    return;
  }

  closeAuthModal();
  restoreSession();
};


// ----------------------
// RESTORE SESSION
// ----------------------
async function restoreSession() {
  const { data } = await supabase.auth.getUser();
  currentUser = data.user;

  if (!currentUser) {
    $("loginBtn").classList.remove("hidden");
    $("logoutBtn").classList.add("hidden");
    IS_PREMIUM = false;
    SAVED = new Set();
    renderJobs(ALL_JOBS);
    return;
  }

  $("loginBtn").classList.add("hidden");
  $("logoutBtn").classList.remove("hidden");

  await refreshPremium();
  await loadSavedJobs();
  renderJobs(ALL_JOBS);
}

$("logoutBtn").onclick = async () => {
  await supabase.auth.signOut();
  currentUser = null;
  SAVED = new Set();
  IS_PREMIUM = false;
  restoreSession();
};


// ----------------------
// PREMIUM
// ----------------------
async function refreshPremium() {
  if (!currentUser) return false;

  const res = await fetch(`${API_BASE}/api/checkPremium?user_id=${currentUser.id}`);
  const json = await res.json();
  IS_PREMIUM = json.active;
}


// ----------------------
// SAVED JOBS
// ----------------------
async function loadSavedJobs() {
  if (!currentUser) return;

  const res = await fetch(`${API_BASE}/api/savedJobs?user_id=${currentUser.id}`);
  const json = await res.json();

  SAVED = new Set(json.map(j => j.job_id));
}

async function toggleSave(jobId) {
  if (!currentUser) return openAuthModal();

  if (SAVED.has(jobId)) {
    await fetch(`${API_BASE}/api/savedJobs?user_id=${currentUser.id}&job_id=${jobId}`, {
      method: "DELETE"
    });
    SAVED.delete(jobId);
  } else {
    await fetch(`${API_BASE}/api/savedJobs?user_id=${currentUser.id}`, {
      method: "POST",
      body: JSON.stringify({ job_id: jobId })
    });
    SAVED.add(jobId);
  }

  renderJobs(ALL_JOBS);
}


// ----------------------
// RENDER JOB CARDS
// ----------------------
function renderJobs(jobs) {
  const search = $("searchInput").value.toLowerCase();
  const list = $("jobsList");
  const noJobs = $("noJobs");

  const filtered = jobs.filter(j =>
    (j.title + j.company).toLowerCase().includes(search)
  );

  if (!filtered.length) {
    noJobs.classList.remove("hidden");
    list.innerHTML = "";
    return;
  }

  noJobs.classList.add("hidden");
  list.innerHTML = "";

  filtered.forEach(job => list.appendChild(renderCard(job)));
}

function renderCard(job) {
  const card = document.createElement("div");
  card.className = "job-card";

  const isSaved = SAVED.has(job.id);
  const lock = !IS_PREMIUM;

  // Title
  const title = document.createElement("h3");
  title.textContent = job.title;
  title.className = "job-title";

  // Company
  const company = document.createElement("p");
  company.textContent = job.company;
  company.className = "job-company";

  // BUTTONS
  const btnRow = document.createElement("div");
  btnRow.className = "btn-row";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = isSaved ? "⭐ Saved" : "☆ Save";
  saveBtn.className = "btn";
  saveBtn.onclick = () => toggleSave(job.id);

  const apply = document.createElement("a");
  apply.textContent = "Apply";
  apply.href = job.url;
  apply.target = "_blank";
  apply.className = "btn-emerald";

  const resumeBtn = document.createElement("button");
  resumeBtn.textContent = "✨ Tailor My Resume";
  resumeBtn.className = lock ? "btn-disabled" : "btn-emerald";
  resumeBtn.onclick = () => {
    if (lock) openPremiumModal();
    else openResume(job);
  };

  btnRow.append(saveBtn, apply, resumeBtn);

  card.append(title, company, btnRow);
  return card;
}


// ----------------------
// RESUME BUILDER
// ----------------------
function openResume(job) {
  $("resumeOutput").value = "Generating...";
  openResumeModal();

  fetch(`${API_BASE}/api/resume/generate`, {
    method: "POST",
    body: JSON.stringify({
      user_id: currentUser.id,
      job_title: job.title,
      job_description: `${job.company} ${job.title}`
    })
  })
    .then(r => r.json())
    .then(j => $("resumeOutput").value = j.result.text)
}

function copyResumeOutput() {
  navigator.clipboard.writeText($("resumeOutput").value);
}


// ----------------------
// STRIPE CHECKOUT
// ----------------------
$("premiumCheckout").onclick = async () => {
  if (!currentUser) return openAuthModal();

  const res = await fetch(`${API_BASE}/api/checkout`, {
    method: "POST",
    body: JSON.stringify({ user_id: currentUser.id })
  });

  const json = await res.json();
  if (json.url) location.href = json.url;
};


// ----------------------
// LOAD JOBS FROM WORKER
// ----------------------
async function loadJobs() {
  const res = await fetch(`${API_BASE}/api/jobs`);
  ALL_JOBS = await res.json();
  renderJobs(ALL_JOBS);
}

loadJobs();
restoreSession();
