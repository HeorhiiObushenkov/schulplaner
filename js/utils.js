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
    },
    hashPassword: async (password) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hash));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
};

window.utils = utils;
