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

    updateHash: () => {
        const state = store.state;
        if (!state.selectedClassId) {
            // If no class selected, we might clear hash or keep it minimal
            // But usually we want to preserve view/date even if class is lost? 
            // Actually, if no class is selected, the app shows "Select a class".
            history.replaceState(null, null, ' ');
            return;
        }

        const params = new URLSearchParams();
        params.set('class', state.selectedClassId);
        params.set('view', state.viewMode);
        params.set('date', utils.formatDateKey(state.viewDate)); // YYYY-MM-DD

        window.location.hash = params.toString();
    },

    loadFromHash: () => {
        const hash = window.location.hash.slice(1); // remove #
        if (!hash) return false;

        const params = new URLSearchParams(hash);
        const classId = params.get('class');
        const view = params.get('view');
        const dateStr = params.get('date');

        let changed = false;

        // Restore Class
        if (classId) {
            // check if class exists
            const cls = store.state.classes.find(c => c.id === classId);
            if (cls) {
                store.state.selectedClassId = classId;
                changed = true;
            }
        }

        // Restore View
        if (view && ['day', 'month'].includes(view)) {
            store.state.viewMode = view;
            changed = true;
        }

        // Restore Date
        if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                store.state.viewDate = d;
                changed = true;
            }
        }

        return changed;
    },

    handlers: {
        submitLogin: async () => {
            const name = ui.nodes.inputLoginName.value;
            const pass = ui.nodes.inputLoginPassword.value;

            ui.nodes.loginError.classList.add('hidden');

            if (!name || !pass) return;

            const success = await sb.login(name, pass);
            if (success) {
                ui.nodes.modalLogin.close();
                app.init(); // Restart init to load data
            } else {
                ui.nodes.loginError.classList.remove('hidden');
            }
        },

        setView: (view) => {
            store.state.viewMode = view;
            app.updateHash();
            app.init({ animate: false }); // No full reload animation needed usually, but ok
        },
        changeDate: (delta) => {
            const d = new Date(store.state.viewDate);
            if (store.state.viewMode === 'month') {
                d.setMonth(d.getMonth() + delta);
            } else {
                d.setDate(d.getDate() + delta);
            }
            store.state.viewDate = d;
            app.updateHash();
            app.init({ animate: false });
        },
        openAddClassModal: () => {
            ui.nodes.inputClassName.value = '';
            ui.nodes.modalAddClass.showModal();
        },
        submitNewClass: () => {
            const name = ui.nodes.inputClassName.value;
            if (name) {
                store.addClass(name);
                app.updateHash(); // logic in store.addClass sets selectedClassId
                app.init();
            }
        },
        selectClass: (id) => {
            store.state.selectedClassId = id;
            store.save(); // Save selection to localstorage (backup)
            app.updateHash();
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
                app.updateHash(); // might clear hash if no class left
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
            const includeSummary = document.getElementById('toggleDownloadSummary').checked;
            app.handlers.exportPDF(months, ignoredStudentIds, includeSummary);
        },

        exportPDF: (selectedMonths, ignoredStudentIds, includeSummary) => {
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

            // Prepare Data for Detail Table
            const rows = [];

            // Prepare Data for Summary Table
            const summaryMap = new Map(); // studentId -> totalMinutes

            cls.students.forEach(student => {
                if (ignoredStudentIds && ignoredStudentIds.includes(student.id)) return;

                let studentTotal = 0;

                Object.entries(student.records).forEach(([dateStr, mins]) => {
                    const recDate = new Date(dateStr);
                    if (recDate.getFullYear() === year && selectedMonths.includes(recDate.getMonth())) {
                        rows.push({
                            rawDate: recDate,
                            dateStr: utils.formatDateDisplay(recDate),
                            name: student.name,
                            mins: `${mins} Min.`
                        });
                        studentTotal += mins;
                    }
                });

                if (includeSummary) {
                    summaryMap.set(student.name, studentTotal); // Use name for simple map, or id if name conflict pos
                }
            });

            rows.sort((a, b) => a.rawDate - b.rawDate || a.name.localeCompare(b.name));

            const finalTableBody = rows.map(r => [r.dateStr, r.name, r.mins]);

            if (finalTableBody.length === 0) {
                ui.showError("Keine Verspätungen für diesen Zeitraum gefunden.", "Leerer Bericht");
                return;
            }

            // Draw Detail Table
            doc.autoTable({
                head: [['Datum', 'Schüler', 'Verspätung']],
                body: finalTableBody,
                startY: startY,
                theme: 'grid',
                styles: { font: 'helvetica', fontSize: 10 },
                headStyles: { fillColor: [66, 66, 66] }
            });

            // Draw Summary Table if requested
            if (includeSummary) {
                const summaryBody = Array.from(summaryMap.entries())
                    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) // Descending time, then Alpha
                    .map(([name, total]) => [name, `${total} Min.`]);

                const finalY = doc.lastAutoTable.finalY || startY; // Get end of previous table

                // Check space? autoTable does page break auto.
                // Title for Summary

                // Add some spacing
                let summaryStartY = finalY + 15;

                // Simple check if we are near end of page, force new page? 
                // A4 height ~297mm. If > 250, maybe new page? 
                if (summaryStartY > 270) {
                    doc.addPage();
                    summaryStartY = 20;
                }

                doc.setFontSize(14);
                doc.setTextColor(0);
                doc.text("Zusammenfassung (Gesamtzeit)", 14, summaryStartY - 5);

                doc.autoTable({
                    head: [['Schüler', 'Gesamtzeit']],
                    body: summaryBody,
                    startY: summaryStartY,
                    theme: 'grid',
                    styles: { font: 'helvetica', fontSize: 10 },
                    headStyles: { fillColor: [100, 100, 100] } // Slightly different color maybe?
                });
            }

            doc.save(`Verspaetung_${cls.name}_${year}.pdf`);
        }
    },

    init: async (options = { animate: true }) => {
        ui.init();
        sb.init();

        // 1. Auth Check
        if (!sb.currentUser) {
            ui.nodes.modalLogin.showModal();
            return;
        }

        // 2. Load Data (Async)
        // Only load if we haven't already (or force reload). 
        // But for init, we definitely want to load.
        await store.load();

        // 3. Realtime Subscription
        sb.subscribe((remoteData) => {
            store.mergeState(remoteData);
        });

        // NEW: Load state from URL hash if present
        app.loadFromHash();

        app.render({ animate: options.animate });
    },

    render: (options = { animate: false }) => {
        ui.renderSidebar();
        ui.renderHeader();
        ui.renderContent();

        // Update hash
        if (store.state.selectedClassId) {
            app.updateHash();
        }

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
window.addEventListener('DOMContentLoaded', () => app.init());
