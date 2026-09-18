/**
 * FocusFlow — Core Timer Engine & State Controller
 * Features:
 * - Tabular countdown timer with SVG ring visualization
 * - Non-blocking UI (toasts & Web Audio API chime, no blocking alert dialogs)
 * - Built-in procedural pink noise rain synthesizer (zero external mp3 dependencies)
 * - LocalStorage persistence (tasks, elapsed minutes, session history)
 * - Global keyboard shortcuts (Space to toggle, R to reset, F for fullscreen)
 */

// ==========================================
// Storage Keys & Preset Configurations
// ==========================================
const STORAGE_KEYS = {
  TASKS: 'focusflow_tasks',
  HISTORY: 'focusflow_history',
  TOTAL_MINS: 'focusflow_total_mins',
  ACTIVE_TASK: 'focusflow_active_task'
};

const MODE_DURATIONS = {
  pomodoro: 1500,     // 25 mins
  shortBreak: 300,    // 5 mins
  longBreak: 900      // 15 mins
};

// 2 * Math.PI * 138 ≈ 867
const RING_CIRCUMFERENCE = 867;

// ==========================================
// State Variables
// ==========================================
let currentMode = 'pomodoro';
let totalDuration = MODE_DURATIONS.pomodoro;
let remainingSeconds = totalDuration;
let timerInterval = null;
let isRunning = false;
let completedPomodoros = 0;

let tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS)) || [
  { id: 1, title: 'Draft system architecture', completed: true },
  { id: 2, title: 'Refactoring core timer logic', completed: false },
  { id: 3, title: 'Test sound synth & web audio', completed: false }
];

let sessionHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY)) || [];
let totalFocusMinutes = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_MINS) || '0', 10);
let activeTask = localStorage.getItem(STORAGE_KEYS.ACTIVE_TASK) || 'Refactoring core timer logic';

// ==========================================
// DOM Selectors
// ==========================================
const timerDisplay = document.getElementById('timerDisplay');
const progressRing = document.getElementById('progressRing');
const startBtn = document.getElementById('startBtn');
const startText = document.getElementById('startText');
const startIcon = document.getElementById('startIcon');
const resetBtn = document.getElementById('resetBtn');
const quickAddBtn = document.getElementById('quickAddBtn');
const modeButtons = document.querySelectorAll('.mode-btn');
const activeTaskDisplay = document.getElementById('activeTaskDisplay');
const activeTaskText = document.getElementById('activeTaskText');
const sessionLabel = document.getElementById('sessionLabel');

const totalFocusTime = document.getElementById('totalFocusTime');
const goalPercentage = document.getElementById('goalPercentage');
const dailyProgressBar = document.getElementById('dailyProgressBar');

const taskForm = document.getElementById('taskForm');
const newTaskInput = document.getElementById('newTaskInput');
const taskList = document.getElementById('taskList');
const taskCountBadge = document.getElementById('taskCountBadge');

const historyList = document.getElementById('historyList');
const emptyHistoryMsg = document.getElementById('emptyHistoryMsg');
const clearLogBtn = document.getElementById('clearLogBtn');

const fullscreenBtn = document.getElementById('fullscreenBtn');
const ambientToggleBtn = document.getElementById('ambientToggleBtn');
const soundVolume = document.getElementById('soundVolume');
const toastMessage = document.getElementById('toastMessage');

// ==========================================
// Timer Logic
// ==========================================

function updateDisplay() {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  timerDisplay.textContent = formatted;
  document.title = `${formatted} — ${activeTask || 'FocusFlow'}`;

  // Update ring progress
  const progressRatio = remainingSeconds / totalDuration;
  const offset = RING_CIRCUMFERENCE * (1 - progressRatio);
  progressRing.style.strokeDashoffset = offset;
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  
  startBtn.classList.add('running');
  startText.textContent = 'Pause';
  startIcon.innerHTML = '&#10074;&#10074;';

  timerInterval = setInterval(() => {
    if (remainingSeconds > 0) {
      remainingSeconds--;
      updateDisplay();
    } else {
      completeSession();
    }
  }, 1000);
}

function pauseTimer() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(timerInterval);
  
  startBtn.classList.remove('running');
  startText.textContent = 'Resume';
  startIcon.innerHTML = '&#9654;';
}

function toggleTimer() {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function resetTimer() {
  pauseTimer();
  remainingSeconds = totalDuration;
  startText.textContent = 'Start Focus';
  startIcon.innerHTML = '&#9654;';
  updateDisplay();
}

function setMode(mode) {
  currentMode = mode;
  totalDuration = MODE_DURATIONS[mode] || 1500;
  resetTimer();
  
  modeButtons.forEach(btn => {
    const isSelected = btn.dataset.mode === mode;
    btn.classList.toggle('active', isSelected);
    btn.setAttribute('aria-selected', isSelected);
  });

  if (mode === 'pomodoro') {
    sessionLabel.textContent = `Session ${completedPomodoros + 1} of 4`;
  } else if (mode === 'shortBreak') {
    sessionLabel.textContent = 'Rest & Recharge';
  } else {
    sessionLabel.textContent = 'Deep Rest';
  }
}

function completeSession() {
  pauseTimer();
  playChime();
  
  const elapsedMins = Math.round(totalDuration / 60);

  if (currentMode === 'pomodoro') {
    completedPomodoros++;
    totalFocusMinutes += elapsedMins;
    localStorage.setItem(STORAGE_KEYS.TOTAL_MINS, totalFocusMinutes);
    
    // Save history entry
    const entry = {
      task: activeTask,
      minutes: elapsedMins,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    sessionHistory.unshift(entry);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(sessionHistory));
    
    showToast(`Great work! Completed "${activeTask}" (+${elapsedMins}m)`);
    renderHistory();
    updateMetrics();

    // Auto-cycle break
    if (completedPomodoros % 4 === 0) {
      setMode('longBreak');
    } else {
      setMode('shortBreak');
    }
  } else {
    showToast('Break finished! Ready to jump back in?');
    setMode('pomodoro');
  }
}

// ==========================================
// Metrics & History Log
// ==========================================
function updateMetrics() {
  const hours = Math.floor(totalFocusMinutes / 60);
  const mins = totalFocusMinutes % 60;
  totalFocusTime.textContent = `${hours}h ${String(mins).padStart(2, '0')}m`;
  
  const targetMinutes = 240; // 4 hour target
  const pct = Math.min(100, Math.round((totalFocusMinutes / targetMinutes) * 100));
  
  goalPercentage.textContent = `${pct}%`;
  dailyProgressBar.style.width = `${pct}%`;
}

function renderHistory() {
  historyList.innerHTML = '';
  if (sessionHistory.length === 0) {
    historyList.appendChild(emptyHistoryMsg);
    return;
  }

  sessionHistory.slice(0, 8).forEach(entry => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <span class="history-task">${escapeHtml(entry.task)}</span>
      <span class="history-time">+${entry.minutes}m &bull; ${entry.time}</span>
    `;
    historyList.appendChild(item);
  });
}

// ==========================================
// Task Manager
// ==========================================
function renderTasks() {
  taskList.innerHTML = '';
  
  const completedCount = tasks.filter(t => t.completed).length;
  taskCountBadge.textContent = `${completedCount} of ${tasks.length} done`;

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''} ${task.title === activeTask ? 'active' : ''}`;
    
    li.innerHTML = `
      <div class="task-left">
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}" />
        <span class="task-title">${escapeHtml(task.title)}</span>
      </div>
      <button class="task-del-btn" data-id="${task.id}" title="Remove task">&times;</button>
    `;

    // Click title to set as active focus target
    li.querySelector('.task-title').addEventListener('click', () => {
      setActiveTask(task.title);
    });

    // Checkbox toggle
    li.querySelector('.task-checkbox').addEventListener('change', (e) => {
      task.completed = e.target.checked;
      saveTasks();
      renderTasks();
    });

    // Delete task
    li.querySelector('.task-del-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      tasks = tasks.filter(t => t.id !== task.id);
      saveTasks();
      renderTasks();
    });

    taskList.appendChild(li);
  });
}

function setActiveTask(title) {
  activeTask = title;
  activeTaskText.textContent = title;
  localStorage.setItem(STORAGE_KEYS.ACTIVE_TASK, title);
  updateDisplay();
  renderTasks();
  showToast(`Active focus target: "${title}"`);
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
}

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = newTaskInput.value.trim();
  if (!title) return;

  const newTask = {
    id: Date.now(),
    title: title,
    completed: false
  };
  
  tasks.push(newTask);
  saveTasks();
  renderTasks();
  setActiveTask(title);
  newTaskInput.value = '';
});

// Click pill to rename active focus task directly
activeTaskDisplay.addEventListener('click', () => {
  const newName = prompt('Set focus target name:', activeTask);
  if (newName && newName.trim()) {
    setActiveTask(newName.trim());
  }
});


// ==========================================
// Web Audio Ambient Synthesizer & Chime 
// (No external audio file dependencies)
// ==========================================
let audioCtx = null;
let noiseNode = null;
let noiseGain = null;
let isAudioPlaying = false;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function toggleAmbientAudio() {
  initAudio();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  if (isAudioPlaying) {
    stopAmbientAudio();
  } else {
    startAmbientAudio();
  }
}

function startAmbientAudio() {
  initAudio();
  
  // Create 2-second pink noise buffer
  const bufferSize = audioCtx.sampleRate * 2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
    b6 = white * 0.115926;
  }

  noiseNode = audioCtx.createBufferSource();
  noiseNode.buffer = buffer;
  noiseNode.loop = true;

  // Gentle lowpass filter for smooth rain atmosphere
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 850;

  noiseGain = audioCtx.createGain();
  noiseGain.gain.value = soundVolume.value / 250;

  noiseNode.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);
  
  noiseNode.start();
  isAudioPlaying = true;
  ambientToggleBtn.classList.add('active');
}

function stopAmbientAudio() {
  if (noiseNode) {
    try { noiseNode.stop(); } catch (e) {}
    noiseNode.disconnect();
  }
  isAudioPlaying = false;
  ambientToggleBtn.classList.remove('active');
}

soundVolume.addEventListener('input', (e) => {
  if (noiseGain) {
    noiseGain.gain.value = e.target.value / 250;
  }
});

// Soft bell chime upon session end
function playChime() {
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.4); // A5
    
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 1.2);
  } catch (e) {
    console.warn('Audio play restricted by browser policy');
  }
}

// ==========================================
// Toast & Utility Helpers
// ==========================================
let toastTimeout = null;
function showToast(msg) {
  toastMessage.textContent = msg;
  toastMessage.classList.add('show');
  
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastMessage.classList.remove('show');
  }, 3200);
}

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Clear today's history
clearLogBtn.addEventListener('click', () => {
  if (confirm("Clear today's session history?")) {
    sessionHistory = [];
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    renderHistory();
  }
});

// Fullscreen toggle
fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
});

// Quick add +5 minutes
quickAddBtn.addEventListener('click', () => {
  remainingSeconds += 300;
  totalDuration += 300;
  updateDisplay();
  showToast('Added +5 minutes to current session');
});

// Listeners
startBtn.addEventListener('click', toggleTimer);
resetBtn.addEventListener('click', resetTimer);
ambientToggleBtn.addEventListener('click', toggleAmbientAudio);

modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    setMode(btn.dataset.mode);
  });
});

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  
  if (e.code === 'Space') {
    e.preventDefault();
    toggleTimer();
  } else if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    resetTimer();
  } else if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    fullscreenBtn.click();
  }
});

// Initial boot
activeTaskText.textContent = activeTask;
updateDisplay();
renderTasks();
renderHistory();
updateMetrics();

