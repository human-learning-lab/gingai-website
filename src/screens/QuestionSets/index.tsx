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

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSetTitle, setNewSetTitle] = useState('');
  const [newQuestions, setNewQuestions] = useState<string[]>(['']);
  const [creating, setCreating] = useState(false);

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

  // Open modal to create a new set with multiple questions
  function openCreateModal() {
    setNewSetTitle('');
    setNewQuestions(['']);
    setShowCreateModal(true);
  }

  function addNewQuestionRow() {
    setNewQuestions(prev => [...prev, '']);
  }

  function removeNewQuestionRow(idx: number) {
    setNewQuestions(prev => prev.filter((_, i) => i !== idx));
  }

  function updateNewQuestion(idx: number, text: string) {
    setNewQuestions(prev => prev.map((q, i) => i === idx ? text : q));
  }

  async function submitNewSet() {
    if (!newSetTitle.trim()) return alert('Please enter a title for the set');
    const questionsToCreate = newQuestions.map(q => q.trim()).filter(Boolean);
    if (questionsToCreate.length === 0) return alert('Please add at least one question');

    setCreating(true);
    const localSet: QuestionSet = { id: 'local-' + Date.now(), title: newSetTitle, created_at: new Date().toISOString() };
    // optimistic
    setSets(prev => [localSet, ...prev]);
    setShowCreateModal(false);

    try {
      const res = await fetch('/api/question-sets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSetTitle, questions: questionsToCreate }),
      });
      if (res.ok) {
        const created = await res.json();
        // Expecting created to be the new set (and optionally include questions)
        if (created?.id) {
          setSets(prev => [created, ...prev.filter(s => s.id !== localSet.id)]);
          // If API returns questions, update UI for that set when selected
          if (created.questions && created.questions.length) {
            // Navigate to the new set and populate questions
            setSelectedSet(created as QuestionSet);
            setQuestions(created.questions as Question[]);
            setMobileView('questions');
          }
        }
      } else {
        // revert optimistic
        //setSets(prev => prev.filter(s => s.id !== localSet.id));
        //alert('Failed to create set');
      }
    } catch (e) {
      //setSets(prev => prev.filter(s => s.id !== localSet.id));
      //alert('Failed to create set');
    } finally {
      setCreating(false);
    }
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
        <button className="qs-create" onClick={openCreateModal}>+ New set</button>
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

      {/* Create set modal */}
      {showCreateModal && (
        <div className="qs-modal-overlay" role="dialog" aria-modal="true">
          <div className="qs-modal">
            <div className="qs-modal-header">
              <div style={{ fontSize: 14, fontWeight: 800 }}>New question set</div>
              <button onClick={() => setShowCreateModal(false)} className="qs-modal-close">✕</button>
            </div>
            <div className="qs-modal-body">
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 6 }}>Title</div>
                <input value={newSetTitle} onChange={e => setNewSetTitle(e.target.value)} placeholder="Set title" className="qs-input" />
              </div>

              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text4)' }}>Questions</div>
                <button className="qs-add-question" onClick={addNewQuestionRow}>+ Add question</button>
              </div>

              <div className="qs-new-questions">
                {newQuestions.map((q, i) => (
                  <div key={i} className="qs-new-row">
                    <textarea className="qs-new-text" value={q} onChange={e => updateNewQuestion(i, e.target.value)} placeholder={`Question ${i + 1}`} />
                    <button className="qs-remove-q" onClick={() => removeNewQuestionRow(i)} aria-label="Remove question">−</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="qs-modal-footer">
              <button className="qs-modal-cancel" onClick={() => setShowCreateModal(false)} disabled={creating}>Cancel</button>
              <button className="qs-modal-create" onClick={submitNewSet} disabled={creating}>{creating ? 'Creating…' : 'Create set'}</button>
            </div>
          </div>
        </div>
      )}

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

        /* Modal styles */
        .qs-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 80; }
        .qs-modal { width: min(880px, 96%); max-height: 86vh; background: var(--bg); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
        .qs-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--line); }
        .qs-modal-close { background: none; border: none; cursor: pointer; font-size: 16px; color: var(--text4); }
        .qs-modal-body { padding: 16px 18px; overflow: auto; }
        .qs-input { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg2); color: var(--text); }

        .qs-add-question { background: none; border: none; color: var(--sim); cursor: pointer; font-weight: 700; }
        .qs-new-questions { display: flex; flex-direction: column; gap: 8px; }
        .qs-new-row { display: flex; gap: 8px; align-items: flex-start; }
        .qs-new-text { flex: 1; min-height: 56px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); color: var(--text); resize: vertical; }
        .qs-remove-q { width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--line); background: none; cursor: pointer; }

        .qs-modal-footer { padding: 12px 18px; display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid var(--line); }
        .qs-modal-cancel { padding: 8px 14px; border-radius: 8px; border: 1px solid var(--line); background: none; cursor: pointer; }
        .qs-modal-create { padding: 8px 14px; border-radius: 8px; border: none; background: var(--sim); color: #fff; font-weight: 700; cursor: pointer; }
      `}</style>
    </>
  );
}
