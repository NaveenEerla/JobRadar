const API_BASE = "https://floral-bird-8171.naveeneerla2022.workers.dev";

// ----------------------------
// Supabase Client
// ----------------------------
const supabase = supabase.createClient(
  "https://motqrqculnywuovnibye.supabase.co",
  "your-anon-key-here"
);

let currentUser = null;
let isPremium = false;
let saved = new Set();
let ALL_JOBS = [];

// ----------------------------
// Auth Modal
// ----------------------------
function openAuthModal() {
  document.getElementById("authModal").classList.remove("hidden");
}

function closeAuthModal() {
  document.getElementById("authModal").classList.add("hidden");
}

document.getElementById("loginBtn").onclick = openAuthModal;

// Toggle Login <-> Signup
document.getElementById("signupToggle").onclick = () => {
  const title = document.getElementById("authTitle");
  const submit = document.getElementById("loginSubmit");

  if (title.innerText === "Login") {
    title.innerText = "Sign Up";
    submit.innerText = "Create Account";
  } else {
    title.innerText = "Login";
    submit.innerText = "Login";
  }
};

// Login / Signup
document.getElementById("loginSubmit").onclick = async () => {
  const email = document.getElementById("authEmail").value.trim();
  const pass = document.getElementById("authPassword").value.trim();
  const errorBox = document.getElementById("authError");

  errorBox.classList.add("hidden");

  const mode = document.getElementById("authTitle").innerText;

  let result;
  if (mode === "Login") {
    result = await supabase.auth.signInWithPassword({ email, password: pass });
  } else {
    result = await supabase.auth.signUp({ email, password: pass });
  }

  if (result.error) {
    errorBox.innerText = result.error.message;
    errorBox.classList.remove("hidden");
    return;
  }

  closeAuthModal();
  restoreSession();
};

// Restore Session
async function restoreSession() {
  const { data } = await supabase.auth.getUser();
  currentUser = data.user;

  if (!currentUser) {
    isPremium = false;
    saved = new Set();
    document.getElementById("logoutBtn").classList.add("hidden");
    document.getElementById("loginBtn").classList.remove("hidden");
    return;
  }

  document.getElementById("loginBtn").classList.add("hidden");
  document.getElementById("logoutBtn").classList.remove("hidden");

  await checkPremium();
  await loadSaved();
  renderJobs(ALL_JOBS);
}

document.getElementById("logoutBtn").onclick = async () => {
  await supabase.auth.signOut();
  location.reload();
};

// ----------------------------
// Premium Check
// ----------------------------
async function checkPremium() {
  if (!currentUser) return;

  const res = await fetch(`${API_BASE}/api/checkPremium?user_id=${currentUser.id}`);
  if (res.ok) {
    const json = await res.json();
    isPremium = json.active === true;
  }
}

// ----------------------------
// Saved Jobs
// ----------------------------
async function loadSaved() {
  if (!currentUser) return;

  const { data } = await supabase
    .from("saved_jobs")
    .select("job_id")
    .eq("user_id", currentUser.id);

  saved = new Set(data?.map((x) => x.job_id));
}

async function toggleSave(id) {
  if (!currentUser) return openAuthModal();

  if (saved.has(id)) {
    await supabase.from("saved_jobs").delete().eq("user_id", currentUser.id).eq("job_id", id);
    saved.delete(id);
  } else {
    await supabase.from("saved_jobs").insert({ user_id: currentUser.id, job_id: id });
    saved.add(id);
  }

  renderJobs(ALL_JOBS);
}

// ----------------------------
// Render Jobs
// ----------------------------
function card(job) {
  const star = saved.has(job.id) ? "⭐" : "☆";
  const premiumCover = isPremium ? "" : `
    <div class="absolute inset-0 bg-black/40 rounded-xl flex flex-col items-center justify-center z-20">
      <div class="text-emerald-400 text-sm mb-2">🔒 Premium Feature</div>
    </div>
  `;

  return `
    <div class="relative bg-slate-900/80 border border-slate-700 p-4 rounded-xl">
      ${premiumCover}
      <h3 class="text-lg font-semibold">${job.title}</h3>
      <p class="text-slate-300">${job.company}</p>

      <div class="mt-3 flex gap-3">
        <button onclick="toggleSave('${job.id}')"
          class="px-3 py-1 border border-slate-600 rounded-xl">${star} Save</button>

        <a href="${job.url}" target="_blank"
          class="px-3 py-1 bg-emerald-500 text-slate-900 rounded-xl">Apply</a>
      </div>
    </div>
  `;
}

function renderJobs(list) {
  const container = document.getElementById("jobsList");
  const search = document.getElementById("searchInput").value.toLowerCase();

  const filtered = list.filter((j) =>
    (j.title + " " + j.company).toLowerCase().includes(search)
  );

  if (!filtered.length) {
    document.getElementById("noJobs").classList.remove("hidden");
    container.innerHTML = "";
    return;
  }

  document.getElementById("noJobs").classList.add("hidden");

  container.innerHTML = filtered.map(card).join("");
}

document.getElementById("searchInput").oninput = () => renderJobs(ALL_JOBS);

// ----------------------------
// Load Jobs
// ----------------------------
async function loadJobs() {
  const res = await fetch(`${API_BASE}/api/jobs`);
  const jobs = await res.json();
  ALL_JOBS = jobs;
  renderJobs(jobs);
}

restoreSession();
loadJobs();
