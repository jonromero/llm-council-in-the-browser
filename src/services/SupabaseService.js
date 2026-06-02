/**
 * SupabaseService – wraps the Supabase client for conversations, messages, and file uploads.
 *
 * Usage:
 *   import { getSupabaseService } from './SupabaseService';
 *   const svc = getSupabaseService(supabaseUrl, supabaseAnonKey);
 *   if (svc) { await svc.upsertConversation(conv); }
 *
 * Returns null when Supabase is not configured, so callers can gracefully fall back
 * to localStorage-only mode.
 */

import { createClient } from '@supabase/supabase-js';

let _client = null;
let _url = null;
let _key = null;

/**
 * Returns a shared Supabase client (re-creates if credentials changed).
 * Returns null if url or key are empty.
 */
function getClient(url, key) {
    if (!url || !key) return null;
    if (_client && _url === url && _key === key) return _client;
    _client = createClient(url, key);
    _url = url;
    _key = key;
    return _client;
}

/**
 * Returns a service object bound to the given credentials, or null if unconfigured.
 */
export function getSupabaseService(url, key) {
    const supabase = getClient(url, key);
    if (!supabase) return null;

    return {
        /**
         * Upsert a conversation row (id, created_at, title).
         */
        async upsertConversation(conversation) {
            const { error } = await supabase
                .from('conversations')
                .upsert({
                    id: conversation.id,
                    created_at: conversation.created_at,
                    title: conversation.title || 'New Conversation',
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'id' });
            if (error) console.error('[Supabase] upsertConversation:', error.message);
        },

        /**
         * Delete a conversation (cascades to messages and uploaded_files).
         */
        async deleteConversation(id) {
            const { error } = await supabase
                .from('conversations')
                .delete()
                .eq('id', id);
            if (error) console.error('[Supabase] deleteConversation:', error.message);
        },

        /**
         * Fetch all conversations ordered by created_at desc.
         */
        async listConversations() {
            const { data, error } = await supabase
                .from('conversations')
                .select('id, created_at, title')
                .order('created_at', { ascending: false });
            if (error) {
                console.error('[Supabase] listConversations:', error.message);
                return null;
            }
            return data;
        },

        /**
         * Upsert a single message row.
         * @param {string} conversationId
         * @param {object} msg – message object from local state
         * @param {number} sortIndex – position in the messages array
         */
        async upsertMessage(conversationId, msg, sortIndex) {
            // Generate a stable id for the message if absent
            const id = msg.id || `${conversationId}_${sortIndex}`;
            const { error } = await supabase
                .from('messages')
                .upsert({
                    id,
                    conversation_id: conversationId,
                    role: msg.role,
                    content: msg.content || null,
                    stage1: msg.stage1 || null,
                    stage2: msg.stage2 || null,
                    stage3: msg.stage3 || null,
                    metadata: msg.metadata || null,
                    sort_index: sortIndex,
                }, { onConflict: 'id' });
            if (error) console.error('[Supabase] upsertMessage:', error.message);
            return id;
        },

        /**
         * Sync an entire conversation's messages to Supabase.
         * Only syncs non-loading messages to avoid persisting transient state.
         */
        async syncConversation(conversation) {
            await this.upsertConversation(conversation);
            const settled = conversation.messages.filter(m => !m.loading);
            for (let i = 0; i < settled.length; i++) {
                await this.upsertMessage(conversation.id, settled[i], i);
            }
        },

        /**
         * Fetch all messages for a conversation ordered by sort_index.
         */
        async getMessages(conversationId) {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('sort_index', { ascending: true });
            if (error) {
                console.error('[Supabase] getMessages:', error.message);
                return null;
            }
            return data;
        },

        /**
         * Upload a file to Supabase Storage and record metadata in uploaded_files table.
         * @param {string} conversationId
         * @param {string} messageId
         * @param {File} file – browser File object
         * @returns {string|null} public storage path, or null on error
         */
        async uploadFile(conversationId, messageId, file) {
            const ext = file.name.split('.').pop();
            const path = `${conversationId}/${messageId}_${Date.now()}.${ext}`;

            // Upload to Storage
            const { error: storageError } = await supabase.storage
                .from('council-uploads')
                .upload(path, file, { upsert: false });

            if (storageError) {
                console.error('[Supabase] uploadFile (storage):', storageError.message);
                return null;
            }

            // Record in table
            const id = `${conversationId}_${Date.now()}`;
            const { error: dbError } = await supabase
                .from('uploaded_files')
                .insert({
                    id,
                    conversation_id: conversationId,
                    message_id: messageId,
                    file_name: file.name,
                    file_type: file.type,
                    storage_path: path,
                });
            if (dbError) console.error('[Supabase] uploadFile (db):', dbError.message);

            return path;
        },
    };
}
