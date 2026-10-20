
const ACCESS_PASSWORD = "rose";

const passwordGate = document.getElementById("passwordGate");
const passwordForm = document.getElementById("passwordForm");
const accessPassword = document.getElementById("accessPassword");
const passwordMessage = document.getElementById("passwordMessage");

// Hide the rest of the system until the password is entered.
document.querySelector(".topbar").classList.add("hidden");
document.querySelector(".container").classList.add("hidden");
document.querySelector("footer").classList.add("hidden");

passwordForm.addEventListener("submit", function (event) {
  event.preventDefault();

  if (accessPassword.value === ACCESS_PASSWORD) {
    passwordGate.classList.add("hidden");

    document.querySelector(".topbar").classList.remove("hidden");
    document.querySelector(".container").classList.remove("hidden");
    document.querySelector("footer").classList.remove("hidden");

    accessPassword.value = "";
    passwordMessage.textContent = "";
  } else {
    passwordMessage.textContent = "Incorrect password. Try again.";
    accessPassword.value = "";
    accessPassword.focus();
  }
});
