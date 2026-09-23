'use client';

import { useEffect, useState } from 'react';

const styles = [
  ['standard', 'Standard'],
  ['research', 'Research'],
  ['tutor', 'Tutor'],
  ['decision', 'Decision Support'],
  ['technical', 'Technical'],
  ['devils-advocate', "Devil's Advocate"],
];

export default function Home() {
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [style, setStyle] = useState('standard');
  const [depth, setDepth] = useState('council');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showContext, setShowContext] = useState(false);
  const [showDebate, setShowDebate] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('council-context');
    if (saved) setContext(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('council-context', context);
  }, [context]);

  async function submit(e) {
    e.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    setShowDebate(false);

    try {
      const response = await fetch('/api/council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context, style, depth }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.error || 'Request failed');
      setResult(data);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">GPT · CLAUDE · GEMINI</div>
        <h1>Council</h1>
        <p className="lede">Three independent models. Cross-examination. Red-team review. One synthesized answer.</p>
      </section>

      <form className="panel composer" onSubmit={submit}>
        <label htmlFor="question">What should the council analyze?</label>
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question, paste a problem, or describe a decision..."
          rows={7}
          maxLength={12000}
        />

        <div className="controls">
          <div>
            <span className="controlLabel">Mode</span>
            <select value={style} onChange={(e) => setStyle(e.target.value)}>
              {styles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <span className="controlLabel">Depth</span>
            <div className="segmented">
              <button type="button" className={depth === 'quick' ? 'active' : ''} onClick={() => setDepth('quick')}>Quick</button>
              <button type="button" className={depth === 'council' ? 'active' : ''} onClick={() => setDepth('council')}>Council</button>
            </div>
          </div>
        </div>

        <button className="contextToggle" type="button" onClick={() => setShowContext(!showContext)}>
          {showContext ? 'Hide' : 'Add'} personal / project context
        </button>

        {showContext && (
          <div className="contextBox">
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Optional context the models should know. Stored only in this browser's local storage and sent with your council request."
              rows={5}
              maxLength={12000}
            />
            <small>Do not put passwords, API keys, or secrets here.</small>
          </div>
        )}

        <button className="runButton" type="submit" disabled={loading || !question.trim()}>
          {loading ? 'Council deliberating…' : depth === 'quick' ? 'Run Quick Council' : 'Run Full Council'}
        </button>
        <p className="hint">Quick = 4 model calls. Council = 11 model calls with critique, red-team review, and revision.</p>
      </form>

      {error && <section className="panel error"><strong>Run failed.</strong><span>{error}</span></section>}

      {result && (
        <section className="results">
          <div className="panel answerPanel">
            <div className="resultHead">
              <div>
                <span className="eyebrow">FINAL SYNTHESIS</span>
                <h2>Council answer</h2>
              </div>
              <span className="badge">{result.depth}</span>
            </div>
            <div className="answerText">{result.answer}</div>
            <div className="modelStrip">
              <span>{result.models.gpt}</span>
              <span>{result.models.claude}</span>
              <span>{result.models.gemini}</span>
            </div>
          </div>

          <button className="debateToggle" onClick={() => setShowDebate(!showDebate)}>
            {showDebate ? 'Hide council work' : 'View council work'}
          </button>

          {showDebate && (
            <div className="debateGrid">
              <Stage title="GPT initial" text={result.stages.initial?.gpt} />
              <Stage title="Claude initial" text={result.stages.initial?.claude} />
              <Stage title="Gemini initial" text={result.stages.initial?.gemini} />
              {result.stages.critiques && <>
                <Stage title="GPT critique" text={result.stages.critiques.gpt} />
                <Stage title="Claude critique" text={result.stages.critiques.claude} />
                <Stage title="Gemini critique" text={result.stages.critiques.gemini} />
                <Stage title="Shared-assumption red team" text={result.stages.redTeam} wide />
                <Stage title="GPT revised" text={result.stages.revisions?.gpt} />
                <Stage title="Claude revised" text={result.stages.revisions?.claude} />
                <Stage title="Gemini revised" text={result.stages.revisions?.gemini} />
              </>}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function Stage({ title, text, wide = false }) {
  if (!text) return null;
  return (
    <article className={`panel stage ${wide ? 'wide' : ''}`}>
      <h3>{title}</h3>
      <div className="stageText">{text}</div>
    </article>
  );
}
