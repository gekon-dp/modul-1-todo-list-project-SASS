// =========================================================================
// 1. ПОИСК HTML-ЭЛЕМЕНТОВ (ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ)
// =========================================================================
const openModalBtn = document.querySelector(".add-task-btn"); // Кнопка открытия модального окна
const closeModalBtn = document.getElementById("btnCancel"); // Кнопка "Отмена" в модалке
const taskModal = document.getElementById("taskModal"); // Само модальное окно
const modalOverlay = document.getElementById("modalOverlay"); // Темный фон (оверлей) за модалкой
const submitBtn = document.getElementById("btnSubmit"); // Кнопка "Добавить" задачу
const taskList = document.querySelector(".task-list"); // Контейнер <ul> для списков задач <li>
const filterButtons = document.querySelectorAll(".filter-buttons button"); // Все кнопки фильтрации
const visualDateInput = document.getElementById("modalDate"); // Видимое текстовое поле для даты

// =========================================================================
// 2. СОЗДАНИЕ И НАСТРОЙКА СКРЫТОГО СИСТЕМНОГО КАЛЕНДАРЯ
// =========================================================================
// Создаем невидимый тег <input type="date"> в оперативной памяти браузера.
// Он нужен, чтобы стандартный календарь открывался красиво в любом браузере.
const hiddenDateInput = document.createElement("input");
hiddenDateInput.type = "date";

// Стилизуем скрытый инпут, чтобы он растягивался ровно поверх текстового поля
hiddenDateInput.style.position = "absolute";
hiddenDateInput.style.opacity = "0"; // Делаем его полностью прозрачным
hiddenDateInput.style.width = "100%";
hiddenDateInput.style.height = "100%";
hiddenDateInput.style.top = "0";
hiddenDateInput.style.left = "0";
hiddenDateInput.style.pointerEvents = "none"; // Клик проходит сквозь него на текстовое поле

// =========================================================================
// 3. УПРАВЛЕНИЕ МОДАЛЬНЫМ ОКНОМ (ОТКРЫТИЕ / ЗАКРЫТИЕ)
// =========================================================================

// Функция для закрытия модального окна
function closeModal() {
  taskModal.classList.remove("open");
}

// Открытие модалки при клике на кнопку добавления задачи
if (openModalBtn) {
  openModalBtn.addEventListener("click", () => {
    // Получаем сегодняшнюю дату в формате YYYY-MM-DD для ограничения календаря
    const todayISO = new Date().toISOString().split("T")[0];
    hiddenDateInput.setAttribute("min", todayISO); // Запрещаем выбирать даты в прошлом
    taskModal.classList.add("open"); // Показываем модальное окно
  });
}

// Закрытие модалки при клике на кнопку "Отмена" или на темную область вокруг
if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
if (modalOverlay) modalOverlay.addEventListener("click", closeModal);

// =========================================================================
// 4. ЛОГИКА КАСТОМНОГО КАЛЕНДАРЯ (СВЯЗКА ДВУХ ИНПУТОВ)
// =========================================================================
if (visualDateInput) {
  const parentField = visualDateInput.parentElement; // Находим родительский блок поля ввода

  // Делаем родительский блок relative, чтобы скрытый инпут позиционировался ровно внутри
  parentField.style.position = "relative";
  parentField.appendChild(hiddenDateInput); // Физически добавляем календарь в HTML

  // При клике на красивое текстовое поле принудительно открываем системный календарь
  visualDateInput.addEventListener("click", () => {
    if (typeof hiddenDateInput.showPicker === "function") {
      hiddenDateInput.showPicker(); // Метод браузера для открытия календаря
    }
  });

  // Отслеживаем момент, когда пользователь выбрал дату в календаре
  hiddenDateInput.addEventListener("input", function () {
    if (this.value) {
      // Если дата выбрана
      const parsedDate = new Date(this.value);
      if (!isNaN(parsedDate.getTime())) {
        // 1. Записываем понятный формат (ДД.ММ.ГГГГ) в видимое поле
        visualDateInput.value = parsedDate.toLocaleDateString("ru-RU");
        // 2. Сохраняем системный формат (ГГГГ-ММ-ДД) в дата-атрибут для сортировки
        visualDateInput.dataset.raw = this.value;
      }
    } else {
      // Если дату стерли — очищаем оба поля
      visualDateInput.value = "";
      visualDateInput.dataset.raw = "";
    }
  });
}
// =========================================================================
// 5. УМНАЯ СОРТИРОВКА, ФИЛЬТРАЦИЯ И СЛУЖБА ПРОСРОЧКИ
// =========================================================================
function sortAndFilterTasks() {
  // Находим кнопку фильтра, которая активна в данный момент
  const activeFilterBtn = document.querySelector(
    ".filter-buttons .active-filter",
  );
  // Собираем все текущие элементы задач <li> в массив для сортировки
  const tasks = Array.from(document.querySelectorAll(".task-list li"));

  if (!activeFilterBtn) return;

  // Сбрасываем время у сегодняшней даты в 00:00:00 для точного сравнения дней
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Сортируем массив задач по правилам
  tasks.sort((a, b) => {
    const isCompA = a.classList.contains("completed");
    const isCompB = b.classList.contains("completed");

    // ПРАВИЛО 1: Группировка. Невыполненные задачи всегда идут выше выполненных
    if (!isCompA && isCompB) return -1;
    if (isCompA && !isCompB) return 1;

    // ПРАВИЛО 2: Сортировка по датам внутри групп (когда статусы выполнения равны)
    const dateA = a.dataset.rawDate
      ? new Date(a.dataset.rawDate).getTime()
      : Infinity;
    const dateB = b.dataset.rawDate
      ? new Date(b.dataset.rawDate).getTime()
      : Infinity;

    if (isCompA && isCompB) {
      // Если ОБЕ задачи ЗАВЕРШЕНЫ: сортируем от новых к старым (убывание дат)
      return dateB - dateA;
    } else {
      // Если ОБЕ задачи АКТИВНЫ: сортируем от близких дедлайнов к дальним (возрастание)
      return dateA - dateB;
    }
  });

  // Полностью очищаем список в HTML перед вставкой элементов в правильном порядке
  taskList.innerHTML = "";

  // Перебираем отсортированные задачи, управляем их отображением и статусом просрочки
  tasks.forEach((task) => {
    taskList.appendChild(task); // Возвращаем задачу обратно в DOM-дерево

    const rawDate = task.dataset.rawDate;
    const isCompleted = task.classList.contains("completed");

    // --- ПРОВЕРКА НА ПРОСРОЧКУ ДЕДЛАЙНА ---
    if (rawDate && !isCompleted) {
      const taskDate = new Date(rawDate);
      taskDate.setHours(0, 0, 0, 0);

      if (taskDate < today) {
        task.classList.add("overdue"); // Если дата меньше сегодняшней — добавляем класс ошибки
      } else {
        task.classList.remove("overdue");
      }
    } else {
      task.classList.remove("overdue"); // Выполненные или задачи без даты просроченными быть не могут
    }

    // --- ФИЛЬТРАЦИЯ ПО ВКЛАДКАМ (УПРАВЛЕНИЕ ВИДИМОСТЬЮ) ---
    if (activeFilterBtn.classList.contains("filter-all-btn")) {
      task.style.display = "flex"; // Кнопка "Все": показываем любую задачу
    } else if (activeFilterBtn.classList.contains("filter-active-btn")) {
      task.style.display = !isCompleted ? "flex" : "none"; // Кнопка "Активные": скрываем выполненные
    } else if (activeFilterBtn.classList.contains("filter-finished-btn")) {
      task.style.display = isCompleted ? "flex" : "none"; // Кнопка "Завершенные": скрываем активные
    }
  });
}

// Назначаем клики для кнопок переключения табов (фильтров)
filterButtons.forEach((button) => {
  button.addEventListener("click", function () {
    document
      .querySelector(".filter-buttons .active-filter")
      ?.classList.remove("active-filter");
    this.classList.add("active-filter");
    sortAndFilterTasks(); // Перезапускаем фильтрацию и сортировку
  });
});

// =========================================================================
// 6. РАБОТА С ХРАНИЛИЩЕМ (LOCALSTORAGE) И СОЗДАНИЕ ЭЛЕМЕНТОВ
// =========================================================================

// Функция сохранения текущего состояния всех задач в память браузера
function saveTasksToLocalStorage() {
  const tasks = [];
  document.querySelectorAll(".task-list li").forEach((li) => {
    tasks.push({
      id: Number(li.dataset.id), // Сохраняем ID как число
      desc: li.querySelector(".task-text").innerText, // Текст задачи
      rawDate: li.dataset.rawDate || "", // Системная дата
      completed: li.classList.contains("completed"), // Статус чекбокса
    });
  });
  localStorage.setItem("myTodoTasks", JSON.stringify(tasks));
}

// Функция создания одной задачи в DOM-дереве (принимает порядковый ID)
function createNewTaskDOM(id, desc, rawDate, isCompleted = false) {
  const li = document.createElement("li");
  if (isCompleted) li.classList.add("completed");

  li.dataset.id = id; // Записываем порядковый номер в data-id тега <li>
  li.dataset.rawDate = rawDate; // Привязываем системную дату к дата-атрибуту тега <li>

  // Форматируем дату для отображения внутри таски
  let formattedDate = "Без даты";
  if (rawDate) {
    const parsedDate = new Date(rawDate);
    if (!isNaN(parsedDate.getTime())) {
      formattedDate = parsedDate.toLocaleDateString("ru-RU");
    }
  }

  // Создаем внутреннюю HTML-структуру для задачи
  li.innerHTML = `
    <input type="checkbox" class="task-checkbox" ${isCompleted ? "checked" : ""}>
    <div class="task-content">
      <span class="task-date">${formattedDate}</span>
      <p class="task-text">${desc}</p>
    </div>
  `;

  // Вешаем обработчик события на чекбокс этой конкретной задачи
  const checkbox = li.querySelector(".task-checkbox");
  checkbox.addEventListener("change", function () {
    if (this.checked) {
      li.classList.add("completed");
    } else {
      li.classList.remove("completed");
    }
    saveTasksToLocalStorage(); // Обновляем базу данных в LocalStorage
    sortAndFilterTasks(); // Пересортировываем список на экране
  });

  taskList.appendChild(li);
}

// Функция загрузки данных при первом открытии сайта
function loadTasksFromLocalStorage() {
  taskList.innerHTML = "";
  const saved = localStorage.getItem("myTodoTasks");

  if (saved) {
    const tasks = JSON.parse(saved);
    tasks.forEach((task) => {
      // Отрендериваем задачу с ее порядковым номером
      createNewTaskDOM(task.id, task.desc, task.rawDate, task.completed);
    });
  }
  sortAndFilterTasks();
}

// =========================================================================
// 7. СОЗДАНИЕ НОВОЙ ЗАДАЧИ ЧЕРЕЗ МОДАЛЬНОЕ ОКНО
// =========================================================================
if (submitBtn) {
  submitBtn.addEventListener("click", () => {
    const descInput = document.getElementById("modalDesc");
    const reminderInput = document.getElementById("modalReminder");

    const desc = descInput.value.trim();
    const rawDate = visualDateInput.dataset.raw;

    // Валидация
    if (!desc) {
      alert("Пожалуйста, введите описание задачи");
      return;
    }
    if (!rawDate) {
      alert("Пожалуйста, выберите дату выполнения задачи");
      return;
    }

    // ВЫЧИСЛЯЕМ СЛЕДУЮЩИЙ ПОРЯДКОВЫЙ НОМЕР (ID)
    // Получаем значение счетчика из базы или ставим 0, если это самая первая задача на сайте
    let lastTaskId = Number(localStorage.getItem("lastTaskId")) || 0;
    // Увеличиваем счетчик на 1
    const newId = lastTaskId + 1;
    // Сохраняем обновленный счетчик обратно в память
    localStorage.setItem("lastTaskId", newId);

    // Создаем новую задачу на экране и передаем порядковый ID
    createNewTaskDOM(newId, desc, rawDate, false);
    saveTasksToLocalStorage();

    // Очистка полей модалки
    descInput.value = "";
    visualDateInput.value = "";
    visualDateInput.dataset.raw = "";
    hiddenDateInput.value = "";
    if (reminderInput) reminderInput.checked = false;

    closeModal();
    sortAndFilterTasks();
  });
}

// =========================================================================
// 8. ВЫВОД КРАСИВОЙ ТЕКУЩЕЙ ДАТЫ В ШАПКЕ САЙТА
// =========================================================================
function displayCurrentDate() {
  const dayElement = document.getElementById("current-day"); // Элемент для дня недели
  const dateElement = document.getElementById("current-date"); // Элемент для числа и месяца

  if (!dayElement || !dateElement) return;

  const now = new Date(); // Получаем текущее время компьютера

  // Извлекаем день недели текстом на русском языке
  const dayName = now.toLocaleDateString("ru-RU", { weekday: "long" });
  // Делаем первую букву дня недели заглавной ("Пятница")
  dayElement.innerText = dayName.charAt(0).toUpperCase() + dayName.slice(1);

  // Извлекаем число и название месяца ("11 сентября")
  const dateOptions = { day: "numeric", month: "long" };
  dateElement.innerText = now.toLocaleDateString("ru-RU", dateOptions);
}

// =========================================================================
// 9. ТОЧКА ВХОДА (СТАРТ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ)
// =========================================================================
displayCurrentDate(); // Рисуем текущую дату в шапку виджета
loadTasksFromLocalStorage(); // Выкачиваем и выстраиваем задачи из памяти браузера
