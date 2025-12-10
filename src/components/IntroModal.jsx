import React, { useState, useEffect } from 'react';
import './IntroModal.css';

const IntroModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content intro-modal-content">
                <h2>Welcome to LLM Council</h2>
                <div className="intro-badge">Client-Side Edition</div>

                <p>
                    This project is a <strong>standalone client-side fork</strong> of <a href="https://github.com/karpathy/llm-council" target="_blank" rel="noopener noreferrer">karpathy/llm-council</a>, that I did just for fun. Enjoy it! <strong>Jon V</strong>.
                </p>

                <div className="info-box">
                    <h3>🔒 Privacy First (almost :D)</h3>
                    <p>
                        Everything stays locally in your browser BUT the API calls are sent to OpenRouter. All conversations and settings are stored in <code>localStorage</code>. No backend server is required. BUT OBVIOUSLY, OpenRouter is not a private server.
                    </p>
                </div>

                <div className="info-box">
                    <h3>🔑 Setup Required</h3>
                    <p>
                        You will need an <strong>OpenRouter API Key</strong> to use this application. Free models are available and work great!
                    </p>
                </div>

                <button onClick={onClose} className="btn-primary intro-btn">
                    Get Started
                </button>
            </div>
        </div>
    );
};

export default IntroModal;
