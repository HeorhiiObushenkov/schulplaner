const app = {
    // Temporary state for modal actions
    cache: {
        deletingClassId: null,
        deletingStudentId: null,
        deletingClassId: null,
        deletingStudentId: null,
        customLatenessStudentId: null,
        download: {
            months: [], // 0-11
            ignoredStudentIds: []
        }
    },

    handlers: {
        setView: (view) => {
            store.state.viewMode = view;
            app.init(); // Re-render
        },
        changeDate: (delta) => {
            const d = new Date(store.state.viewDate);
            if (store.state.viewMode === 'month') {
                d.setMonth(d.getMonth() + delta);
            } else {
                d.setDate(d.getDate() + delta);
            }
            store.state.viewDate = d;
            app.init();
        },
        openAddClassModal: () => {
            ui.nodes.inputClassName.value = '';
            ui.nodes.modalAddClass.showModal();
        },
        submitNewClass: () => {
            const name = ui.nodes.inputClassName.value;
            if (name) {
                store.addClass(name);
                app.init();
            }
        },
        selectClass: (id) => {
            store.state.selectedClassId = id;
            store.save(); // Save selection
            app.init();
        },

        // DELETE CLASS
        deleteClass: (e, id) => {
            e.stopPropagation();
            app.cache.deletingClassId = id;
            ui.nodes.modalDeleteClass.showModal();
        },
        confirmDeleteClass: () => {
            if (app.cache.deletingClassId) {
                store.deleteClass(app.cache.deletingClassId);
                app.cache.deletingClassId = null;
                app.init();
            }
        },

        // ADD STUDENT
        promptAddStudent: () => {
            ui.nodes.inputStudentName.value = '';
            ui.nodes.modalAddStudent.showModal();
        },
        submitNewStudent: () => {
            const name = ui.nodes.inputStudentName.value;
            if (name) {
                store.addStudent(store.state.selectedClassId, name);
                app.init({ animate: false });
            }
        },

        // DELETE STUDENT
        deleteStudent: (id) => {
            app.cache.deletingStudentId = id;
            ui.nodes.modalDeleteStudent.showModal();
        },
        confirmDeleteStudent: () => {
            if (app.cache.deletingStudentId) {
                store.removeStudent(store.state.selectedClassId, app.cache.deletingStudentId);
                app.cache.deletingStudentId = null;
                app.init({ animate: false });
            }
        },

        setLateness: (studentId, minutes) => {
            const dateKey = utils.formatDateKey(store.state.viewDate);
            store.toggleLateness(store.state.selectedClassId, studentId, dateKey, minutes);

            // Targeted update without full re-render
            const student = store.getSelectedClass().students.find(s => s.id === studentId);
            if (student) {
                ui.updateStudentCard(student);
            }
        },

        // CUSTOM LATENESS
        customLateness: (studentId) => {
            app.cache.customLatenessStudentId = studentId;
            ui.nodes.inputLatenessMinutes.value = '';
            ui.nodes.modalCustomLateness.showModal();
        },
        submitCustomLateness: () => {
            const min = ui.nodes.inputLatenessMinutes.value;
            const studentId = app.cache.customLatenessStudentId;

            if (min && !isNaN(min) && studentId) {
                app.handlers.setLateness(studentId, parseInt(min));
            }
        },

        // NEW: DOWNLOAD HANDLERS
        openDownloadModal: () => {
            const currentMonth = store.state.viewDate.getMonth();
            app.cache.download.months = [currentMonth]; // Default to current view month
            app.cache.download.ignoredStudentIds = [];

            const cls = store.getSelectedClass();
            if (!cls) return ui.showError("Bitte wähle eine Klasse aus.", "Export Fehler");

            ui.renderDownloadMonthGrid(app.cache.download.months);
            ui.renderDownloadStudentList(cls, []);
            ui.nodes.modalDownload.showModal();
        },

        toggleDownloadMonth: (monthIdx) => {
            const months = app.cache.download.months;
            const idx = months.indexOf(monthIdx);
            if (idx === -1) {
                months.push(monthIdx);
            } else {
                months.splice(idx, 1);
            }
            ui.renderDownloadMonthGrid(months);
        },

        toggleAllMonths: () => {
            app.cache.download.months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
            ui.renderDownloadMonthGrid(app.cache.download.months);
        },

        toggleDownloadStudent: (studentId) => {
            const ignored = app.cache.download.ignoredStudentIds;
            const idx = ignored.indexOf(studentId);
            if (idx === -1) {
                ignored.push(studentId);
            } else {
                ignored.splice(idx, 1);
            }
            const cls = store.getSelectedClass();
            ui.renderDownloadStudentList(cls, ignored);
        },

        submitDownload: () => {
            const { months, ignoredStudentIds } = app.cache.download;
            if (months.length === 0) {
                return ui.showError("Bitte wähle mindestens einen Monat aus.", "Kein Zeitraum");
            }
            app.handlers.exportPDF(months, ignoredStudentIds);
        },

        exportPDF: (selectedMonths, ignoredStudentIds) => {
            const cls = store.getSelectedClass();
            if (!cls) return ui.showError("Bitte wähle eine Klasse aus.", "Export Fehler");

            // Sort months to be sure
            selectedMonths.sort((a, b) => a - b);

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const year = store.state.viewDate.getFullYear();

            // Header
            doc.setFontSize(20);
            doc.text(`Verspätungsbericht: ${cls.name}`, 14, 22);
            doc.setFontSize(11);
            doc.setTextColor(100);

            // Format month range string
            const monthNames = selectedMonths.map(m => store.state.monthNames ? store.state.monthNames[m] : new Date(2000, m, 1).toLocaleString('de', { month: 'long' }));
            let timeString = `${year}`;
            if (selectedMonths.length === 12) {
                timeString += " (Gesamtes Jahr)";
            } else {
                timeString += `: ${monthNames.join(', ')}`;
            }

            // Wrap text if too long
            const timeLines = doc.splitTextToSize(timeString, 180);
            doc.text(timeLines, 14, 30);

            let startY = 30 + (timeLines.length * 5) + 5;

            // Prepare Data
            const tableData = [];

            cls.students.forEach(student => {
                // Skip ignored students
                if (ignoredStudentIds && ignoredStudentIds.includes(student.id)) return;

                Object.entries(student.records).forEach(([dateStr, mins]) => {
                    const recDate = new Date(dateStr);
                    if (recDate.getFullYear() === year && selectedMonths.includes(recDate.getMonth())) {
                        tableData.push([
                            utils.formatDateDisplay(recDate), // Use util for nice format
                            student.name,
                            `${mins} Min.`
                        ]);
                    }
                });
            });

            // Sort by date then student name
            tableData.sort((a, b) => {
                const dateA = new Date(a[0].split('.').reverse().join('-')); // Assuming DD.MM.YYYY
                const dateB = new Date(b[0].split('.').reverse().join('-'));
                // Use a simpler date parse if utils.formatDateDisplay returns German format
                // Actually let's just stick to reliable parsing. 
                // Since I used utils.formatDateDisplay, I should check what it returns.
                // Assuming standard date sorting on original data is safer but tableData strings are hard to sort.
                // Let's rely on the order of insertion if we iterate chronologically? 
                // Better: keep raw date for sorting.
                return 0;
            });

            // Re-sort properly
            // Let's rebuild tableData with raw objects first
            const rows = [];
            cls.students.forEach(student => {
                if (ignoredStudentIds && ignoredStudentIds.includes(student.id)) return;
                Object.entries(student.records).forEach(([dateStr, mins]) => {
                    const recDate = new Date(dateStr);
                    if (recDate.getFullYear() === year && selectedMonths.includes(recDate.getMonth())) {
                        rows.push({
                            rawDate: recDate,
                            dateStr: utils.formatDateDisplay(recDate),
                            name: student.name,
                            mins: `${mins} Min.`
                        });
                    }
                });
            });

            rows.sort((a, b) => a.rawDate - b.rawDate || a.name.localeCompare(b.name));

            const finalTableBody = rows.map(r => [r.dateStr, r.name, r.mins]);

            if (finalTableBody.length === 0) {
                // Close modal if open to show alert
                // But wait, submitDownload calls this. 
                // The modal stays open unless we close it? 
                // Native dialog form method="dialog" closes it on submit? 
                // No, I used a button with onclick, inside form method="dialog". 
                // That button submits the form and closes the dialog.
                // But I added e.preventDefault() in my logic? 
                // No, I didn't in submitDownload button HTML.
                // So the modal WILL close.

                // Let's verify: In HTML:
                // <button class="btn btn-primary..." onclick="app.handlers.submitDownload()">
                // It is inside <form method="dialog">.
                // Clicking it will submit the form and close the dialog, AND trigger onclick.
                // So the dialog closes.
                ui.showError("Keine Verspätungen für diesen Zeitraum gefunden.", "Leerer Bericht");
                return;
            }

            doc.autoTable({
                head: [['Datum', 'Schüler', 'Verspätung']],
                body: finalTableBody,
                startY: startY,
                theme: 'grid',
                styles: { font: 'helvetica', fontSize: 10 },
                headStyles: { fillColor: [66, 66, 66] }
            });

            doc.save(`Verspaetung_${cls.name}_${year}.pdf`);
        }
    },

    init: (options = { animate: true }) => {
        store.load();
        ui.init();
        ui.renderSidebar();
        ui.renderHeader();
        ui.renderContent();

        // Animation for cards
        if (options.animate) {
            anime({
                targets: '.animate-slide-up > div',
                translateY: [20, 0],
                opacity: [0, 1],
                delay: anime.stagger(50),
                easing: 'easeOutQuad',
                duration: 400
            });
        }
    }
};

window.app = app;
// Start
window.addEventListener('DOMContentLoaded', app.init);
