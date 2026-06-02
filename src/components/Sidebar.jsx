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
          <div className="sidebar-logo">
            ~^
            <span>LLM Council</span>
          </div>
          <button className="btn-primary" onClick={onNewConversation}>
            New conversation
          </button>
          <button className="btn-secondary" onClick={onOpenSettings}>
            Settings
          </button>
        </div>

        <div className="conversation-list">
          {conversations.length === 0 ? (
            <div className="no-conversations">no conversations yet.</div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conversation-item ${conv.id === currentConversationId ? 'active' : ''}`}
                onClick={() => onSelectConversation(conv.id)}
              >
                <div className="conversation-info">
                  <div className="conversation-title">
                    {conv.title || 'New Conversation'}
                  </div>
                  <div className="conversation-meta">
                    {conv.message_count} msg
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
            fork on github →
          </a>
          <span className="footer-text">~^ client-side edition. all data stays in your browser.</span>
        </div>
      </div>
    </>
  );
}
