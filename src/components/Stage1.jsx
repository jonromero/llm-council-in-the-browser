import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './Stage1.css';

// One color per panel slot — cycles if more than 8 models
const PANEL_COLORS = [
  '#e8894a', // orange  (Claude-ish)
  '#4a9be8', // blue    (Codex-ish)
  '#c778dd', // purple  (Gemini-ish)
  '#7ec849', // green   (Vibe-ish)
  '#e8d84a', // yellow
  '#e84a7e', // pink
  '#4ae8d8', // teal
  '#a0a0a0', // gray
];

function shortName(model) {
  // e.g. "openai/gpt-4o" → "gpt-4o"
  return model.split('/').pop() || model;
}

function ModelPanel({ response, colorIndex, onRedo, onChangeModel }) {
  const color = PANEL_COLORS[colorIndex % PANEL_COLORS.length];
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(response.model);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const startEdit = () => {
    setEditValue(response.model);
    setEditing(true);
  };

  const confirmEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== response.model) {
      onChangeModel && onChangeModel(trimmed);
    }
    setEditing(false);
  };

  const cancelEdit = () => setEditing(false);

  const handleEditKey = (e) => {
    if (e.key === 'Enter') confirmEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const isLoading = response.loading;

  return (
    <div className="arena-panel" style={{ '--panel-color': color }}>
      {/* ── Header ── */}
      <div className="arena-panel-header">
        {editing ? (
          <div className="panel-edit-row">
            <input
              ref={inputRef}
              className="panel-model-input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleEditKey}
              onBlur={confirmEdit}
              spellCheck={false}
            />
            <button className="panel-edit-btn panel-edit-confirm" onClick={confirmEdit} title="Confirm">✓</button>
            <button className="panel-edit-btn panel-edit-cancel" onClick={cancelEdit} title="Cancel">✕</button>
          </div>
        ) : (
          <>
            <button
              className="panel-model-name"
              onClick={startEdit}
              title="Click to change model"
              style={{ color }}
            >
              {shortName(response.model)}
              <span className="panel-edit-hint">✎</span>
            </button>
            <div className="panel-header-actions">
              <button
                className="panel-redo-btn"
                onClick={() => onRedo && onRedo()}
                disabled={isLoading}
                title="Re-run this model"
              >
                ↻
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Full model id subtitle ── */}
      <div className="arena-panel-model-id">{response.model}</div>

      {/* ── Content ── */}
      <div className="arena-panel-content">
        {isLoading ? (
          <div className="panel-loading">
            <span className="panel-spinner" style={{ borderTopColor: color }}></span>
            <span style={{ color }}>Querying…</span>
          </div>
        ) : response.response ? (
          <div className="panel-markdown markdown-content">
            <ReactMarkdown>{response.response}</ReactMarkdown>
          </div>
        ) : (
          <span className="panel-empty">No response</span>
        )}
      </div>
    </div>
  );
}

export default function Stage1({ responses, onRedo, onChangeModel }) {
  if (!responses || responses.length === 0) return null;

  return (
    <div className="stage stage1">
      <div className="arena-header">
        <span className="arena-label">STAGE 1</span>
        <span className="arena-title">─ Individual Responses</span>
        <span className="arena-count">{responses.length} agents</span>
      </div>

      <div className="arena-grid">
        {responses.map((resp, index) => (
          <ModelPanel
            key={`${resp.model}-${index}`}
            response={resp}
            colorIndex={index}
            onRedo={() => onRedo && onRedo(index, resp.model)}
            onChangeModel={(newId) => onChangeModel && onChangeModel(index, resp.model, newId)}
          />
        ))}
      </div>
    </div>
  );
}
