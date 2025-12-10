import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose }) => {
    const {
        openRouterApiKey, setOpenRouterApiKey,
        councilModels, setCouncilModels,
        chairmanModel, setChairmanModel
    } = useSettings();

    const [localKey, setLocalKey] = useState(openRouterApiKey);
    const [localCouncilModels, setLocalCouncilModels] = useState(councilModels.join('\n'));
    const [localChairman, setLocalChairman] = useState(chairmanModel);

    if (!isOpen) return null;

    const handleSave = () => {
        setOpenRouterApiKey(localKey);

        const models = localCouncilModels.split('\n')
            .map(m => m.trim())
            .filter(m => m.length > 0);
        setCouncilModels(models);

        setChairmanModel(localChairman);
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2 className="modal-title">Settings</h2>

                <div className="form-group">
                    <label>OpenRouter API Key</label>
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

                <div className="form-group mb-large">
                    <label>Chairman Model</label>
                    <input
                        type="text"
                        className="input-field"
                        value={localChairman}
                        onChange={(e) => setLocalChairman(e.target.value)}
                    />
                </div>

                <div className="modal-actions">
                    <button
                        onClick={onClose}
                        className="btn-cancel"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn-save"
                    >
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
