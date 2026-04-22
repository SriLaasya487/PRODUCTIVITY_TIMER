// ===== TO-DO LIST =====
function addTask() {
  const input = document.getElementById("taskInput");
  const taskText = input.value.trim();

  if (taskText === "") return;

  const li = document.createElement("li");
  li.textContent = taskText;

  li.onclick = () => {
    li.classList.toggle("completed");
  };

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "X";
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    li.remove();
  };

  li.appendChild(deleteBtn);
  document.getElementById("taskList").appendChild(li);

  input.value = "";
}

// ===== TIMER =====
let time = 1500; // 25 minutes
let interval;

function updateDisplay() {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  document.getElementById("timer").textContent =
    `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

function startTimer() {
  if (interval) return;

  interval = setInterval(() => {
    if (time > 0) {
      time--;
      updateDisplay();
    } else {
      clearInterval(interval);
      alert("Time's up!");
    }
  }, 1000);
}

function resetTimer() {
  clearInterval(interval);
  interval = null;
  time = 1500;
  updateDisplay();
}

updateDisplay();
