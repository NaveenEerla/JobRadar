// CONFIG ----------------------------
const WORKER_BASE = "https://floral-bird-8171.naveeneerla2022.workers.dev";
const SUPABASE_URL = "https://motqrqculnywuovnibye.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vdHFycWN1bG55d3Vvdm5pYnllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3ODIzMzksImV4cCI6MjA3NzM1ODMzOX0.oAN57AEj9xnXhlkR2r2ZYddzBzptN8VxlXTLLYX5wzY"; // your anon key

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// GLOBALS ---------------------------
let currentUser = null;
let isPremium = false;
let savedJobs = new Set();
let ALL_JOBS = [];

// UI HELPERS ------------------------
function openAuthModal() { authModal.classList.remove("hidden"); }
function closeAuthModal() { authModal.classList.add("hidden"); }

function openPremiumModal() { premiumModal.classList.remove("hidden"); }
function closePremiumModal() { premiumModal.classList.add("hidden"); }

// LOGIN UI --------------------------
loginBtn.onclick = openAuthModal;

signupToggle.onclick = () => {
  if (authTitle.innerText === "Login") {
    authTitle.innerText = "Sign Up";
    loginSubmit.innerText = "Create Account";
  } else {
    authTitle.innerText = "Login";
    loginSubmit.innerText = "Login";
  }
};

loginSubmit.onclick = async () => {
  const email = authEmail.value.trim();
  const pass = authPassword.value.trim();
  authError.classList.add("hidden");

  let result;

  if (authTitle.innerText === "Login") {
    result = await supabase.auth.signInWithPassword({ email, password: pass });
  } else {
    result = await supabase.auth.signUp({ email, password: pass });
  }

  if (result.error) {
    authError.innerText = result.error.message;
    authError.classList.remove("hidden");
    return;
  }

  closeAuthModal();
  restoreSession();
};

logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
  location.reload();
};

// SESSION RESTORE --------------------
async function restoreSession() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;

  if (!currentUser) {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    isPremium = false;
    return;
  }

  loginBtn.classList.add("hidden");
  logoutBtn.classList.remove("hidden");

  await checkPremium();
  await loadSavedJobs();
}

// CHECK PREMIUM -----------------------
async function checkPremium() {
  if (!currentUser) return;

  const res = await fetch(
    `${WORKER_BASE}/api/checkPremium?user_id=${currentUser.id}`
  );
  const json = await res.json();
  isPremium = json.active === true;

  if (isPremium) premiumBtn.classList.remove("hidden");
}

// LOAD SAVED JOBS ---------------------
async function loadSavedJobs() {
  if (!currentUser) return;

  const { data } = await supabase
    .from("saved_jobs")
    .select("job_id")
    .eq("user_id", currentUser.id);

  savedJobs = new Set(data?.map(r => r.job_id));
}

// SAVE/UNSAVE -------------------------
async function toggleSave(id) {
  if (!currentUser) return openAuthModal();

  if (savedJobs.has(id)) {
    await supabase.from("saved_jobs")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("job_id", id);

    savedJobs.delete(id);
  } else {
    await supabase.from("saved_jobs")
      .insert({ user_id: currentUser.id, job_id: id });

    savedJobs.add(id);
  }

  renderJobs(ALL_JOBS);
}

// RENDER JOB CARD ---------------------
function jobCard(job) {
  return `
    <div class="bg-slate-900 border border-slate-700 p-4 rounded-xl">
      <h3 class="text-lg font-semibold">${job.title}</h3>
      <p class="text-slate-300">${job.company}</p>

      <div class="mt-3 flex gap-3">
        <button onclick="toggleSave('${job.id}')"
          class="px-3 py-1 border rounded-xl">
          ${savedJobs.has(job.id) ? "⭐ Saved" : "☆ Save"}
        </button>

        <a href="${job.url}" target="_blank"
          class="px-3 py-1 border rounded-xl text-emerald-400">Apply</a>
      </div>
    </div>
  `;
}

// RENDER JOB LIST ---------------------
function renderJobs(list) {
  const search = searchInput.value.toLowerCase();

  const filtered = list.filter(j =>
    (j.title + " " + j.company).toLowerCase().includes(search)
  );

  if (filtered.length === 0) {
    noJobs.classList.remove("hidden");
    jobsList.innerHTML = "";
    return;
  }

  noJobs.classList.add("hidden");
  jobsList.innerHTML = filtered.map(jobCard).join("");
}

searchInput.oninput = () => renderJobs(ALL_JOBS);

// LOAD JOBS ---------------------------
async function loadJobs() {
  const res = await fetch(`${WORKER_BASE}/api/jobs`);
  ALL_JOBS = await res.json();
  renderJobs(ALL_JOBS);
}

// PREMIUM CHECKOUT --------------------
premiumCheckout.onclick = async () => {
  if (!currentUser) return openAuthModal();

  const res = await fetch(`${WORKER_BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: currentUser.id }),
  });

  const json = await res.json();
  if (json.url) window.location = json.url;
};

// INIT --------------------------------
restoreSession();
loadJobs();
