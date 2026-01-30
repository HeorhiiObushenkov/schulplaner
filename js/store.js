const store = {
    state: {
        classes: [], // [{ id, name, students: [{ id, name, records: { '2023-01-01': 15 } }] }]
        selectedClassId: null,
        viewDate: new Date(),
        viewMode: 'day', // 'day', 'month'
    },

    load() {
        const saved = localStorage.getItem('student_tracker_data');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.state.classes = parsed.classes || [];
                store.state.selectedClassId = parsed.selectedClassId || null;
                // Re-instantiate dates if needed, but strings work for keys
            } catch (e) {
                console.error("Failed to load data", e);
            }
        }
    },

    save() {
        const dataToSave = {
            classes: this.state.classes,
            selectedClassId: this.state.selectedClassId
        };
        localStorage.setItem('student_tracker_data', JSON.stringify(dataToSave));
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
