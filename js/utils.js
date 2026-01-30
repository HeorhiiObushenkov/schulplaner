const utils = {
    generateId: () => {
        return crypto.randomUUID();
    },
    formatDateKey: (date) => {
        return date.toISOString().split('T')[0];
    },
    formatDateDisplay: (date) => {
        return new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    },
    getMonthName: (date) => {
        return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(date);
    }
};

window.utils = utils;
