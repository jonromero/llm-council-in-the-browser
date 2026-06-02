import ReactMarkdown from 'react-markdown';
import './Stage3.css';

export default function Stage3({ finalResponse }) {
  if (!finalResponse) return null;

  const modelName = finalResponse.model.split('/').pop() || finalResponse.model;

  return (
    <div className="stage stage3">
      <div className="arena-header">
        <span className="arena-label arena-label--stage3">STAGE 3</span>
        <span className="arena-title">─ Council Verdict</span>
        <span className="arena-count chairman-badge">⚖ {modelName}</span>
      </div>

      <div className="verdict-panel">
        <div className="verdict-panel-header">
          <span className="verdict-title-text">FINAL ANSWER</span>
          <span className="verdict-model-full">{finalResponse.model}</span>
        </div>
        <div className="verdict-content">
          <div className="verdict-markdown panel-markdown markdown-content">
            <ReactMarkdown>{finalResponse.response}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
