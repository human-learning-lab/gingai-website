'use client';

import React, { useEffect, useState } from 'react';

type Question = {
  id: string;
  text: string;
  choices?: string[];
};

type QuestionSet = {
  id: string;
  title: string;
  description?: string;
  created_at?: string | null;
};

type Response = {
  id: string;
  questionId: string;
  user: string;
  answer: string;
  created_at?: string | null;
};

type MobileView = 'sets' | 'questions' | 'review';

function formatDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export default function QuestionSets() {
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [selectedSet, setSelectedSet] = useState<QuestionSet | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  const [responses, setResponses] = useState<Response[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  const [search, setSearch] = useState('');
  const [mobileView, setMobileView] = useState<MobileView>('sets');

  // Fetch sets
  useEffect(() => {
    setLoadingSets(true);
    fetch('/api/question-sets')
      .then(r => r.ok ? r.json() : [])
      .then((data: QuestionSet[]) => setSets(data))
      .catch(() => setSets([]))
      .finally(() => setLoadingSets(false));
  }, []);

  // Fetch questions when set selected
  useEffect(() => {
    if (!selectedSet) return;
    setLoadingQuestions(true);
    fetch(`/api/question-sets/${selectedSet.id}/questions`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Question[]) => setQuestions(data))
      .catch(() => setQuestions([]))
      .finally(() => setLoadingQuestions(false));

    // also fetch responses summary
    setLoadingResponses(true);
    fetch(`/api/question-sets/${selectedSet.id}/responses`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Response[]) => setResponses(data))
      .catch(() => setResponses([]))
      .finally(() => setLoadingResponses(false));
  }, [selectedSet]);

  function pickSet(s: QuestionSet) {
    setSelectedSet(prev => prev?.id === s.id ? null : s);
    setSelectedQuestion(null);
    setMobileView('questions');
    setSearch('');
  }

  function pickQuestion(q: Question) {
    setSelectedQuestion(prev => prev?.id === q.id ? null : q);
    setMobileView('review');
  }

  function createSet() {
    const title = window.prompt('New set title');
    if (!title) return;
    const newSet: QuestionSet = { id: 'local-' + Date.now(), title, created_at: new Date().toISOString() };
    // optimistic update
    setSets(prev => [newSet, ...prev]);
    // try to save
    fetch('/api/question-sets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
      .then(r => r.ok ? r.json() : null)
      .then((saved: QuestionSet | null) => {
        if (saved) setSets(prev => [saved, ...prev.filter(s => s.id !== newSet.id)]);
      })
      .catch(() => {});
  }

  function createQuestion() {
    if (!selectedSet) return alert('Select a set first');
    const text = window.prompt('Question text');
    if (!text) return;
    const q: Question = { id: 'local-q-' + Date.now(), text };
    setQuestions(prev => [q, ...prev]);
    fetch(`/api/question-sets/${selectedSet.id}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      .then(r => r.ok ? r.json() : null)
      .then((saved: Question | null) => {
        if (saved) setQuestions(prev => [saved, ...prev.filter(p => p.id !== q.id)]);
      })
      .catch(() => {});
  }

  function saveQuestionEdit(updated: Question) {
    setQuestions(prev => prev.map(q => q.id === updated.id ? updated : q));
    fetch(`/api/questions/${updated.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
      .catch(() => {});
  }

  function saveResponseEdit(updated: Response) {
    setResponses(prev => prev.map(r => r.id === updated.id ? updated : r));
    fetch(`/api/responses/${updated.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
      .catch(() => {});
  }

  const filteredSets = sets.filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()));

  function statsForQuestion(qId: string) {
    const all = responses.filter(r => r.questionId === qId);
    const count = all.length;
    // simplistic "complete" metric: any non-empty answer
    const complete = all.filter(a => a.answer && a.answer.trim()).length;
    return { count, complete };
  }

  // Panels
  const SetsPanel = (
    <div className="qs-panel qs-sets">
      <div className="qs-panel-header">
        <div className="qs-label">Assessment</div>
        <div className="qs-title">Question Sets</div>
      </div>
      <div className="qs-search">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter sets…" />
      </div>
      <div className="qs-scroll">
        {loadingSets && <div className="qs-empty">Loading…</div>}
        {!loadingSets && filteredSets.length === 0 && <div className="qs-empty">No sets</div>}
        {filteredSets.map(s => (
          <button key={s.id} className={`qs-row qs-set-btn${selectedSet?.id === s.id ? ' active' : ''}`} onClick={() => pickSet(s)}>
            <div>
              <div className="qs-set-title">{s.title}</div>
              <div className="qs-set-sub">{s.description ?? formatDate(s.created_at)}</div>
            </div>
            <div className="qs-chevron">›</div>
          </button>
        ))}
      </div>
      <div className="qs-panel-footer">
        <button className="qs-create" onClick={createSet}>+ New set</button>
      </div>
    </div>
  );

  const QuestionPanel = (
    <div className={`qs-panel qs-questions${selectedQuestion ? '' : ' qs-questions-full'}`}>
      <div className="qs-panel-header qs-questions-header">
        <button className="qs-back" onClick={() => setMobileView('sets')}><BackIcon /></button>
        <span className="qs-header-title">{selectedSet ? selectedSet.title : 'Questions'}</span>
        <button className="qs-create-small" onClick={createQuestion}>+ Q</button>
      </div>
      <div className="qs-scroll">
        {loadingQuestions && <div className="qs-empty">Loading…</div>}
        {!loadingQuestions && questions.length === 0 && <div className="qs-empty">No questions</div>}
        {questions.map(q => {
          const stats = statsForQuestion(q.id);
          return (
            <button key={q.id} className={`qs-row qs-question-btn${selectedQuestion?.id === q.id ? ' active' : ''}`} onClick={() => pickQuestion(q)}>
              <div className="qs-question-text">{q.text}</div>
              <div className="qs-question-meta">
                <span className="qs-badge">{stats.complete}/{stats.count || 0}</span>
                <svg className="qs-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const ReviewPanel = (
    <div className="qs-panel qs-review">
      {selectedQuestion ? (
        <div>
          <div className="qs-panel-header qs-review-header">
            <button className="qs-back" onClick={() => setMobileView('questions')}><BackIcon /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedQuestion.text}</div>
            </div>
          </div>

          <div className="qs-content">
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 6 }}>Responses</div>
              {loadingResponses && <div className="qs-empty">Loading…</div>}
              {!loadingResponses && responses.filter(r => r.questionId === selectedQuestion.id).length === 0 && (
                <div className="qs-empty">No responses yet</div>
              )}

              {responses.filter(r => r.questionId === selectedQuestion.id).map(r => (
                <div key={r.id} className="qs-response-row">
                  <div className="qs-response-meta">
                    <div className="qs-response-user">{r.user}</div>
                    <div className="qs-response-date">{formatDate(r.created_at)}</div>
                  </div>
                  <textarea className="qs-response-text" value={r.answer} onChange={e => saveResponseEdit({ ...r, answer: e.target.value })} />
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 6 }}>Edit question</div>
              <textarea className="qs-edit-question" value={selectedQuestion.text} onChange={e => saveQuestionEdit({ ...selectedQuestion, text: e.target.value })} />
            </div>
          </div>
        </div>
      ) : (
        <div className="qs-no-review">Select a question to review</div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop layout: three-column */}
      <div className="s-backbone qs-desktop" style={{ overflow: 'hidden' }}>
        {SetsPanel}
        {QuestionPanel}
        {selectedQuestion && ReviewPanel}
      </div>

      {/* Mobile stacked views */}
      <div className="qs-mobile">
        {mobileView === 'sets' && SetsPanel}
        {mobileView === 'questions' && QuestionPanel}
        {mobileView === 'review' && ReviewPanel}
      </div>

      <style>{`
        .qs-desktop { display: flex !important; }
        .qs-mobile { display: none; }
        @media (max-width: 640px) { .qs-desktop { display: none !important; } .qs-mobile { display: flex; flex-direction: column; height: 100%; } }

        .qs-panel { display: flex; flex-direction: column; overflow: hidden; height: 100%; }
        .qs-sets { width: 220px; flex-shrink: 0; border-right: 1px solid var(--line); }
        .qs-questions { width: 320px; flex-shrink: 0; border-right: 1px solid var(--line); }
        .qs-questions-full { flex: 1; width: auto; }
        .qs-review { flex: 1; min-width: 0; }

        .qs-panel-header { padding: 14px 16px 12px; border-bottom: 1px solid var(--line); flex-shrink: 0; }
        .qs-label { font-size: 9px; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text4); margin-bottom: 4px; }
        .qs-title { font-size: 18px; font-weight: 700; color: var(--text); }

        .qs-search { padding: 10px 12px 8px; border-bottom: 1px solid var(--line); }
        .qs-search input { width: 100%; height: 34px; padding: 6px 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg2); color: var(--text); }

        .qs-scroll { flex: 1; overflow-y: auto; padding: 6px 0; }
        .qs-empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--text4); }

        .qs-row { display: flex; align-items: center; justify-content: space-between; width: 100%; background: none; border: none; cursor: pointer; padding: 10px 14px; text-align: left; }
        .qs-row:hover { background: var(--bg2); }
        .qs-set-btn.active { background: color-mix(in srgb, var(--gg) 10%, var(--bg)); border-left: 3px solid var(--green); }

        .qs-set-title { font-size: 13px; font-weight: 700; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .qs-set-sub { font-size: 11px; color: var(--text4); margin-top: 4px; }

        .qs-panel-footer { padding: 10px 12px; border-top: 1px solid var(--line); flex-shrink: 0; }
        .qs-create { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--sg); color: var(--text); font-weight: 700; }

        .qs-questions-header { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--bg2); }
        .qs-back { display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; padding: 4px; color: var(--text2); border-radius: 6px; }
        .qs-desktop .qs-back { display: none; }
        .qs-header-title { flex: 1; font-size: 14px; font-weight: 700; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .qs-create-small { padding: 6px 10px; border-radius: 7px; border: 1px solid var(--line); background: var(--sg); cursor: pointer; }

        .qs-question-btn { display: flex; align-items: center; gap: 8px; padding: 10px 14px; }
        .qs-question-btn.active { background: color-mix(in srgb, var(--gg) 10%, var(--bg)); border-left: 3px solid var(--green); }
        .qs-question-text { flex: 1; font-size: 13px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .qs-question-meta { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .qs-badge { background: var(--bg3); border-radius: 6px; padding: 6px 8px; font-size: 12px; font-weight: 700; color: var(--text4); }

        .qs-review-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--line); }
        .qs-content { padding: 16px 20px 40px; overflow-y: auto; }

        .qs-response-row { border: 1px solid var(--line); border-radius: 10px; padding: 10px; margin-bottom: 10px; background: var(--bg2); }
        .qs-response-meta { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .qs-response-user { font-weight: 700; color: var(--text); }
        .qs-response-date { font-size: 12px; color: var(--text4); }
        .qs-response-text { width: 100%; min-height: 64px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); color: var(--text); resize: vertical; }

        .qs-edit-question { width: 100%; min-height: 70px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); color: var(--text); resize: vertical; }

        .qs-no-review { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text4); font-size: 13px; }
      `}</style>
    </>
  );
}
