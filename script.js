
const STORE_KEY = 'taskly_tasks_v1';
const PROFILE_KEY = 'taskly_profile_v1';
const THEME_KEY = 'taskly_theme_v1';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

function getTasks() {
    try {
        return JSON.parse(localStorage.getItem(STORE_KEY)) || [];
    } catch {                                                                                                   
        return [];
    }
}

function saveTasks(tasks) {
    localStorage.setItem(STORE_KEY, JSON.stringify(tasks));
}

function getProfile() {
    try {
        return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {
            name: 'Your Name',
            email: 'you@example.com'
        };
    } catch {
        return {
            name: 'Your Name',
            email: 'you@example.com'
        };
    }
}

function saveProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// Theme settings
function applyTheme() {
    document.body.classList.toggle(
        'dark',
        localStorage.getItem(THEME_KEY) === 'dark'
    );

    $$('.theme-btn').forEach(button => {
        button.textContent = document.body.classList.contains('dark')
            ? '☀️ Light'
            : '🌙 Dark';
    });
}

function initTheme() {
    applyTheme();

    $$('.theme-btn').forEach(button => {
        button.addEventListener('click', () => {
            localStorage.setItem(
                THEME_KEY,
                document.body.classList.contains('dark')
                    ? 'light'
                    : 'dark'
            );

            applyTheme();
        });
    });
}

// Security and formatting helpers
function escapeHtml(s = '') {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

function dateLabel(d) {
    if (!d) return '';

    return new Date(d + 'T00:00:00').toLocaleDateString(
        undefined,
        {
            month: 'short',
            day: 'numeric'
        }
    );
}

// Update task counters
function updateStats() {
    const tasks = getTasks();
    const done = tasks.filter(task => task.completed).length;

    const map = {
        total: tasks.length,
        pending: tasks.length - done,
        completed: done
    };

    Object.entries(map).forEach(([key, value]) => {
        $$(`[data-count="${key}"]`).forEach(element => {
            element.textContent = value;
        });
    });
}

// Create the HTML for one task
function taskMarkup(task) {
    return `
        <div class="task-row">
            <input
                aria-label="Mark ${escapeHtml(task.title)} completed"
                type="checkbox"
                data-complete="${task.id}"
                ${task.completed ? 'checked' : ''}
            >

            <div class="task-main">
                <div class="task-title ${task.completed ? 'done' : ''}">
                    ${escapeHtml(task.title)}
                </div>

                ${
                    task.due
                        ? `<div class="task-date">
                               Due: ${escapeHtml(dateLabel(task.due))}
                           </div>`
                        : ''
                }
            </div>

            <span class="status ${task.completed ? 'done' : ''}">
                ${task.completed ? 'Completed' : 'Pending'}
            </span>

            <div class="task-actions">
                <button
                    class="icon-btn"
                    data-edit="${task.id}"
                    aria-label="Edit task"
                >
                    ✏️
                </button>

                <button
                    class="icon-btn"
                    data-delete="${task.id}"
                    aria-label="Delete task"
                >
                    🗑️
                </button>
            </div>
        </div>
    `;
}

// Display and filter tasks
function renderTaskList(target, opts = {}) {
    const box = $(target);

    if (!box) return;

    let tasks = getTasks();

    const query = (opts.query || '').trim().toLowerCase();

    if (query) {
        tasks = tasks.filter(task =>
            task.title.toLowerCase().includes(query)
        );
    }

    if (opts.filter === 'pending') {
        tasks = tasks.filter(task => !task.completed);
    }

    if (opts.filter === 'completed') {
        tasks = tasks.filter(task => task.completed);
    }

    box.innerHTML = tasks.length
        ? tasks.map(taskMarkup).join('')
        : '<div class="empty">No tasks found. Add a task to get started!</div>';

    updateStats();
    bindTaskActions(box);
}

// Handle task buttons and checkboxes
function bindTaskActions(box) {
    $$('[data-complete]', box).forEach(element => {
        element.addEventListener('change', () => {
            const tasks = getTasks();

            const task = tasks.find(
                item => item.id === element.dataset.complete
            );

            if (task) {
                task.completed = element.checked;
                saveTasks(tasks);
                refreshLists();
            }
        });
    });

    $$('[data-delete]', box).forEach(element => {
        element.addEventListener('click', () => {
            const tasks = getTasks().filter(
                task => task.id !== element.dataset.delete
            );

            saveTasks(tasks);
            refreshLists();
            showToast('Task deleted.');
        });
    });

    $$('[data-edit]', box).forEach(element => {
        element.addEventListener('click', () => {
            const task = getTasks().find(
                item => item.id === element.dataset.edit
            );

            if (task) {
                location.href =
                    'add-task.html?id=' + encodeURIComponent(task.id);
            }
        });
    });
}

// Refresh task lists and counters
function refreshLists() {
    renderTaskList('#task-list', {
        query: $('#task-search')?.value || '',
        filter: $('.filter-btn.active')?.dataset.filter || 'all'
    });

    renderTaskList('#recent-list', {
        filter: 'all'
    });

    updateStats();
}

// Display a message
function showToast(message) {
    const toast = $('#toast');

    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }
}

// Dashboard page
function initDashboard() {
    renderTaskList('#recent-list');

    const add = $('#dashboard-add');

    if (add) {
        add.addEventListener('click', () => {
            location.href = 'add-task.html';
        });
    }
}

// Tasks page
function initTasksPage() {
    let filter = 'all';

    const search = $('#task-search');

    $$('.filter-btn').forEach(button => {
        button.addEventListener('click', () => {
            $$('.filter-btn').forEach(item => {
                item.classList.remove('active');
            });

            button.classList.add('active');
            filter = button.dataset.filter;

            renderTaskList('#task-list', {
                query: search.value,
                filter
            });
        });
    });

    search?.addEventListener('input', () => {
        renderTaskList('#task-list', {
            query: search.value,
            filter
        });
    });

    $('#add-task-btn')?.addEventListener('click', () => {
        location.href = 'add-task.html';
    });

    renderTaskList('#task-list');
}

// Add and edit task form
function initTaskForm() {
    const form = $('#task-form');

    if (!form) return;

    const params = new URLSearchParams(location.search);
    const id = params.get('id');

    const existing = getTasks().find(task => task.id === id);

    if (existing) {
        $('#form-heading').textContent = 'Edit Task';
        $('#task-title').value = existing.title;
        $('#task-due').value = existing.due || '';
        $('#task-completed').checked = existing.completed;
        $('#save-task').textContent = 'Save Changes';
    }

    form.addEventListener('submit', event => {
        event.preventDefault();

        const title = $('#task-title').value.trim();

        if (!title) {
            $('#task-title').focus();
            return;
        }

        const tasks = getTasks();

        if (existing) {
            const task = tasks.find(item => item.id === id);

            if (task) {
                task.title = title;
                task.due = $('#task-due').value;
                task.completed = $('#task-completed').checked;
            }
        } else {
            tasks.unshift({
                id: crypto.randomUUID
                    ? crypto.randomUUID()
                    : String(Date.now()),
                title,
                due: $('#task-due').value,
                completed: $('#task-completed').checked,
                createdAt: new Date().toISOString()
            });
        }

        saveTasks(tasks);
        location.href = 'tasks.html';
    });
}

// Account and profile settings
function initAccount() {
    const profile = getProfile();

    if ($('#profile-name')) {
        $('#profile-name').value = profile.name;
    }

    if ($('#profile-email')) {
        $('#profile-email').value = profile.email;
    }

    if ($('#profile-initials')) {
        $('#profile-initials').textContent = (
            profile.name || 'Y'
        )
            .trim()
            .split(/\s+/)
            .map(name => name[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
    }

    const form = $('#profile-form');

    form?.addEventListener('submit', event => {
        event.preventDefault();

        const name = $('#profile-name').value.trim();
        const email = $('#profile-email').value.trim();

        if (!name || !email) {
            showToast('Please enter your name and email.');
            return;
        }

        saveProfile({ name, email });

        $('#profile-initials').textContent = name
            .trim()
            .split(/\s+/)
            .map(part => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

        showToast('Profile saved on this device.');
    });

    $('#password-form')?.addEventListener('submit', event => {
        event.preventDefault();

        showToast(
            'Demo only: connect a secure login system to change passwords.'
        );

        event.target.reset();
    });
}

// Start the website
document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    const profile = getProfile();

    $$('[data-user-name]').forEach(element => {
        element.textContent = profile.name;
    });

    updateStats();
    initDashboard();
    initTasksPage();
    initTaskForm();
    initAccount();
});
