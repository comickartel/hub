const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const $ = (id) => document.getElementById(id);

function setMessage(id, message, error = false) {
  const element = $(id);
  element.textContent = message;
  element.className = "message " + (error ? "error" : "success");
}

function money(value) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function currentFeePeriod() {
  return {
    term: $("feeTerm").value,
    year: Number($("feeYear").value)
  };
}

function currentPaymentPeriod() {
  return {
    term: $("paymentTerm").value,
    year: Number($("paymentYear").value)
  };
}

async function checkAdmin() {
  const { data: { user }, error } = await db.auth.getUser();

  if (error || !user) {
    showLoggedOut();
    return false;
  }

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "admin") {
    await db.auth.signOut();
    showLoggedOut();
    setMessage(
      "loginMessage",
      "This account is not authorized as an administrator.",
      true
    );
    return false;
  }

  $("loginPanel").classList.add("hidden");
  $("dashboard").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");

  await refreshDashboard();
  return true;
}

function showLoggedOut() {
  $("loginPanel").classList.remove("hidden");
  $("dashboard").classList.add("hidden");
  $("logoutBtn").classList.add("hidden");
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = event.submitter;
  button.disabled = true;
  setMessage("loginMessage", "Signing in...");

  try {
    const { error } = await db.auth.signInWithPassword({
      email: $("email").value.trim(),
      password: $("password").value
    });

    if (error) throw error;

    const authorized = await checkAdmin();

    if (!authorized) return;

    setMessage("loginMessage", "");
  } catch (error) {
    setMessage("loginMessage", error.message, true);
  } finally {
    button.disabled = false;
  }
});

$("logoutBtn").addEventListener("click", async () => {
  const { error } = await db.auth.signOut();

  if (error) {
    alert("Could not log out: " + error.message);
    return;
  }

  showLoggedOut();
});


// SAVE OR UPDATE A CLASS FEE
$("feeForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = event.submitter;
  button.disabled = true;

  try {
    const fee = {
      class_name: $("feeClass").value,
      term: $("feeTerm").value,
      academic_year: Number($("feeYear").value),
      amount: Number($("feeAmount").value),
      updated_at: new Date().toISOString()
    };

    if (
      !Number.isInteger(fee.academic_year) ||
      !Number.isFinite(fee.amount) ||
      fee.amount < 0
    ) {
      throw new Error("Enter a valid academic year and fee amount.");
    }

    const { error } = await db
      .from("fees")
      .upsert(fee, {
        onConflict: "class_name,term,academic_year"
      });

    if (error) throw error;

    setMessage(
      "feeMessage",
      "Fee saved successfully: " + money(fee.amount)
    );

    await refreshDashboard();
  } catch (error) {
    setMessage("feeMessage", error.message, true);
  } finally {
    button.disabled = false;
  }
});


// ADD A STUDENT
$("studentForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = event.submitter;
  button.disabled = true;

  try {
    const student = {
      full_name: $("studentName").value.trim(),
      admission_no: $("admissionNo").value.trim(),
      class_name: $("studentClass").value
    };

    if (!student.full_name || !student.admission_no) {
      throw new Error("Enter the student's name and admission number.");
    }

    const { error } = await db
      .from("students")
      .insert(student);

    if (error) throw error;

    $("studentForm").reset();

    setMessage("studentMessage", "Student added successfully.");
    await refreshDashboard();
  } catch (error) {
    setMessage("studentMessage", error.message, true);
  } finally {
    button.disabled = false;
  }
});


// RECORD A PAYMENT
$("paymentForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = event.submitter;
  button.disabled = true;

  try {
    const payment = {
      student_id: Number($("paymentStudent").value),
      term: $("paymentTerm").value,
      academic_year: Number($("paymentYear").value),
      amount: Number($("paymentAmount").value)
    };

    if (
      !Number.isSafeInteger(payment.student_id) ||
      payment.student_id <= 0 ||
      !Number.isFinite(payment.amount) ||
      payment.amount <= 0
    ) {
      throw new Error("Select a student and enter a valid payment.");
    }

    const { error } = await db
      .from("payments")
      .insert(payment);

    if (error) throw error;

    $("paymentAmount").value = "";

    setMessage("paymentMessage", "Payment recorded successfully.");
    await refreshDashboard();
  } catch (error) {
    setMessage("paymentMessage", error.message, true);
  } finally {
    button.disabled = false;
  }
});


// LOAD ALL DASHBOARD DATA
async function refreshDashboard() {
  setMessage("dashboardMessage", "Loading dashboard...");

  try {
    const [
      studentsResult,
      feesResult,
      paymentsResult
    ] = await Promise.all([
      db.from("students")
        .select("id, admission_no, full_name, class_name")
        .order("full_name"),

      db.from("fees")
        .select("class_name, term, academic_year, amount"),

      db.from("payments")
        .select("student_id, term, academic_year, amount")
    ]);

    if (studentsResult.error) throw studentsResult.error;
    if (feesResult.error) throw feesResult.error;
    if (paymentsResult.error) throw paymentsResult.error;

    const students = studentsResult.data || [];
    const fees = feesResult.data || [];
    const payments = paymentsResult.data || [];

    $("studentCount").textContent = students.length;

    const period = currentFeePeriod();

    const feeMap = new Map();

    for (const fee of fees) {
      feeMap.set(
        `${fee.class_name}|${fee.term}|${fee.academic_year}`,
        Number(fee.amount)
      );
    }

    const paidMap = new Map();

    for (const payment of payments) {
      const key =
        `${payment.student_id}|${payment.term}|${payment.academic_year}`;

      paidMap.set(
        key,
        (paidMap.get(key) || 0) + Number(payment.amount)
      );
    }

    let expectedTotal = 0;
    let paidTotal = 0;

    const rows = students.map((student) => {
      const feeKey =
        `${student.class_name}|${period.term}|${period.year}`;

      const due = feeMap.get(feeKey) || 0;

      const paidKey =
        `${student.id}|${period.term}|${period.year}`;

      const paid = paidMap.get(paidKey) || 0;
      const balance = due - paid;

      expectedTotal += due;
      paidTotal += paid;

      return `
        <tr>
          <td>${escapeHTML(student.admission_no)}</td>
          <td>${escapeHTML(student.full_name)}</td>
          <td>${escapeHTML(student.class_name)}</td>
          <td>${money(due)}</td>
          <td>${money(paid)}</td>
          <td>${money(balance)}</td>
        </tr>
      `;
    });

    $("expectedTotal").textContent = money(expectedTotal);
    $("paidTotal").textContent = money(paidTotal);

    $("studentTable").innerHTML = rows.length
      ? rows.join("")
      : '<tr><td colspan="6">No students have been added.</td></tr>';

    const selector = $("paymentStudent");
    const previousValue = selector.value;

    selector.innerHTML = students.map((student) => `
      <option value="${student.id}">
        ${escapeHTML(student.admission_no)} -
        ${escapeHTML(student.full_name)}
      </option>
    `).join("");

    if (students.some(s => String(s.id) === previousValue)) {
      selector.value = previousValue;
    }

    setMessage(
      "dashboardMessage",
      `Showing balances for ${period.term}, ${period.year}.`
    );
  } catch (error) {
    setMessage("dashboardMessage", error.message, true);
  }
}


// Avoid inserting student names as executable HTML.
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

$("refreshBtn").addEventListener("click", refreshDashboard);

// Recalculate totals when the fee period changes.
$("feeTerm").addEventListener("change", refreshDashboard);
$("feeYear").addEventListener("change", refreshDashboard);

// Check the existing login when the page opens.
checkAdmin();
6. Set up your administrator account
Open your Supabase project.

Go to Authentication → Users.

Create a user with your admin email and a strong password.

Copy that user's UUID.

Open SQL Editor and run the following, replacing the example UUID with the real one.


sql
insert into public.profiles (id, role)
values ('PASTE-YOUR-ADMIN-USER-UUID-HERE', 'admin');
