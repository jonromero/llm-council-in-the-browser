import React, { useState, useEffect } from 'react';
import './IntroModal.css';

const IntroModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content intro-modal-content">
                <h2>Welcome to LLM Council</h2>
                <div className="intro-badge">Client-Side Edition</div>

                <div className="hero-description">
                    <p className="hero-text">
                        Have <strong>four AIs be your personal council</strong>. They research your question individually,
                        <strong> vote for the best answers</strong>, then a <strong>Chairman AI</strong> synthesizes the final response by combining their insights.
                    </p>
                </div>

                <div className="info-grid">
                    <div className="info-box-compact">
                        <span className="info-icon">🔒</span>
                        <div className="info-content">
                            <strong>Privacy First</strong>
                            <p>Runs locally in your browser. All data stored in localStorage.</p>
                        </div>
                    </div>

                    <div className="info-box-compact">
                        <span className="info-icon">💾</span>
                        <div className="info-content">
                            <strong>Download & Run Offline</strong>
                            <p>Save this page (Ctrl/Cmd+S) to run completely offline.</p>
                        </div>
                    </div>

                    <div className="info-box-compact">
                        <span className="info-icon">🔑</span>
                        <div className="info-content">
                            <strong>Setup Required</strong>
                            <p>You'll need an OpenRouter API Key (free models available!).</p>
                        </div>
                    </div>
                </div>

                <p className="credits">
                    Fork of <a href="https://github.com/karpathy/llm-council" target="_blank" rel="noopener noreferrer">karpathy/llm-council</a> by <strong>Jon V</strong> (actually Claude and Antigravity but you get the point).
                </p>

                <button onClick={onClose} className="btn-primary intro-btn">
                    Get Started
                </button>
            </div>
        </div>
    );
};

export default IntroModal;
