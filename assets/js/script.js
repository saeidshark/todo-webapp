// عناصر کلیدی DOM
const taskForm = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const pagination = document.getElementById("pagination");
const themeToggleBtn = document.querySelector(".btn-toggle-theme");
const searchInput = document.getElementById("searchInput");
const filterPriority = document.getElementById("filterPriority");
const filterStatus = document.getElementById("filterStatus");

let tasks = [];
let chartInstance = null;
let currentPage = 1;
let editTaskId = null;
let isEditMode = false;
const tasksPerPage = 10;

// درخواست مجوز نوتیفیکیشن
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

// رویداد بارگذاری صفحه
document.addEventListener("DOMContentLoaded", async () => {
  tasks = await safeGetTasks();
  renderTasks();
  renderChart();
  await initCalendar();
  setInterval(checkReminders, 60000); // بررسی نوتیفیکیشن هر دقیقه
});

// سوئیچ تم
themeToggleBtn.addEventListener("click", toggleTheme);

// فیلترها و سرچ
searchInput.addEventListener("input", () => { currentPage = 1; renderTasks(); });
filterPriority.addEventListener("change", () => { currentPage = 1; renderTasks(); });
filterStatus.addEventListener("change", () => { currentPage = 1; renderTasks(); });

// ارسال فرم
taskForm.addEventListener("submit", addTaskFormHandler);

// ذخیره در localStorage
function saveTasksToLocal(tasks) {
  localStorage.setItem("todo_tasks", JSON.stringify(tasks));
}
function loadTasksFromLocal() {
  const stored = localStorage.getItem("todo_tasks");
  return stored ? JSON.parse(stored) : [];
}

// گرفتن تسک‌ها با بررسی اتصال اینترنت
async function safeGetTasks() {
  try {
    const onlineTasks = await getTasks();
    saveTasksToLocal(onlineTasks);
    return onlineTasks;
  } catch (err) {
    console.warn("آفلاین هستید، خواندن از localStorage...");
    return loadTasksFromLocal();
  }
}

// فراخوانی API برای گرفتن، افزودن، ویرایش، حذف
async function getTasks() {
  const res = await fetch('php/api.php');
  return res.json();
}

async function addTaskToServer(task) {
  const res = await fetch("php/api.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  return res.json();
}

async function updateTask(task) {
  const res = await fetch('php/api.php', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });
  return res.json();
}

async function deleteTask(id) {
  await fetch(`php/api.php?id=${id}`, {
    method: 'DELETE'
  });
  tasks = await safeGetTasks();
  renderTasks();
  renderChart();

}

// افزودن تسک
async function addTaskFormHandler(e) {
  e.preventDefault();

  const title = document.getElementById("taskTitle").value.trim();
  const priority = document.getElementById("taskPriority").value;
  const status = document.getElementById("taskStatus").value;
  let dueDate = document.getElementById("taskDueDate").value;
dueDate = dueDate ? dueDate : null;


  if (!title) return;

  const task = {
    id: isEditMode ? editTaskId : crypto.randomUUID(),
    title,
    priority,
    status,
    dueDate,
  };

  try {
    if (isEditMode) {
      await updateTask(task);
     const index = tasks.findIndex(t => t.id === editTaskId);
      if (index !== -1) {
        tasks[index] = task;
      }
    } else {
      await addTaskToServer(task);
      tasks.push(task);
    }
    saveTasksToLocal(tasks);
    renderTasks();
  } catch (err) {
    console.warn("مشکل در ارتباط با سرور");
    if (isEditMode) {
      const index = tasks.findIndex(t => t.id === editTaskId);
      if (index !== -1) tasks[index] = task;
    } else {
      tasks.push(task);
    }
    saveTasksToLocal(tasks);
    renderTasks();
    renderChart();

  }

  taskForm.reset();
  editTaskId = null;
  isEditMode = false;
}



// ویرایش تسک (مقداردهی فرم و حذف موقت)
function editTask(id) {
  const task = tasks.find(t => t.id == id);
  if (!task) {
    console.warn("Task not found:", id);
    return;
  }

  document.getElementById("taskTitle").value = task.title;
  document.getElementById("taskPriority").value = task.priority;
  document.getElementById("taskStatus").value = task.status;
  document.getElementById("taskDueDate").value = task.due_date && task.due_date !== "0000-00-00" ? task.due_date : "";


  editTaskId = task.id;
  isEditMode = true;

  console.log("🔧 Edit mode:", task);
}



// تغییر تم
function toggleTheme() {
  document.body.classList.toggle("dark-mode");
  document.body.classList.toggle("light-mode");
}

// نمایش تسک‌ها
function renderTasks() {
  const filteredTasks = tasks.filter(task => {
    return (
      task.title.includes(searchInput.value.trim()) &&
      (!filterPriority.value || task.priority === filterPriority.value) &&
      (!filterStatus.value || task.status === filterStatus.value)
    );
  });

  const start = (currentPage - 1) * tasksPerPage;
  const paginatedTasks = filteredTasks.slice(start, start + tasksPerPage);

  taskList.innerHTML = "";
  paginatedTasks.forEach(task => {
    const card = document.createElement("div");
    card.className = "col-12 col-md-6 col-lg-4";
    card.innerHTML = `
      <div class="task-card ${task.status === 'done' ? 'done' : ''}" data-id="${task.id}">
        <h5>${task.title}</h5>
        <p>اولویت: ${task.priority}</p>
        <p>وضعیت: ${task.status}</p>
        <p>تاریخ سررسید: ${task.dueDate || '-'}</p>
        <div class="task-actions">
          <button class="btn btn-sm btn-warning" onclick="editTask('${task.id}')">ویرایش</button>
          <button class="btn btn-sm btn-danger" onclick="deleteTask('${task.id}')">حذف</button>
        </div>
      </div>
    `;
    taskList.appendChild(card);
  });

  renderPagination(filteredTasks.length);
}

// صفحه‌بندی
function renderPagination(total) {
  const pageCount = Math.ceil(total / tasksPerPage);
  pagination.innerHTML = "";

  for (let i = 1; i <= pageCount; i++) {
    const li = document.createElement("li");
    li.className = "page-item" + (i === currentPage ? " active" : "");
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener("click", e => {
      e.preventDefault();
      currentPage = i;
      renderTasks();
    });
    pagination.appendChild(li);
  }
}

// چارت آماری
function renderChart() {
  const statusCounts = { todo: 0, inprogress: 0, done: 0 };

  tasks.forEach(task => {
    statusCounts[task.status]++;
  });

  const ctx = document.getElementById("taskChart").getContext("2d");
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["To Do", "In Progress", "Done"],
      datasets: [{
        label: "تعداد تسک‌ها",
        data: [statusCounts.todo, statusCounts.inprogress, statusCounts.done],
        backgroundColor: ["#f44336", "#ff9800", "#4caf50"]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: "آمار وضعیت تسک‌ها" }
      }
    }
  });
}


// تقویم
async function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  const tasks = await getTasks();

  const events = tasks.map(task => ({
    title: task.title,
    start: task.due_date,
    backgroundColor: task.status === 'done' ? '#4CAF50' : '#FFC107',
    borderColor: '#ccc'
  }));

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 600,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek'
    },
    events: events
  });

  calendar.render();
}

// نوتیفیکیشن یادآور
async function checkReminders() {
  const tasks = await getTasks();
  const now = new Date();

  tasks.forEach(task => {
    const dueDate = new Date(task.due_date);
    const hoursDiff = (dueDate - now) / (1000 * 60 * 60);

    if (hoursDiff > 0 && hoursDiff < 2 && task.status !== 'done') {
      showNotification(`یادآور: "${task.title}" تا ${Math.floor(hoursDiff)} ساعت دیگر موعد دارد`);
    }
  });
}

function showNotification(message) {
  if (Notification.permission === "granted") {
    new Notification("🔔 یادآور تسک", {
      body: message,
      icon: "assets/todo-icon.png"
    });
  }
}

// کشیدن و رها کردن
function allowDrop(ev) {
  ev.preventDefault();
}

function drag(ev) {
  ev.dataTransfer.setData("text", ev.target.dataset.id);
}

async function drop(ev) {
  ev.preventDefault();
  const id = ev.dataTransfer.getData("text");
  const newStatus = ev.target.closest(".task-column").dataset.status;

  const tasks = await safeGetTasks();
  const task = tasks.find(t => t.id == id);
  if (task) {
    task.status = newStatus;
    await updateTask(task);
    renderTasks();
    renderChart();

  }
}
