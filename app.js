document.addEventListener("DOMContentLoaded", () => {

/* ================== CONSTANTS ================== */
const STATS_KEY = "questionStats";
const FILES_KEY = "examFiles";

let storedFiles = JSON.parse(localStorage.getItem(FILES_KEY)) || [];

/* ================== ELEMENTS ================== */

// files screen
const filesScreen = document.getElementById("filesScreen");
const addFileInput = document.getElementById("addFileInput");
const filesList = document.getElementById("filesList");
const repeatWrongBtn = document.getElementById("repeatWrongBtn");

// modal
const examModal = document.getElementById("examModal");
const closeModal = document.getElementById("closeModal");
const startExamBtn = document.getElementById("startExamBtn");

// exam
const appEl = document.querySelector(".app");
const testEl = document.getElementById("test");
const answersEl = document.getElementById("answers");
const titleEl = document.getElementById("title");
const nextBtn = document.getElementById("nextBtn");
const progressEl = document.getElementById("progress");
const resultEl = document.getElementById("result");
const finalEl = document.getElementById("final");
const finishBtn = document.getElementById("finishBtn");

/* ================== STATE ================== */

let selectedFile = null;
let tests = [];
let currentIndex = 0;
let userAnswers = [];
let solved = 0;
let correct = 0;
let checked = false;
let questionStatus = [];

let questionStats = JSON.parse(localStorage.getItem(STATS_KEY)) || {};

/* ================== HELPERS ================== */

function statKey(index) {
  return `${selectedFile.name}::${index}`;
}

function saveStats() {
  localStorage.setItem(STATS_KEY, JSON.stringify(questionStats));
}

/* ================== FILE ADD ================== */

addFileInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    const fileObj = {
      name: file.name,
      content: reader.result,
      addedAt: Date.now()
    };

    if (storedFiles.some(f => f.name === file.name)) {
      alert("Файл уже добавлен");
      return;
    }

    storedFiles.push(fileObj);
    localStorage.setItem(FILES_KEY, JSON.stringify(storedFiles));
    renderFileCard(fileObj);
  };

  reader.readAsText(file);
  addFileInput.value = "";
});

/* ================== MODAL ================== */

closeModal.onclick = () => examModal.classList.add("hidden");

startExamBtn.onclick = () => {
  if (!selectedFile) {
    alert("Выберите файл");
    return;
  }

  examModal.classList.add("hidden");
  filesScreen.classList.add("hidden");
  appEl.style.display = "block";

  loadExamFromFile(selectedFile);
};

/* ================== LOAD & PARSE ================== */

function loadExamFromFile(fileObj) {
  tests = parseTXT(fileObj.content);

  if (!tests.length) {
    alert("В файле нет вопросов");
    return;
  }

  userAnswers = tests.map(() => ["", "", "", ""]);
  questionStatus = tests.map(() => null);

  currentIndex = 0;
  solved = 0;
  correct = 0;
  checked = false;

  renderQuestion();
}

function parseTXT(text) {
  const blocks = text.split(/№\d+/).filter(b => b.trim());

  return blocks.map(b => {
    const lines = b.split("\n").map(l => l.trim()).filter(Boolean);
    const left = [], right = [];
    let title = "", key = "";

    lines.forEach(l => {
      if (l.startsWith("@")) title = l.slice(1);
      else if (/^\$[abcd]/.test(l)) left.push(l.slice(2));
      else if (/^\$\d/.test(l)) right.push(l.slice(2));
      else if (l.startsWith("=")) key = l.slice(1);
    });

    return { title, left, right, key };
  });
}

/* ================== RENDER ================== */

function renderQuestion() {
  const t = tests[currentIndex];
  if (!t) return;

  const key = statKey(currentIndex);

  if (!questionStats[key]) {
    questionStats[key] = {
      correct: 0,
      wrong: 0,
      last: null
    };
  }

  titleEl.textContent = t.title;
  titleEl.style.color =
    questionStats[key].last === false ? "#c0392b" : "";

  testEl.innerHTML = "";
  resultEl.style.display = "none";
  checked = false;
  nextBtn.textContent = "Проверить";

  t.left.forEach((q, i) => {
    const card = document.createElement("div");
    card.className = "card";

    const text = document.createElement("div");
    text.className = "question";
    text.textContent = `${String.fromCharCode(97 + i)}) ${q}`;

    const options = document.createElement("div");
    options.className = "options";

    for (let n = 1; n <= 5; n++) {
      const btn = document.createElement("button");
      btn.textContent = n;
      btn.className = "option-btn";

      if (userAnswers[currentIndex][i] === String(n)) {
        btn.classList.add("active");
      }

      btn.onclick = () => {
        userAnswers[currentIndex][i] = String(n);
        renderQuestion();
      };

      options.appendChild(btn);
    }

    card.appendChild(text);
    card.appendChild(options);
    testEl.appendChild(card);
  });

  answersEl.innerHTML = t.right
    .map((r, i) => `<p><b>${i + 1})</b> ${r}</p>`)
    .join("");

  updateProgress();
}

/* ================== CHECK ================== */

nextBtn.onclick = () => {
  if (!checked) {
    if (userAnswers[currentIndex].some(v => v === "")) return;

    solved++;
    const keyStr = userAnswers[currentIndex].join("");
    const isCorrect = keyStr === tests[currentIndex].key;
    questionStatus[currentIndex] = isCorrect;

    const key = statKey(currentIndex);

    if (isCorrect) {
      correct++;
      questionStats[key].correct++;
      questionStats[key].last = true;
    } else {
      questionStats[key].wrong++;
      questionStats[key].last = false;
    }

    saveStats();

    const correctKey = tests[currentIndex].key.split("");

    document.querySelectorAll(".card").forEach((card, i) => {
      card.querySelectorAll(".option-btn").forEach(btn => {
        if (btn.textContent === correctKey[i]) {
          btn.classList.add("correct");
        }
        if (
          btn.classList.contains("active") &&
          btn.textContent !== correctKey[i]
        ) {
          btn.classList.add("wrong");
        }
      });
    });

    resultEl.className = isCorrect ? "ok" : "bad";
    resultEl.textContent = isCorrect ? "Верно ✅" : "Неверно ❌";
    resultEl.style.display = "block";

    checked = true;
    nextBtn.textContent =
      currentIndex === tests.length - 1 ? "Завершить" : "Далее →";

    updateProgress();
    return;
  }

  if (currentIndex < tests.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    showFinal();
  }
};


/* ================== PROGRESS ================== */

function updateProgress() {
  progressEl.innerHTML = "";

  tests.forEach((_, i) => {
    const btn = document.createElement("button");
    btn.textContent = i + 1;
    btn.className = "progress-btn";

    if (i === currentIndex) btn.classList.add("active");
    if (questionStatus[i] === true) btn.classList.add("correct");
    if (questionStatus[i] === false) btn.classList.add("wrong");

    btn.onclick = () => {
      currentIndex = i;
      renderQuestion();
    };

    progressEl.appendChild(btn);
  });
}

/* ================== FINAL ================== */

finishBtn.onclick = showFinal;

function showFinal() {
  testEl.style.display = "none";
  answersEl.style.display = "none";
  document.querySelector(".nav").style.display = "none";
  resultEl.style.display = "none";

  finalEl.style.display = "block";

  const total = tests.length;
  const percent = total ? Math.round((correct / total) * 100) : 0;

  let emoji = "🙂";
  let message = "Неплохой результат";
  let color = "#3498db";

  if (percent >= 90) {
    emoji = "🔥🏆";
    message = "Отлично! Почти идеально!";
    color = "#27ae60";
  } else if (percent >= 80) {
    emoji = "😄";
    message = "Очень круто!";
    color = "#2ecc71";
  } else if (percent >= 70) {
    emoji = "😊";
    message = "Хороший результат";
    color = "#1abc9c";
  } else if (percent >= 60) {
    emoji = "🙂";
    message = "Нормально, есть куда расти";
    color = "#f1c40f";
  } else if (percent >= 50) {
    emoji = "😐";
    message = "Половина — уже неплохо";
    color = "#f39c12";
  } else if (percent >= 40) {
    emoji = "😕";
    message = "Стоит повторить материал";
    color = "#e67e22";
  } else if (percent >= 30) {
    emoji = "😟";
    message = "Нужно больше практики";
    color = "#e74c3c";
  } else if (percent >= 20) {
    emoji = "😣";
    message = "Сложно, но всё впереди";
    color = "#c0392b";
  } else if (percent >= 10) {
    emoji = "😢";
    message = "Почти не получилось";
    color = "#96281b";
  } else {
    emoji = "💀";
    message = "Нужно начать заново и спокойно";
    color = "#7f8c8d";
  }

  finalEl.innerHTML = `
    <div class="final-card" style="border-color:${color}">
      <h1 style="font-size:48px">${emoji}</h1>
      <h2>${message}</h2>

      <p style="font-size:18px">
        Решено <b>${correct}</b> из <b>${total}</b>
      </p>

      <div style="
        font-size:36px;
        font-weight:bold;
        color:${color};
        margin:20px 0
      ">
        ${percent}%
      </div>

      <button onclick="location.reload()" class="final-btn">
        🔄 К файлам
      </button>
    </div>
  `;
}



/* ================== FILE CARD ================== */

function renderFileCard(fileObj) {
  const card = document.createElement("div");
  card.className = "file-card";

  card.innerHTML = `
    <div class="delete-zone">
      🗑
    </div>

    <div class="file-inner">
      <div class="file-name">${fileObj.name}</div>
      <div class="file-arrow">›</div>
    </div>
  `;

  const inner = card.querySelector(".file-inner");
  const del = card.querySelector(".delete-zone");

  inner.onclick = () => {
    selectedFile = fileObj;
    examModal.classList.remove("hidden");
  };

  del.onclick = () => {
    if (!confirm("Удалить файл?")) return;
    storedFiles = storedFiles.filter(f => f.name !== fileObj.name);
    localStorage.setItem(FILES_KEY, JSON.stringify(storedFiles));
    card.remove();
  };

  enableSwipe(card);
  filesList.appendChild(card);
}





function enableSwipe(card) {
  let startX = 0;
  let currentX = 0;

  const inner = card.querySelector(".file-inner");

  inner.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
  });

  inner.addEventListener("touchend", e => {
    currentX = e.changedTouches[0].clientX;
    const delta = currentX - startX;

    if (delta < -50) {
      card.classList.add("swiped");
    } else {
      card.classList.remove("swiped");
    }
  });

  document.addEventListener("touchstart", e => {
    if (!card.contains(e.target)) {
      card.classList.remove("swiped");
    }
  });
}



/* ================== FILTER UI (DISABLED) ================== */

if (repeatWrongBtn) {
  repeatWrongBtn.onclick = () => {
    // фильтры отключены
  };
}

/* ================== INIT ================== */

storedFiles.forEach(renderFileCard);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

});
