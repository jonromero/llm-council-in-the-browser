import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './Stage2.css';

const PANEL_COLORS = [
  '#e8894a', '#4a9be8', '#c778dd', '#7ec849',
  '#e8d84a', '#e84a7e', '#4ae8d8', '#a0a0a0',
];

const MEDAL = ['🥇', '🥈', '🥉'];

function shortName(model) {
  return model.split('/').pop() || model;
}

function deAnonymizeText(text, labelToModel) {
  if (!labelToModel) return text;
  let result = text;
  Object.entries(labelToModel).forEach(([label, model]) => {
    const name = shortName(model);
    result = result.replace(new RegExp(label, 'g'), `**${name}**`);
  });
  return result;
}

// Maps model name → color index from the stage1 labelling
function modelColorIndex(model, aggregateRankings) {
  if (!aggregateRankings) return 0;
  const idx = aggregateRankings.findIndex(a => a.model === model);
  return idx >= 0 ? idx : 0;
}

export default function Stage2({ rankings, labelToModel, aggregateRankings }) {
  const [openPanel, setOpenPanel] = useState(null); // index of expanded eval panel

  if (!rankings || rankings.length === 0) return null;

  // Build ordered list by average rank for the leaderboard
  const ordered = aggregateRankings
    ? [...aggregateRankings].sort((a, b) => a.average_rank - b.average_rank)
    : [];

  return (
    <div className="stage stage2">
      {/* ── Section header ── */}
      <div className="arena-header">
        <span className="arena-label arena-label--stage2">STAGE 2</span>
        <span className="arena-title">─ Peer Rankings</span>
        <span className="arena-count">{rankings.length} evaluators</span>
      </div>

      {/* ── Leaderboard ── */}
      {ordered.length > 0 && (
        <div className="leaderboard">
          <div className="leaderboard-title">
            <span className="lb-icon">▲</span> LEADERBOARD
          </div>
          {ordered.map((agg, rank) => {
            const colorIdx = aggregateRankings
              ? aggregateRankings.findIndex(a => a.model === agg.model)
              : rank;
            const color = PANEL_COLORS[colorIdx % PANEL_COLORS.length];
            const barWidth = Math.max(10, 100 - (agg.average_rank - 1) * 20);
            return (
              <div key={agg.model} className="lb-row">
                <span className="lb-rank">
                  {rank < 3 ? MEDAL[rank] : `#${rank + 1}`}
                </span>
                <span className="lb-model" style={{ color }}>
                  {shortName(agg.model)}
                </span>
                <div className="lb-bar-track">
                  <div
                    className="lb-bar-fill"
                    style={{ width: `${barWidth}%`, background: color }}
                  />
                </div>
                <span className="lb-score" style={{ color }}>
                  {agg.average_rank.toFixed(2)}
                </span>
                <span className="lb-votes">
                  {agg.rankings_count}v
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Raw evaluations (collapsible per evaluator) ── */}
      <div className="evals-header">
        Raw Evaluations
        <span className="evals-hint">click to expand</span>
      </div>

      <div className="evals-list">
        {rankings.map((rank, index) => {
          const color = PANEL_COLORS[index % PANEL_COLORS.length];
          const isOpen = openPanel === index;
          return (
            <div
              key={index}
              className={`eval-card ${isOpen ? 'eval-card--open' : ''}`}
              style={{ '--eval-color': color }}
            >
              <button
                className="eval-card-header"
                onClick={() => setOpenPanel(isOpen ? null : index)}
              >
                <span className="eval-model-name" style={{ color }}>
                  {shortName(rank.model)}
                </span>
                {rank.parsed_ranking && rank.parsed_ranking.length > 0 && (
                  <span className="eval-mini-ranking">
                    {rank.parsed_ranking.map((label, i) => (
                      <span key={i} className="eval-mini-badge" style={{ opacity: 1 - i * 0.2 }}>
                        {labelToModel && labelToModel[label]
                          ? shortName(labelToModel[label])
                          : label}
                      </span>
                    ))}
                  </span>
                )}
                <span className="eval-chevron">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="eval-card-body">
                  <div className="eval-full-text panel-markdown markdown-content">
                    <ReactMarkdown>
                      {deAnonymizeText(rank.ranking, labelToModel)}
                    </ReactMarkdown>
                  </div>
                  {rank.parsed_ranking && rank.parsed_ranking.length > 0 && (
                    <div className="eval-parsed">
                      <span className="eval-parsed-label">Extracted ranking:</span>
                      {rank.parsed_ranking.map((label, i) => {
                        const modelName = labelToModel && labelToModel[label]
                          ? shortName(labelToModel[label]) : label;
                        const cIdx = aggregateRankings
                          ? aggregateRankings.findIndex(a => a.model === (labelToModel && labelToModel[label]))
                          : i;
                        const c = PANEL_COLORS[cIdx >= 0 ? cIdx : i];
                        return (
                          <span key={i} className="eval-parsed-item" style={{ color: c }}>
                            {i + 1}. {modelName}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
