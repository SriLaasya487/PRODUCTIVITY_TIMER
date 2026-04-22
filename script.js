// ===== TIMER STATE =====
let totalTime = 1500; // 25 minutes in seconds
let remainingTime = totalTime;
let interval = null;
let isRunning = false;
let focusRecords = [];
let currentTaskName = '';

const startBtn = document.getElementById('startBtn');
const timerDisplay = document.getElementById('timer');
const progressCircle = document.getElementById('progressCircle');
const currentTaskInput = document.getElementById('currentTaskInput');

// ===== TIMER FUNCTIONS =====
function updateDisplay() {
  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;
  timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  updateProgressCircle();
}

function updateProgressCircle() {
  const circumference = 597;
  const progress = (remainingTime / totalTime) * circumference;
  progressCircle.style.strokeDashoffset = circumference - progress;
}

function toggleTimer() {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  if (isRunning) return;
  
  currentTaskName = currentTaskInput.value || 'Unnamed Focus';
  isRunning = true;
  startBtn.textContent = '⏸ Pause Focus';
  startBtn.style.background = '#FF6B6B';
  startBtn.style.color = 'white';

  interval = setInterval(() => {
    if (remainingTime > 0) {
      remainingTime--;
      updateDisplay();
    } else {
      completeSession();
    }
  }, 1000);
}

function pauseTimer() {
  isRunning = false;
  clearInterval(interval);
  startBtn.textContent = '▶ Start to Focus';
  startBtn.style.background = 'white';
  startBtn.style.color = '#333';
}

function resetTimer() {
  clearInterval(interval);
  isRunning = false;
  remainingTime = totalTime;
  updateDisplay();
  startBtn.textContent = '▶ Start to Focus';
  startBtn.style.background = 'white';
  startBtn.style.color = '#333';
}

function completeSession() {
  clearInterval(interval);
  isRunning = false;
  
  // Add to focus records
  const focusTime = totalTime - remainingTime;
  const minutes = Math.floor(focusTime / 60);
  
  if (focusTime > 0) {
    focusRecords.push({
      task: currentTaskName,
      time: minutes,
      color: getRandomColor()
    });
    addFocusRecord(currentTaskName, minutes, getRandomColor());
  }

  // Reset for next session
  remainingTime = totalTime;
  updateDisplay();
  startBtn.textContent = '▶ Start to Focus';
  startBtn.style.background = 'white';
  startBtn.style.color = '#333';
  
  alert(`Great job! You focused for ${minutes} minutes on "${currentTaskName}"`);
  updateTotalFocusTime();
}

// ===== COLOR GENERATION =====
function getRandomColor() {
  const colors = ['#FF9800', '#2196F3', '#4CAF50', '#F44336', '#9C27B0', '#00BCD4'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ===== TASK MANAGEMENT =====
function addNewTask() {
  const input = document.getElementById('newTaskInput');
  const taskText = input.value.trim();

  if (taskText === '') return;

  const taskList = document.getElementById('todayList');
  const taskItem = document.createElement('div');
  taskItem.className = 'task-item';
  
  taskItem.innerHTML = `
    <input type="checkbox" class="task-check">
    <span class="task-name">${taskText}</span>
    <span class="task-time">0m</span>
  `;

  taskList.appendChild(taskItem);
  input.value = '';
}

function addFocusRecord(taskName, minutes, color) {
  const recordsList = document.getElementById('focusRecords');
  const recordItem = document.createElement('div');
  recordItem.className = 'record-item';
  recordItem.style.background = color;
  recordItem.innerHTML = `
    <span>${taskName}</span>
    <span>${minutes}m</span>
  `;
  recordsList.appendChild(recordItem);
}

function updateTotalFocusTime() {
  let totalMinutes = 0;
  focusRecords.forEach(record => {
    totalMinutes += record.time;
  });

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  document.getElementById('totalFocusTime').textContent = `${hours}h ${minutes}m`;
}

// ===== CONTROL FUNCTIONS =====
function toggleFullscreen() {
  const elem = document.documentElement;
  if (!document.fullscreenElement) {
    elem.requestFullscreen().catch(err => {
      alert(`Error attempting to enable fullscreen: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
}

function toggleTimerMode() {
  // This would cycle through different timer durations
  const modes = [
    { time: 1500, name: '25 min (Pomodoro)' },
    { time: 300, name: '5 min (Short Break)' },
    { time: 900, name: '15 min (Long Break)' }
  ];
  
  const currentIndex = modes.findIndex(m => m.time === totalTime);
  const nextIndex = (currentIndex + 1) % modes.length;
  
  totalTime = modes[nextIndex].time;
  resetTimer();
  alert(`Timer mode: ${modes[nextIndex].name}`);
}

function toggleSound() {
  alert('White noise feature - would play background sounds');
  // In a real app, this would play actual audio
}

// ===== INITIALIZATION =====
updateDisplay();

