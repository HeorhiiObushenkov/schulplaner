const store = {
    state: {
        classes: [], // [{ id, name, students: [{ id, name, records: { '2023-01-01': 15 } }] }]
        selectedClassId: null,
        viewDate: new Date(),
        viewMode: 'day', // 'day', 'month'
    },

    // Updated load to be async and fetch from Supabase
    async load() {
        // 1. Load Local Fallback
        const saved = localStorage.getItem('student_tracker_data');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.state.classes = parsed.classes || [];
                store.state.selectedClassId = parsed.selectedClassId || null;
            } catch (e) { console.error("Failed to load local data", e); }
        }

        // 2. Fetch Remote (if online)
        const remoteData = await sb.fetchState();
        if (remoteData) {
            this.mergeState(remoteData);
        }
    },

    // Merge remote data into local state
    mergeState(remoteData) {
        if (!remoteData) return;

        // For simplicity in this version, Remote always wins if valid
        // But we try to preserve selectedClassId/viewMode from local session if possible
        const currentSelection = this.state.selectedClassId;
        const currentView = this.state.viewMode;

        this.state.classes = remoteData.classes || [];

        // Only override selection if it was null or invalid
        if (!currentSelection && remoteData.selectedClassId) {
            this.state.selectedClassId = remoteData.selectedClassId;
        }

        console.log("State merged from remote");
        // Update UI immediately
        if (window.app && window.app.render) window.app.render();
    },

    save() {
        // Local Save (Backup)
        const dataToSave = {
            classes: this.state.classes,
            selectedClassId: this.state.selectedClassId
        };
        localStorage.setItem('student_tracker_data', JSON.stringify(dataToSave));

        // Remote Save
        sb.saveState(dataToSave);
    },

    // ACTIONS
    addClass(name) {
        const newClass = {
            id: utils.generateId(),
            name: name,
            students: []
        };
        this.state.classes.push(newClass);
        this.state.selectedClassId = newClass.id;
        this.save();
        return newClass;
    },

    deleteClass(classId) {
        this.state.classes = this.state.classes.filter(c => c.id !== classId);
        if (this.state.selectedClassId === classId) {
            this.state.selectedClassId = this.state.classes.length > 0 ? this.state.classes[0].id : null;
        }
        this.save();
    },

    addStudent(classId, fullName) {
        const classItem = this.state.classes.find(c => c.id === classId);
        if (classItem && fullName.trim()) {
            classItem.students.push({
                id: utils.generateId(),
                name: fullName,
                records: {}
            });
            this.save();
        }
    },

    removeStudent(classId, studentId) {
        const classItem = this.state.classes.find(c => c.id === classId);
        if (classItem) {
            classItem.students = classItem.students.filter(s => s.id !== studentId);
            this.save();
        }
    },

    toggleLateness(classId, studentId, dateKey, minutes) {
        const classItem = this.state.classes.find(c => c.id === classId);
        if (!classItem) return;
        const student = classItem.students.find(s => s.id === studentId);
        if (!student) return;

        if (minutes > 0) {
            student.records[dateKey] = minutes;
        } else {
            delete student.records[dateKey];
        }
        this.save();
    },

    getSelectedClass() {
        return this.state.classes.find(c => c.id === this.state.selectedClassId);
    }
};

window.store = store;
