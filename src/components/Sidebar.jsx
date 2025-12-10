import { useState, useEffect } from 'react';
import './Sidebar.css';

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onOpenSettings,
  isOpen,
  onClose
}) {
  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1>LLM Council</h1>
          <button className="btn-primary" onClick={onNewConversation}>
            + New Conversation
          </button>
          <button className="btn-secondary" onClick={onOpenSettings}>
            ⚙️ Settings
          </button>
        </div>

        <div className="conversation-list">
          {conversations.length === 0 ? (
            <div className="no-conversations">No conversations yet</div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conversation-item ${conv.id === currentConversationId ? 'active' : ''
                  }`}
                onClick={() => onSelectConversation(conv.id)}
              >
                <div className="conversation-info">
                  <div className="conversation-title">
                    {conv.title || 'New Conversation'}
                  </div>
                  <div className="conversation-meta">
                    {conv.message_count} messages
                  </div>
                </div>

                {onDeleteConversation && (
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete conversation?')) onDeleteConversation(conv.id);
                    }}
                    title="Delete"
                  >
                    ×
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <a
            href="https://github.com/jonromero/llm-council-in-the-browser"
            target="_blank"
            rel="noopener noreferrer"
            className="fork-link"
          >
            ⭐ Fork me on GitHub
          </a>
          <span className="footer-text">Client-side Edition</span>
        </div>
      </div>
    </>
  );
}
