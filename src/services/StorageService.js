/**
 * StorageService – manages conversations in localStorage with optional Supabase sync.
 *
 * localStorage is always the primary read source (fast, offline-first).
 * When Supabase is configured, every write is mirrored there in the background.
 * On first load with an empty localStorage, the service tries to hydrate from Supabase.
 */

import { getSupabaseService } from './SupabaseService';

const STORAGE_KEY_PREFIX = 'llm_council_conv_';
const LIST_KEY = 'llm_council_conversations_list';

// Supabase credentials are injected at runtime via setSupabaseCredentials().
let _supabaseUrl = '';
let _supabaseAnonKey = '';

function supabase() {
    return getSupabaseService(_supabaseUrl, _supabaseAnonKey);
}

/**
 * Generate a UUID v4 with fallback for browsers that don't support crypto.randomUUID
 */
function generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export const storageService = {
    /**
     * Call this whenever Supabase credentials change (e.g. after settings save).
     */
    setSupabaseCredentials(url, key) {
        _supabaseUrl = url || '';
        _supabaseAnonKey = key || '';
    },

    /**
     * List all conversations (metadata only) from localStorage.
     * If localStorage is empty and Supabase is configured, try fetching from Supabase.
     */
    listConversations() {
        const listJson = localStorage.getItem(LIST_KEY);
        return listJson ? JSON.parse(listJson) : [];
    },

    /**
     * Async variant that tries Supabase hydration when localStorage is empty.
     */
    async listConversationsAsync() {
        const local = this.listConversations();
        if (local.length > 0) return local;

        const svc = supabase();
        if (!svc) return [];

        const remote = await svc.listConversations();
        if (!remote || remote.length === 0) return [];

        // Hydrate localStorage from Supabase
        const list = remote.map(c => ({
            id: c.id,
            created_at: c.created_at,
            title: c.title,
            message_count: 0,
        }));
        this.saveConversationsList(list);

        // Also hydrate each conversation's messages
        for (const conv of remote) {
            const messages = await svc.getMessages(conv.id);
            if (messages) {
                const fullConv = {
                    id: conv.id,
                    created_at: conv.created_at,
                    title: conv.title,
                    messages: messages.map(m => ({
                        id: m.id,
                        role: m.role,
                        content: m.content,
                        stage1: m.stage1,
                        stage2: m.stage2,
                        stage3: m.stage3,
                        metadata: m.metadata,
                    })),
                };
                localStorage.setItem(`${STORAGE_KEY_PREFIX}${conv.id}`, JSON.stringify(fullConv));
            }
        }

        return list;
    },

    /**
     * Save the conversations list.
     */
    saveConversationsList(list) {
        localStorage.setItem(LIST_KEY, JSON.stringify(list));
    },

    /**
     * Create a new conversation.
     */
    createConversation() {
        const id = generateUUID();
        const now = new Date().toISOString();

        const conversation = {
            id,
            created_at: now,
            title: 'New Conversation',
            messages: [],
        };

        this.saveConversation(conversation);

        const list = this.listConversations();
        list.unshift({ id, created_at: now, title: 'New Conversation', message_count: 0 });
        this.saveConversationsList(list);

        // Supabase (background)
        const svc = supabase();
        if (svc) svc.upsertConversation(conversation).catch(console.error);

        return conversation;
    },

    /**
     * Get a specific conversation.
     */
    getConversation(id) {
        const json = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
        return json ? JSON.parse(json) : null;
    },

    /**
     * Save a conversation (localStorage + Supabase background sync).
     */
    saveConversation(conversation) {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${conversation.id}`, JSON.stringify(conversation));

        // Update metadata in list
        const list = this.listConversations();
        const index = list.findIndex(c => c.id === conversation.id);
        if (index !== -1) {
            list[index] = {
                ...list[index],
                title: conversation.title,
                message_count: conversation.messages.length,
            };
            this.saveConversationsList(list);
        }

        // Supabase (background, fire-and-forget)
        const svc = supabase();
        if (svc) svc.syncConversation(conversation).catch(console.error);
    },

    /**
     * Delete a conversation.
     */
    deleteConversation(id) {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${id}`);
        const list = this.listConversations().filter(c => c.id !== id);
        this.saveConversationsList(list);

        const svc = supabase();
        if (svc) svc.deleteConversation(id).catch(console.error);
    },

    /**
     * Update conversation title.
     */
    updateConversationTitle(id, title) {
        const conversation = this.getConversation(id);
        if (conversation) {
            conversation.title = title;
            this.saveConversation(conversation);
        }
    },
};
