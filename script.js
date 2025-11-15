// DOM elements
const input = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const list = document.getElementById('todo-list');
const themeToggleBtn = document.getElementById('theme-toggle');
const categorySelect = document.getElementById('category-select');
const searchInput = document.getElementById('search-input');
const statsFooter = document.getElementById('stats-footer');
const statsText = document.getElementById('stats-text');
const clearCompletedBtn = document.getElementById('clear-completed');

// Sounds (simple SFX from free CDNs)
const addSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-soft-quick-slide-click-2587.mp3');
const completeSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-game-ball-tap-2073.mp3');
const deleteSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-paper-fast-scrunch-1461.mp3');

// Load todos
const saved = localStorage.getItem('todos');
const todos = saved ? JSON.parse(saved) : [];

// Normalise old data (in case it doesn't have id/category)
for (let i = 0; i < todos.length; i++) {
    const t = todos[i];
    if (t.id == null) t.id = Date.now() + i;
    if (!t.category) t.category = 'general';
}

// Search query
let searchQuery = "";

// Save todos
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// Create inline edit field
function enableInlineEdit(textSpan, todo, li) {
    const current = todo.text;
    const inputEdit = document.createElement('input');
    inputEdit.type = 'text';
    inputEdit.value = current;
    inputEdit.className = 'edit-input';

    // Replace span with input
    li.replaceChild(inputEdit, textSpan);
    inputEdit.focus();
    inputEdit.select();

    const commit = () => {
        const newValue = inputEdit.value.trim();
        if (newValue) {
            todo.text = newValue;
        }
        const newSpan = buildTextSpan(todo);
        li.replaceChild(newSpan, inputEdit);
        saveTodos();
    };

    const cancel = () => {
        const newSpan = buildTextSpan(todo);
        li.replaceChild(newSpan, inputEdit);
    };

    inputEdit.addEventListener('keydown', e => {
        if (e.key === 'Enter') commit();
        else if (e.key === 'Escape') cancel();
    });

    inputEdit.addEventListener('blur', commit);
}

// Build text span (for reuse)
function buildTextSpan(todo) {
    const textSpan = document.createElement('span');
    textSpan.textContent = todo.text;
    textSpan.className = 'todo-text';
    textSpan.style.margin = '0 4px';

    textSpan.addEventListener('dblclick', () => {
        const li = textSpan.closest('li');
        if (li) enableInlineEdit(textSpan, todo, li);
    });

    return textSpan;
}

let draggedId = null;

// Create a DOM node for a todo object
function createTodoNode(todo, index) {
    const li = document.createElement('li');
    li.dataset.id = todo.id;
    li.draggable = true;

    if (todo.completed) li.classList.add('completed');

    // checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!todo.completed;

    checkbox.addEventListener("change", () => {
        todo.completed = checkbox.checked;
        if (todo.completed) {
            li.classList.add('completed');
        } else {
            li.classList.remove('completed');
        }
        try { completeSound.currentTime = 0; completeSound.play(); } catch {}
        saveTodos();
        updateStats();
    });

    // text
    const textSpan = buildTextSpan(todo);
    if (todo.completed) {
        textSpan.style.textDecoration = 'line-through';
    }

    // category pill
    const pill = document.createElement('span');
    pill.className = `category-pill category-${todo.category}`;
    pill.textContent = todo.category;

    // delete
    const delBtn = document.createElement('button');
    delBtn.textContent = "Delete";
    delBtn.className = 'todo-delete';
    delBtn.addEventListener('click', () => {
        for (let i = todos.length - 1; i >= 0; i--) {
            if (todos[i].id === todo.id) {
                todos.splice(i, 1);
                break;
            }
        }
        try { deleteSound.currentTime = 0; deleteSound.play(); } catch {}
        render();
        saveTodos();
    });

    // Drag events
    li.addEventListener('dragstart', () => {
        draggedId = todo.id;
        li.classList.add('dragging');
    });

    li.addEventListener('dragend', () => {
        draggedId = null;
        li.classList.remove('dragging');
        li.classList.remove('drag-over');
    });

    li.addEventListener('dragover', e => {
        e.preventDefault();
        if (!draggedId || draggedId === todo.id) return;
        li.classList.add('drag-over');
    });

    li.addEventListener('dragleave', () => {
        li.classList.remove('drag-over');
    });

    li.addEventListener('drop', e => {
        e.preventDefault();
        li.classList.remove('drag-over');
        if (!draggedId || draggedId === todo.id) return;

        const fromIndex = todos.findIndex(t => t.id === draggedId);
        const toIndex = todos.findIndex(t => t.id === todo.id);
        if (fromIndex === -1 || toIndex === -1) return;

        const [moved] = todos.splice(fromIndex, 1);
        todos.splice(toIndex, 0, moved);
        render();
        saveTodos();
    });

    li.appendChild(checkbox);
    li.appendChild(textSpan);
    li.appendChild(pill);
    li.appendChild(delBtn);
    return li;
}

// Render list
function render() {
    list.innerHTML = '';

    if (todos.length === 0) {
        list.classList.remove('show');
        list.style.display = 'none';
        statsFooter.style.display = 'none';
        return;
    }

    list.style.display = 'block';

    const query = searchQuery.toLowerCase().trim();
    const filtered = todos.filter(todo => {
        if (!query) return true;
        return (
            todo.text.toLowerCase().includes(query) ||
            todo.category.toLowerCase().includes(query)
        );
    });

    if (filtered.length === 0) {
        const msg = document.createElement('li');
        msg.textContent = 'No tasks match your search.';
        msg.className = 'empty-message';
        list.appendChild(msg);
    } else {
        filtered.forEach((todo, index) => {
            const node = createTodoNode(todo, index);
            list.appendChild(node);
        });
    }

    // trigger fade in
    requestAnimationFrame(() => list.classList.add('show'));

    updateStats();
}

// Update stats footer
function updateStats() {
    if (todos.length === 0) {
        statsFooter.style.display = 'none';
        return;
    }
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const active = total - completed;

    statsText.textContent = `${active} active • ${completed} completed • ${total} total`;
    statsFooter.style.display = 'flex';
}

// Add todo
function addTodo() {
    const text = input.value.trim();
    if (!text) return;

    const category = categorySelect.value || 'general';

    todos.push({
        id: Date.now(),
        text,
        completed: false,
        category
    });

    input.value = '';
    try { addSound.currentTime = 0; addSound.play(); } catch {}
    render();
    saveTodos();
}

// Events
addBtn.addEventListener("click", addTodo);

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    render();
});

clearCompletedBtn.addEventListener('click', () => {
    for (let i = todos.length - 1; i >= 0; i--) {
        if (todos[i].completed) todos.splice(i, 1);
    }
    render();
    saveTodos();
});

// ---------- THEME TOGGLING ----------
const THEME_KEY = 'todo-theme';

function applyTheme(theme) {
    document.body.classList.remove('theme-glass', 'theme-notebook');

    if (theme === 'notebook') {
        document.body.classList.add('theme-notebook');
        themeToggleBtn.textContent = '❄';
        themeToggleBtn.setAttribute('aria-label', 'Switch to glass theme');
        themeToggleBtn.setAttribute('title', 'Switch to glass theme');
    } else {
        document.body.classList.add('theme-glass');
        themeToggleBtn.textContent = '✎';
        themeToggleBtn.setAttribute('aria-label', 'Switch to notebook theme');
        themeToggleBtn.setAttribute('title', 'Switch to notebook theme');
        theme = 'glass';
    }

    localStorage.setItem(THEME_KEY, theme);
}

const savedTheme = localStorage.getItem(THEME_KEY) || 'glass';
applyTheme(savedTheme);

themeToggleBtn.addEventListener('click', () => {
    const current = document.body.classList.contains('theme-glass') ? 'glass' : 'notebook';
    const next = current === 'glass' ? 'notebook' : 'glass';
    applyTheme(next);
});

// Initial render
render();
