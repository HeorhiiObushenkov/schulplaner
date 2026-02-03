const sb = {
    client: null,
    channel: null,
    currentUser: null,

    // Status
    isOnline: false,

    init: () => {
        if (!window.supabase) {
            console.error("Supabase library not loaded");
            return;
        }
        if (sb.client) return; // Singleton check
        sb.client = supabase.createClient(config.supabaseUrl, config.supabaseKey, {
            auth: {
                persistSession: true,
                storageKey: 'tracker_auth_token' // Custom key to avoid collisions
            }
        });

        // Check local Auth
        const savedUser = localStorage.getItem('tracker_user');
        if (savedUser) {
            try {
                sb.currentUser = JSON.parse(savedUser);
            } catch (e) { localStorage.removeItem('tracker_user'); }
        }
    },

    login: async (name, password) => {
        const hash = await utils.hashPassword(password);

        // Call Server-Side Verification
        const { data: isValid, error } = await sb.client.rpc('verify_teacher_secret', { input_hash: hash });

        if (error) {
            console.error("Auth Error:", error);
            return false;
        }

        if (isValid) {
            sb.currentUser = { name, loggedInAt: new Date() };
            localStorage.setItem('tracker_user', JSON.stringify(sb.currentUser));
            return true;
        }
        return false;
    },

    logout: () => {
        sb.currentUser = null;
        localStorage.removeItem('tracker_user');
        location.reload();
    },

    // --- DATA SYNC ---

    fetchState: async () => {
        if (!sb.client) return null;

        const { data, error } = await sb.client
            .from('tracker_state')
            .select('*')
            .eq('id', 1)
            .single();

        if (error) {
            console.error("Supabase Fetch Error:", error);
            ui.setSyncStatus('offline');
            return null;
        }

        ui.setSyncStatus('online');
        return data ? data.data : null; // data.data is the JSON payload
    },

    saveState: async (stateData) => {
        if (!sb.client || !sb.currentUser) return;

        ui.setSyncStatus('syncing');

        const { error } = await sb.client
            .from('tracker_state')
            .update({
                data: stateData,
                last_updated_at: new Date(),
                last_updated_by: sb.currentUser.name
            })
            .eq('id', 1);

        if (error) {
            console.error("Supabase Save Error:", error);
            ui.setSyncStatus('error');
        } else {
            setTimeout(() => ui.setSyncStatus('online'), 1000); // Debounce success
        }
    },

    // --- REALTIME ---

    subscribe: (onUpdate) => {
        if (!sb.client) return;

        // Unsubscribe if existing to avoid dupes
        if (sb.channel) {
            sb.channel.unsubscribe();
            sb.channel = null;
        }

        sb.channel = sb.client
            .channel('tracker_changes')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'tracker_state', filter: 'id=eq.1' },
                (payload) => {
                    console.log('Remote change received:', payload);
                    if (payload.new && payload.new.data) {
                        const updater = payload.new.last_updated_by;

                        // If *I* triggered the update, ignore it to prevent loop/jank
                        if (updater === sb.currentUser?.name) return;

                        ui.showToast(`Daten aktualisiert von ${updater}`);
                        onUpdate(payload.new.data);
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Connected to Realtime');
                    ui.setSyncStatus('online');
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    ui.setSyncStatus('offline');
                }
            });
    }
};

window.sb = sb;
