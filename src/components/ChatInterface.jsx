import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import { processFiles } from '../services/DocumentService';
import './ChatInterface.css';

const ACCEPTED_FILE_TYPES = 'image/*,application/pdf,text/plain,text/markdown,text/csv,application/json';
const MAX_FILE_SIZE_MB = 20;

export default function ChatInterface({
  conversation,
  onSendMessage,
  isLoading,
  onRedoModel,
  onChangeModel,
}) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]); // processed attachment objects
  const [rawFiles, setRawFiles] = useState([]);       // original File objects for Supabase upload
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const handleFilesSelected = async (files) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(f => {
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`"${f.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit and was skipped.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsProcessingFiles(true);
    try {
      const processed = await processFiles(validFiles);
      setAttachments(prev => [...prev, ...processed]);
      setRawFiles(prev => [...prev, ...validFiles]);
    } catch (err) {
      console.error('File processing error:', err);
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setRawFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((input.trim() || attachments.length > 0) && !isLoading && !isProcessingFiles) {
      onSendMessage(input, attachments, rawFiles);
      setInput('');
      setAttachments([]);
      setRawFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  const handlePrint = (content) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the report.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>LLM Council Report</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
              line-height: 1.6;
              color: #000;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
            }
            h1 { font-size: 24px; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            h2 { font-size: 18px; margin-top: 20px; color: #333; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
            code { font-family: 'Menlo', 'Monaco', 'Courier New', monospace; font-size: 0.9em; }
            @media print { body { margin: 0; padding: 0.5cm; } }
          </style>
        </head>
        <body>
          <h1>LLM Council Final Report</h1>
          <div style="white-space: pre-wrap;">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const isInputDisabled = isLoading || isProcessingFiles;

  if (!conversation) {
    return (
      <div className="chat-interface">
        <div className="empty-state">
          <h2>Welcome to LLM Council</h2>
          <p>Create a new conversation to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`chat-interface ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drop-overlay">
          <div className="drop-overlay-content">
            <span className="drop-icon">📎</span>
            <span>Drop files here</span>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="processing-banner">
          <div className="banner-icon">⏳</div>
          <div className="banner-content">
            <strong>Generating Comprehensive Report</strong>
            <p>The council is analyzing your question across multiple AI models. This process may take several minutes. Please do not close this page.</p>
          </div>
        </div>
      )}

      <div className="messages-container">
        {conversation.messages.length === 0 ? (
          <div className="empty-state">
            <h2>Ask the Council</h2>
            <p>Type your question below to consult multiple AI models</p>
            <p className="empty-hint">You can also attach photos or PDFs as context 📎</p>
          </div>
        ) : (
          conversation.messages.map((msg, index) => (
            <div key={index} className="message-group">
              {msg.role === 'user' ? (
                <div className="user-message">
                  <div className="message-label">You</div>
                  <div className="message-content">
                    {/* Show attachment chips if any */}
                    {msg.attachmentNames && msg.attachmentNames.length > 0 && (
                      <div className="message-attachments">
                        {msg.attachmentNames.map((name, i) => (
                          <span key={i} className="attachment-chip attachment-chip--sent">
                            📎 {name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="markdown-content">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="assistant-message">
                  <div className="message-label">LLM Council</div>

                  {msg.loading?.stage1 && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>Running Stage 1: Collecting individual responses...</span>
                    </div>
                  )}
                  {msg.stage1 && (
                    <Stage1
                      responses={msg.stage1}
                      onRedo={(slotIndex, modelName) =>
                        onRedoModel && onRedoModel(index, slotIndex, modelName)
                      }
                      onChangeModel={(slotIndex, oldModel, newModel) =>
                        onChangeModel && onChangeModel(index, slotIndex, oldModel, newModel)
                      }
                    />
                  )}

                  {msg.loading?.stage2 && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>Running Stage 2: Peer rankings...</span>
                    </div>
                  )}
                  {msg.stage2 && (
                    <Stage2
                      rankings={msg.stage2}
                      labelToModel={msg.metadata?.label_to_model}
                      aggregateRankings={msg.metadata?.aggregate_rankings}
                    />
                  )}

                  {msg.loading?.stage3 && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>Running Stage 3: Final synthesis...</span>
                    </div>
                  )}
                  {msg.stage3 && (
                    <div className="stage3-container">
                      <Stage3 finalResponse={msg.stage3} />
                      <button
                        className="print-btn"
                        onClick={() => handlePrint(msg.stage3.response)}
                        title="Print Final Report"
                      >
                        🖨️ Print Report
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Consulting the council...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input form – always visible ── */}
      <form className="input-form" onSubmit={handleSubmit}>
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="attachments-preview">
            {attachments.map((att, i) => (
              <div key={i} className="attachment-chip">
                {att.type === 'image' ? (
                  <img src={att.content} alt={att.name} className="attachment-thumb" />
                ) : (
                  <span className="attachment-icon">
                    {att.mimeType === 'application/pdf' ? '📄' : '📝'}
                  </span>
                )}
                <span className="attachment-name" title={att.name}>
                  {att.name.length > 20 ? att.name.slice(0, 18) + '…' : att.name}
                </span>
                <button
                  type="button"
                  className="attachment-remove"
                  onClick={() => removeAttachment(i)}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
            {isProcessingFiles && (
              <div className="attachment-chip attachment-chip--loading">
                <div className="spinner spinner--small"></div>
                <span>Processing…</span>
              </div>
            )}
          </div>
        )}

        <div className="input-row">
          {/* File upload button */}
          <button
            type="button"
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isInputDisabled}
            title="Attach file (image, PDF, text)"
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleFilesSelected(e.target.files)}
          />

          <textarea
            className="message-input"
            placeholder={
              conversation.messages.length === 0
                ? 'Ask your question… (Shift+Enter for new line, Enter to send)'
                : 'Ask a follow-up question… (full council re-run)'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isInputDisabled}
            rows={3}
          />

          <button
            type="submit"
            className="send-button"
            disabled={(!input.trim() && attachments.length === 0) || isInputDisabled}
          >
            {isLoading ? '…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
