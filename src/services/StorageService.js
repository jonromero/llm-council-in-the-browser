/**
 * Service for local storage of conversations.
 */

const STORAGE_KEY_PREFIX = 'llm_council_conv_';
const LIST_KEY = 'llm_council_conversations_list';

export const storageService = {
    /**
     * List all conversations (metadata only).
     */
    listConversations() {
        const listJson = localStorage.getItem(LIST_KEY);
        return listJson ? JSON.parse(listJson) : [];
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
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        const conversation = {
            id,
            created_at: now,
            title: "New Conversation",
            messages: []
        };

        // Save full conversation
        this.saveConversation(conversation);

        // Update list
        const list = this.listConversations();
        const newItem = {
            id,
            created_at: now,
            title: "New Conversation",
            message_count: 0
        };
        // Add to beginning
        list.unshift(newItem);
        this.saveConversationsList(list);

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
     * Save a conversation.
     */
    saveConversation(conversation) {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${conversation.id}`, JSON.stringify(conversation));

        // Also update metadata in the list if title or message count changed
        const list = this.listConversations();
        const index = list.findIndex(c => c.id === conversation.id);
        if (index !== -1) {
            list[index] = {
                ...list[index],
                title: conversation.title,
                message_count: conversation.messages.length
            };
            this.saveConversationsList(list);
        }
    },

    /**
     * Delete a conversation.
     */
    deleteConversation(id) {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${id}`);
        const list = this.listConversations().filter(c => c.id !== id);
        this.saveConversationsList(list);
    },

    /**
     * Update conversation title
     */
    updateConversationTitle(id, title) {
        const conversation = this.getConversation(id);
        if (conversation) {
            conversation.title = title;
            this.saveConversation(conversation);
        }
    }
};
