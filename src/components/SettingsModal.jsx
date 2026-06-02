import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose }) => {
    const {
        openRouterApiKey, setOpenRouterApiKey,
        councilModels, setCouncilModels,
        chairmanModel, setChairmanModel,
        supabaseUrl, setSupabaseUrl,
        supabaseAnonKey, setSupabaseAnonKey,
    } = useSettings();

    const [localKey, setLocalKey] = useState(openRouterApiKey);
    const [localCouncilModels, setLocalCouncilModels] = useState(councilModels.join('\n'));
    const [localChairman, setLocalChairman] = useState(chairmanModel);
    const [localSupabaseUrl, setLocalSupabaseUrl] = useState(supabaseUrl);
    const [localSupabaseAnonKey, setLocalSupabaseAnonKey] = useState(supabaseAnonKey);

    if (!isOpen) return null;

    const handleSave = () => {
        setOpenRouterApiKey(localKey);

        const models = localCouncilModels.split('\n')
            .map(m => m.trim())
            .filter(m => m.length > 0);
        setCouncilModels(models);

        setChairmanModel(localChairman);
        setSupabaseUrl(localSupabaseUrl.trim());
        setSupabaseAnonKey(localSupabaseAnonKey.trim());
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content settings-modal-content">
                <h2 className="modal-title">Settings</h2>

                {/* ── OpenRouter ── */}
                <div className="settings-section">
                    <h3 className="settings-section-title">OpenRouter</h3>

                    <div className="form-group">
                        <label>API Key</label>
                        <input
                            type="password"
                            className="input-field"
                            value={localKey}
                            onChange={(e) => setLocalKey(e.target.value)}
                            placeholder="sk-or-..."
                        />
                        <p className="help-text">
                            Stored locally in your browser. Required for the app to function.
                        </p>
                    </div>

                    <div className="form-group">
                        <label>Council Models (one per line)</label>
                        <textarea
                            className="textarea-field"
                            value={localCouncilModels}
                            onChange={(e) => setLocalCouncilModels(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Chairman Model</label>
                        <input
                            type="text"
                            className="input-field"
                            value={localChairman}
                            onChange={(e) => setLocalChairman(e.target.value)}
                        />
                    </div>
                </div>

                {/* ── Supabase ── */}
                <div className="settings-section">
                    <h3 className="settings-section-title">
                        Supabase
                        <span className="settings-section-badge">Optional</span>
                    </h3>
                    <p className="help-text" style={{ marginBottom: 12 }}>
                        Connect a Supabase project to persist conversations and uploaded files across devices.
                        Leave blank to use browser storage only.
                    </p>

                    <div className="form-group">
                        <label>Project URL</label>
                        <input
                            type="text"
                            className="input-field"
                            value={localSupabaseUrl}
                            onChange={(e) => setLocalSupabaseUrl(e.target.value)}
                            placeholder="https://your-project.supabase.co"
                        />
                    </div>

                    <div className="form-group">
                        <label>Anon / Public Key</label>
                        <input
                            type="password"
                            className="input-field"
                            value={localSupabaseAnonKey}
                            onChange={(e) => setLocalSupabaseAnonKey(e.target.value)}
                            placeholder="eyJhbGci..."
                        />
                        <p className="help-text">
                            Found in your Supabase project under Settings → API.{' '}
                            <a
                                href="https://supabase.com/dashboard"
                                target="_blank"
                                rel="noreferrer"
                                className="help-link"
                            >
                                Open Supabase →
                            </a>
                        </p>
                    </div>

                    <details className="sql-schema-details">
                        <summary>Required database schema (click to expand)</summary>
                        <p className="help-text" style={{ marginBottom: 8 }}>
                            Run this SQL in your Supabase project's SQL Editor to create the required tables:
                        </p>
                        <pre className="sql-block">{`-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  title TEXT DEFAULT 'New Conversation',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT,
  stage1 JSONB,
  stage2 JSONB,
  stage3 JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sort_index INT DEFAULT 0
);

-- Uploaded files
CREATE TABLE IF NOT EXISTS uploaded_files (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  message_id TEXT,
  file_name TEXT NOT NULL,
  file_type TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage bucket (run once)
INSERT INTO storage.buckets (id, name, public)
VALUES ('council-uploads', 'council-uploads', false)
ON CONFLICT DO NOTHING;`}</pre>
                    </details>
                </div>

                <div className="modal-actions">
                    <button onClick={onClose} className="btn-cancel">Cancel</button>
                    <button onClick={handleSave} className="btn-save">Save Settings</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
