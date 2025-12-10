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
                    This project is a <strong>standalone client-side fork</strong> of <a href="https://github.com/karpathy/llm-council" target="_blank" rel="noopener noreferrer">karpathy/llm-council</a>, created by <strong>Jon V</strong>.
                </p>

                <div className="info-box">
                    <h3>🔒 Privacy First</h3>
                    <p>
                        Everything runs locally in your browser. All conversations and settings are stored in <code>localStorage</code>. No backend server is required.
                    </p>
                </div>

                <div className="info-box">
                    <h3>💾 Download & Run Offline</h3>
                    <p>
                        You can download this entire app as a single HTML file and run it completely offline. Just save the page (Ctrl/Cmd+S) or download from GitHub releases.
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
