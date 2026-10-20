
const ACCESS_PASSWORD = "rose254";
const loginPanel = document.getElementById("loginPanel");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const logoutBtn = document.getElementById("logoutBtn");

// Show the correct screen after login.
function showDashboard() {
  loginPanel.classList.add("hidden");
  dashboard.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
}

function showLogin() {
  document.getElementById("loginPanel")?.classList.remove("hidden");
  document.getElementById("dashboard")?.classList.remove("hidden");
  document.getElementById("logoutBtn")?.classList.add("hidden");
}
}

// Make sure the correct screen is displayed on startup.
showLogin();

// Check that your existing Supabase client is initialized.
if (typeof supabaseClient !== "undefined") {
  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error("Session error:", error.message);
      return;
    }

    if (data.session) {
      showDashboard();

      // Call your existing dashboard-loading function here,
      // if your script already defines one.
    }
  });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginMessage.textContent = "Signing in...";

  if (typeof supabaseClient === "undefined") {
    loginMessage.textContent =
      "Supabase is not configured. Check script.js.";
    return;
  }

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginMessage.textContent = error.message;
    console.error("Login failed:", error.message);
    return;
  }

  if (data.session) {
    showDashboard();
    loginMessage.textContent = "";

    // Run your existing function to load students, fees and payments.
    // For example: await loadDashboard();
  }
});

logoutBtn.addEventListener("click", async () => {
  if (typeof supabaseClient === "undefined") return;

  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    console.error("Logout failed:", error.message);
    return;
  }

  showLogin();
});

const passwordForm = document.getElementById("passwordForm");

if (passwordForm) {
  const gate = document.getElementById("passwordGate");
  const accessInput = document.getElementById("accessPassword");
  const message = document.getElementById("passwordMessage");
  const header = document.querySelector(".topbar");
  const container = document.querySelector(".container");
  const footer = document.querySelector("footer");

  header.classList.add("hidden");
  container.classList.add("hidden");
  footer.classList.add("hidden");

  passwordForm.addEventListener("submit", function (event) {
    event.preventDefault();

    if (accessInput.value === "rose254") {
      gate.classList.add("hidden");
      header.classList.remove("hidden");
      container.classList.remove("hidden");
      footer.classList.remove("hidden");
      accessInput.value = "";
      message.textContent = "";
    } else {
      message.textContent = "Incorrect access password.";
      accessInput.value = "";
      accessInput.focus();
    }
  });
}

