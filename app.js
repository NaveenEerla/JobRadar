/*************************************************
 * CONFIG (from index.html global script)
 *************************************************/
let SUPABASE_URL = null;
let SUPABASE_ANON = null;

/*************************************************
 * GLOBAL STATE
 *************************************************/
let supabaseClient = null;
let currentUser = null;
let isPremium = false;
let savedJobs = new Set();
let ALL_JOBS = [];

/*************************************************
 * WAIT UNTIL EVERYTHING IS LOADED
 *************************************************/
window.addEventListener("DOMContentLoaded", async () => {
  SUPABASE_URL = window.SUPABASE_URL;
  SUPABASE_ANON = window.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    console.error("❌ Missing Supabase keys in index.html.");
    return;
  }

  // Initialize Supabase AFTER SDK is ready
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  attachEventHandlers();

  await restoreSession();
  await loadJobs();
});

/*************************************************
 * BUTTON HANDLERS
 *************************************************/
function attachEventHandlers() {
  document.getElementById("loginBtn").onclick = () => openAuthModal();

  document.getElementById("signupToggle").onclick = () => {
    const title = document.getElementById("authTitle");
    const btn = document.getElementById("loginSubmit");

    if (title.innerText === "Login") {
      title.innerText = "Sign Up";
      btn.innerText = "Create Account";
    } else {
      title.innerText = "Login";
      btn.innerText = "Login";
    }
  };

  // Login / Signup
  document.getElementById("loginSubmit").onclick = handleLoginSignup;

  // Logout
  document.getElementById("logoutBtn").onclick = async () => {
    await supabaseClient.auth.signOut();
    currentUser = null;
    isPremium = false;
    savedJobs.clear();

    document.getElementById("logoutBtn").classList.add("hidden");
    document.getElementById("loginBtn").classList.remove("hidden");

    renderJobs(ALL_JOBS);
  };
}

/*************************************************
 * LOGIN / SIGNUP
 *************************************************/
async function handleLoginSignup() {
  const email = document.getElementById("authEmail").value.trim();
  const pass = document.getElementById("authPassword").value.trim();
  const errorBox = document.getElementById("authError");

  errorBox.classList.add("hidden");

  const mode = document.getElementById("authTitle").innerText;
  let result;

  if (mode === "Login") {
    result = await supabaseClient.auth.signInWithPassword({ email, password: pass });
  } else {
    result = await supabaseClient.auth.signUp({ email, password: pass });
  }

  if (result.error) {
    errorBox.innerText = result.error.message;
    errorBox.classList.remove("hidden");
    return;
  }

  closeAuthModal();
  await restoreSession();
}

/*************************************************
 * SESSION RESTORE
 *************************************************/
async function restoreSession() {
  const { data } = await supabaseClient.auth.getUser();
  currentUser = data.user;

  if (!currentUser) {
    document.getElementById("logoutBtn").classList.add("hidden");
    document.getElementById("loginBtn").classList.remove("hidden");
    return;
  }

  document.getElementById("loginBtn").classList.add("hidden");
  document.getElementById("logoutBtn").classList.remove("hidden");

  await checkPremium();
  await loadSavedJobs();
}

/*************************************************
 * CHECK PREMIUM
 *************************************************/
async function checkPremium() {
  if (!currentUser) return false;

  const res = await fetch(
    `https://floral-bird-8171.naveeneerla2022.workers.dev/api/checkPremium?user_id=${currentUser.id}`
  );

  if (!res.ok) return false;

  const data = await res.json();
  isPremium = data.active === true;
}

/*************************************************
 * LOAD SAVED JOBS
 *************************************************/
async function loadSavedJobs() {
  if (!currentUser) return;

  const { data } = await supabaseClient
    .from("saved_jobs")
    .select("job_id")
    .eq("user_id", currentUser.id);

  savedJobs = new Set(data?.map(x => x.job_id));
}

/*************************************************
 * RENDER JOB CARD (DOM SAFE, NO TEMPLATE STRINGS)
 *************************************************/
function createJobCard(job) {
  const wrapper = document.createElement("div");
  wrapper.className = "bg-slate-900 border border-slate-700 p-4 rounded-xl";

  // Title
  const title = document.createElement("h3");
  title.className = "text-lg font-semibold";
  title.textContent = job.title;

  // Company
  const company = document.createElement("p");
  company.className = "text-slate-300 text-sm";
  company.textContent = job.company;

  // Save button
  const saveBtn = document.createElement("button");
  saveBtn.className = "px-3 py-1 border rounded-xl text-sm";
  saveBtn.textContent = savedJobs.has(job.id) ? "⭐ Saved" : "☆ Save";
  saveBtn.onclick = () => toggleSave(job.id);

  // Apply button
  const applyBtn = document.createElement("a");
  applyBtn.href = job.url;
  applyBtn.target = "_blank";
  applyBtn.className = "px-3 py-1 border rounded-xl text-emerald-400 text-sm";
  applyBtn.textContent = "Apply";

  // Button row
  const row = document.createElement("div");
  row.className = "flex gap-3 mt-3";
  row.appendChild(saveBtn);
  row.appendChild(applyBtn);

  wrapper.appendChild(title);
  wrapper.appendChild(company);
  wrapper.appendChild(row);

  return wrapper;
}

/*************************************************
 * RENDER JOB LIST
 *************************************************/
function renderJobs(jobs) {
  const list = document.getElementById("jobsList");
  const empty = document.getElementById("noJobs");

  list.innerHTML = "";

  if (!jobs.length) {
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");

  jobs.forEach(job => {
    list.appendChild(createJobCard(job));
  });
}

/*************************************************
 * LOAD JOBS (FROM WORKER API)
 *************************************************/
async function loadJobs() {
  try {
    const res = await fetch("https://floral-bird-8171.naveeneerla2022.workers.dev/api/jobs");

    if (!res.ok) throw new Error("API error");

    ALL_JOBS = await res.json();

    renderJobs(ALL_JOBS);
  } catch (err) {
    console.error("Failed to load jobs:", err);
  }
}

/*************************************************
 * SAVE / UNSAVE JOB
 *************************************************/
async function toggleSave(jobId) {
  if (!currentUser) {
    openAuthModal();
    return;
  }

  if (savedJobs.has(jobId)) {
    await supabaseClient
      .from("saved_jobs")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("job_id", jobId);

    savedJobs.delete(jobId);
  } else {
    await supabaseClient
      .from("saved_jobs")
      .insert({ user_id: currentUser.id, job_id: jobId });

    savedJobs.add(jobId);
  }

  renderJobs(ALL_JOBS);
}

/*************************************************
 * AUTH MODAL CONTROLLERS
 *************************************************/
function openAuthModal() {
  document.getElementById("authModal").classList.remove("hidden");
}

function closeAuthModal() {
  document.getElementById("authModal").classList.add("hidden");
}
