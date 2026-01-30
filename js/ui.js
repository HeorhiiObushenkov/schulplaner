const ui = {
    nodes: {
        classList: document.getElementById('classList'),
        contentArea: document.getElementById('contentArea'),
        viewTitle: document.getElementById('viewTitle'),
        currentDateDisplay: document.getElementById('currentDateDisplay'),

        // Modals
        modalAddClass: document.getElementById('modal_add_class'),
        modalAddStudent: document.getElementById('modal_add_student'),
        modalDeleteClass: document.getElementById('modal_delete_class'),
        modalDeleteStudent: document.getElementById('modal_delete_student'),
        modalCustomLateness: document.getElementById('modal_custom_lateness'),
        modalAlert: document.getElementById('modal_alert'),

        // Inputs
        inputClassName: document.getElementById('inputClassName'),
        inputStudentName: document.getElementById('inputStudentName'),
        inputLatenessMinutes: document.getElementById('inputLatenessMinutes'),

        // Alert Elements
        alertTitle: document.getElementById('alertTitle'),
        alertMessage: document.getElementById('alertMessage'),
    },

    init() {
        // Re-bind nodes
        this.nodes.classList = document.getElementById('classList');
        this.nodes.contentArea = document.getElementById('contentArea');
        this.nodes.viewTitle = document.getElementById('viewTitle');
        this.nodes.currentDateDisplay = document.getElementById('currentDateDisplay');

        this.nodes.modalAddClass = document.getElementById('modal_add_class');
        this.nodes.modalAddStudent = document.getElementById('modal_add_student');
        this.nodes.modalDeleteClass = document.getElementById('modal_delete_class');
        this.nodes.modalDeleteStudent = document.getElementById('modal_delete_student');
        this.nodes.modalCustomLateness = document.getElementById('modal_custom_lateness');
        this.nodes.modalDownload = document.getElementById('modal_download');
        this.nodes.modalAlert = document.getElementById('modal_alert');

        this.nodes.inputClassName = document.getElementById('inputClassName');
        this.nodes.inputStudentName = document.getElementById('inputStudentName');
        this.nodes.inputLatenessMinutes = document.getElementById('inputLatenessMinutes');

        this.nodes.alertTitle = document.getElementById('alertTitle');
        this.nodes.alertMessage = document.getElementById('alertMessage');
    },

    showError(msg, title = "Hinweis") {
        this.nodes.alertTitle.textContent = title;
        this.nodes.alertMessage.textContent = msg;
        this.nodes.modalAlert.showModal();
    },

    renderSidebar() {
        this.nodes.classList.innerHTML = '';
        store.state.classes.forEach(c => {
            const isActive = c.id === store.state.selectedClassId;
            const li = document.createElement('li');

            li.innerHTML = `
                <a href="#" class="${isActive ? 'active font-bold bg-primary text-primary-content' : 'text-base-content/70'} rounded-full flex justify-between group" onclick="app.handlers.selectClass('${c.id}')">
                    <span class="flex items-center gap-2">
                        <i data-lucide="users" class="w-4 h-4"></i>
                        ${c.name}
                    </span>
                    ${isActive ? '' : `<button class="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-100" onclick="app.handlers.deleteClass(event, '${c.id}')"><i data-lucide="trash-2" class="w-3 h-3 text-error"></i></button>`}
                </a>
            `;
            this.nodes.classList.appendChild(li);
        });
        lucide.createIcons();
    },

    renderHeader() {
        const date = store.state.viewDate;
        this.nodes.currentDateDisplay.textContent = utils.formatDateDisplay(date);

        const selectedClass = store.getSelectedClass();
        this.nodes.viewTitle.innerHTML = selectedClass
            ? `<span class="text-primary">${selectedClass.name}</span> <span class="text-base-content/30 text-lg font-normal">/ Übersicht</span>`
            : 'Willkommen';

        // Toggle view buttons state
        document.getElementById('btnViewDay').classList.toggle('btn-active', store.state.viewMode === 'day');
        document.getElementById('btnViewMonth').classList.toggle('btn-active', store.state.viewMode === 'month');
    },

    renderContent() {
        const selectedClass = store.getSelectedClass();
        const content = this.nodes.contentArea;

        // Preserve scroll position
        const scrollPos = content.scrollTop;

        content.innerHTML = '';

        if (!selectedClass) {
            content.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-base-content/50 animate-fade-in">
                    <i data-lucide="layout-grid" class="w-16 h-16 mb-4 opacity-50 text-primary"></i>
                    <p class="text-lg">Bitte wähle eine Klasse aus oder erstelle eine neue.</p>
                    <button onclick="app.handlers.openAddClassModal()" class="btn btn-primary btn-sm mt-4 rounded-full">Klasse erstellen</button>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        if (store.state.viewMode === 'day') {
            this.renderDayView(selectedClass);
        } else {
            this.renderMonthView(selectedClass);
        }
        lucide.createIcons();

        // Restore scroll position
        if (scrollPos > 0) {
            content.scrollTop = scrollPos;
        }
    },

    renderDayView(cls) {
        const dateKey = utils.formatDateKey(store.state.viewDate);
        const container = document.createElement('div');
        container.className = "w-full max-w-4xl mx-auto space-y-4 animate-slide-up";

        // Add Student Button
        const addStudentBtn = document.createElement('div');
        addStudentBtn.className = "flex justify-end mb-4";
        addStudentBtn.innerHTML = `
            <button onclick="app.handlers.promptAddStudent()" class="btn btn-primary rounded-full gap-2 shadow-none hover:scale-105 transition-transform">
                <i data-lucide="user-plus" class="w-4 h-4"></i> Schüler hinzufügen
            </button>
        `;
        container.appendChild(addStudentBtn);

        if (cls.students.length === 0) {
            container.innerHTML += `
                <div class="text-center p-10 border border-dashed border-base-300 rounded-box text-base-content/50">
                    Keine Schüler in dieser Klasse.
                </div>
            `;
        } else {
            const grid = document.createElement('div');
            grid.className = "grid grid-cols-1 md:grid-cols-2 gap-4";

            cls.students.forEach(student => {
                const card = document.createElement('div');
                card.id = `student-card-${student.id}`; // UNIQUE ID
                this.renderStudentCardContent(card, student, dateKey); // Use helper
                grid.appendChild(card);
            });
            container.appendChild(grid);
        }

        this.nodes.contentArea.appendChild(container);
    },

    // NEW HELPER: Renders inner HTML of a student card
    renderStudentCardContent(cardElement, student, dateKey) {
        const lateness = student.records[dateKey] || 0;
        const isLate = lateness > 0;

        cardElement.className = `p-4 rounded-box border ${isLate ? 'border-error/20 bg-error/5' : 'border-base-300 bg-base-100'} flex items-center justify-between transition-all-custom group hover:border-primary/50`;

        cardElement.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full ${isLate ? 'bg-error/10 text-error' : 'bg-base-200 text-base-content/70'} flex items-center justify-center text-lg font-bold">
                    ${student.name.charAt(0)}
                </div>
                <div>
                    <div class="font-semibold text-lg leading-tight">${student.name}</div>
                    <div class="text-xs ${isLate ? 'text-error font-bold' : 'text-base-content/50'}">
                        ${isLate ? `${lateness} Min. verspätet` : 'Pünktlich'}
                    </div>
                </div>
            </div>
            
            <div class="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="app.handlers.setLateness('${student.id}', 0)" class="btn btn-xs btn-circle ${!isLate ? 'btn-success text-white' : 'btn-ghost text-base-content/30'}" title="Pünktlich">
                    <i data-lucide="check" class="w-3 h-3"></i>
                </button>
                <div class="join border border-base-300 rounded-full p-0.5 bg-base-100">
                    <button onclick="app.handlers.setLateness('${student.id}', 5)" class="join-item btn btn-xs btn-ghost hover:bg-error/10 hover:text-error px-2">5</button>
                    <button onclick="app.handlers.setLateness('${student.id}', 10)" class="join-item btn btn-xs btn-ghost hover:bg-error/10 hover:text-error px-2">10</button>
                    <button onclick="app.handlers.setLateness('${student.id}', 15)" class="join-item btn btn-xs btn-ghost hover:bg-error/10 hover:text-error px-2">15</button>
                    <button onclick="app.handlers.customLateness('${student.id}')" class="join-item btn btn-xs btn-ghost hover:bg-error/10 hover:text-error px-2">...</button>
                </div>
                <button onclick="app.handlers.deleteStudent('${student.id}')" class="btn btn-xs btn-ghost btn-circle text-base-content/30 hover:text-error">
                    <i data-lucide="x" class="w-3 h-3"></i>
                </button>
            </div>
        `;
    },

    // NEW METHOD: Targeted update
    updateStudentCard(student) {
        const card = document.getElementById(`student-card-${student.id}`);
        if (card) {
            const dateKey = utils.formatDateKey(store.state.viewDate);
            this.renderStudentCardContent(card, student, dateKey);
            lucide.createIcons();
        }
    },

    renderMonthView(cls) {
        const date = store.state.viewDate;
        const year = date.getFullYear();
        const month = date.getMonth();

        // Calendar Logic
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Mon=0

        const container = document.createElement('div');
        container.className = "w-full max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col animate-scale-in";

        // Month Grid Header
        const gridHeader = document.createElement('div');
        gridHeader.className = "grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold opacity-50 uppercase tracking-widest";
        ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].forEach(day => {
            gridHeader.innerHTML += `<div>${day}</div>`;
        });
        container.appendChild(gridHeader);

        // Grid
        const grid = document.createElement('div');
        grid.className = "grid grid-cols-7 gap-2 flex-1 auto-rows-fr";

        // Empty slots
        for (let i = 0; i < startingDay; i++) {
            grid.innerHTML += `<div></div>`;
        }

        // Days
        for (let d = 1; d <= daysInMonth; d++) {
            const currentDayDate = new Date(year, month, d);
            const dateKey = utils.formatDateKey(currentDayDate);

            // Calculate stats for this day
            let lateCount = 0;
            cls.students.forEach(s => {
                if (s.records[dateKey]) lateCount++;
            });

            const isToday = utils.formatDateKey(new Date()) === dateKey;

            const dayCell = document.createElement('button');
            dayCell.className = `
                relative rounded-box border border-base-300 p-2 flex flex-col items-start justify-between
                hover:border-primary hover:shadow-sm transition-all text-left bg-base-100
                ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-200' : ''}
            `;
            dayCell.onclick = () => {
                store.state.viewDate = currentDayDate;
                app.handlers.setView('day');
            };

            dayCell.innerHTML = `
                <span class="text-lg font-bold ${isToday ? 'text-primary' : ''}">${d}</span>
                ${lateCount > 0 ? `
                    <div class="badge badge-error badge-sm gap-1 w-full mt-1">
                        <i data-lucide="clock" class="w-3 h-3"></i> ${lateCount}
                    </div>
                ` : ''}
            `;
            grid.appendChild(dayCell);
        }

        container.appendChild(grid);
        this.nodes.contentArea.appendChild(container); // Fixed: was missing appending to contentArea
    },

    // NEW: Download Modal Render Helpers
    renderDownloadMonthGrid(selectedMonths) {
        const grid = document.getElementById('downloadMonthGrid');
        grid.innerHTML = '';
        const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

        months.forEach((m, idx) => {
            const isSelected = selectedMonths.includes(idx);
            const btn = document.createElement('button');
            btn.className = `btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline border-base-300 text-base-content/50 hover:bg-base-200 hover:text-base-content'} rounded-btn`;
            btn.textContent = m;
            btn.onclick = (e) => {
                e.preventDefault(); // Prevent form submit
                app.handlers.toggleDownloadMonth(idx);
            };
            grid.appendChild(btn);
        });
    },

    renderDownloadStudentList(cls, ignoredStudentIds) {
        const list = document.getElementById('downloadStudentList');
        const countSpan = document.getElementById('downloadStudentCount');
        list.innerHTML = '';

        const total = cls.students.length;
        const active = total - ignoredStudentIds.length;
        countSpan.textContent = active === total ? "Alle" : `${active} von ${total}`;

        cls.students.forEach(student => {
            const isIgnored = ignoredStudentIds.includes(student.id);
            const label = document.createElement('label');
            label.className = "label cursor-pointer justify-start gap-4 hover:bg-base-200 rounded-lg px-2 -mx-2";
            label.innerHTML = `
                <input type="checkbox" class="checkbox checkbox-primary checkbox-sm" 
                    ${!isIgnored ? 'checked' : ''} 
                    onchange="app.handlers.toggleDownloadStudent('${student.id}')" />
                <span class="label-text font-medium ${isIgnored ? 'opacity-50 line-through' : ''}">${student.name}</span>
            `;
            list.appendChild(label);
        });
    }
};

window.ui = ui;
