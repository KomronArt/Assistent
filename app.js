document.addEventListener("DOMContentLoaded", () => {

/* ================== CONSTANTS ================== */
const STATS_KEY = "questionStats";

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
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const progressEl = document.getElementById("progress");
const resultEl = document.getElementById("result");
const finalEl = document.getElementById("final");

/* ================== STATE ================== */

let selectedFile = null;
let tests = [];
let currentIndex = 0;
let userAnswers = [];
let solved = 0;
let correct = 0;
let checked = false;

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
  const empty = filesList.querySelector(".file-empty");
  if (empty) empty.remove();

  const file = e.target.files[0];
  if (!file) return;

  const card = document.createElement("div");
  card.className = "file-card";
  card.innerHTML = `
    <div class="file-main">
      <div class="file-name">📄 ${file.name}</div>
      <div class="file-info">Готов к запуску</div>
    </div>
    <button class="file-action">▶</button>
  `;

  card.onclick = () => {
    selectedFile = file;
    examModal.classList.remove("hidden");
  };

  filesList.appendChild(card);
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

function loadExamFromFile(file) {
  const reader = new FileReader();

  reader.onload = () => {
    tests = parseTXT(reader.result);

    if (tests.length === 0) {
      alert("В файле нет вопросов");
      return;
    }

    userAnswers = tests.map(() => ["", "", "", ""]);
    currentIndex = 0;
    solved = 0;
    correct = 0;
    checked = false;

    renderQuestion();
  };

  reader.readAsText(file);
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
      favorite: false,
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

    const favBtn = document.createElement("button");
    favBtn.className = "fav-btn";
    favBtn.textContent = questionStats[key].favorite ? "★" : "☆";
    favBtn.onclick = e => {
      e.stopPropagation();
      questionStats[key].favorite = !questionStats[key].favorite;
      saveStats();
      renderQuestion();
    };

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

    card.appendChild(favBtn);
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
    const keyStr = userAnswers[currentIndex].join("");
    if (keyStr.length < 4) return;

    solved++;
    const correctKey = tests[currentIndex].key.split("");
    const isCorrect = keyStr === tests[currentIndex].key;

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

prevBtn.onclick = () => {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
  }
};

/* ================== FINAL ================== */

function updateProgress() {
  progressEl.textContent =
    `Вопрос ${currentIndex + 1} из ${tests.length} | Верно: ${correct}`;
}

function showFinal() {
  testEl.style.display = "none";
  answersEl.style.display = "none";
  document.querySelector(".nav").style.display = "none";
  resultEl.style.display = "none";

  finalEl.style.display = "block";

  const percent = Math.round((correct / tests.length) * 100);

  finalEl.innerHTML = `
    <h2>Экзамен завершён</h2>
    <p>Правильных ответов: <b>${correct}</b></p>
    <p>Всего вопросов: <b>${tests.length}</b></p>
    <p>Результат: <b>${percent}%</b></p>
    <button onclick="location.reload()">🔄 Начать заново</button>
  `;
  showStatsForFile();

}

/* ================== REPEAT WRONG ================== */

if (repeatWrongBtn) {
  repeatWrongBtn.onclick = () => {
    if (!selectedFile) {
      alert("Сначала выберите файл");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const allTests = parseTXT(reader.result);

      const wrongTests = allTests.filter((_, i) => {
        const key = `${selectedFile.name}::${i}`;
        const stat = questionStats[key];
        return stat && stat.wrong > stat.correct;
      });

      if (wrongTests.length === 0) {
        alert("🎉 Ошибочных вопросов нет!");
        return;
      }

      tests = wrongTests;
      userAnswers = tests.map(() => ["", "", "", ""]);

      currentIndex = 0;
      solved = 0;
      correct = 0;
      checked = false;

      filesScreen.classList.add("hidden");
      appEl.style.display = "block";

      renderQuestion();
    };

    reader.readAsText(selectedFile);
  };
}


function showStatsForFile() {
  if (!selectedFile) return;

  const total = tests.length;

  let solved = 0;
  let correct = 0;
  let wrong = 0;

  tests.forEach((_, i) => {
    const key = `${selectedFile.name}::${i}`;
    const stat = questionStats[key];

    if (!stat) return;

    if (stat.correct > 0 || stat.wrong > 0) {
      solved++;
      correct += stat.correct;
      wrong += stat.wrong;
    }
  });

  const percent = solved
    ? Math.round((correct / (correct + wrong)) * 100)
    : 0;

  const panel = document.getElementById("statsPanel");
  panel.style.display = "block";
  panel.innerHTML = `
    <h3>📊 Статистика по файлу</h3>
    <p>Всего вопросов: <b>${total}</b></p>
    <p>Решено: <b>${solved}</b></p>
    <p>Правильных ответов: <b>${correct}</b></p>
    <p>Ошибок: <b>${wrong}</b></p>
    <p>Успешность: <b>${percent}%</b></p>
  `;
}

});
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

