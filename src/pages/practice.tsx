import React, { useEffect, useMemo, useState } from 'react';
import {
  BulbOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  RetweetOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Segmented, Select, Spin, message } from 'antd';
import { fetchPracticeNextQuestion, usePracticeCategories } from '../hooks/useCandidatePortal';
import type { PracticeQuestion, QuestionOption } from '../types/portal';

const normalizeOptions = (question: PracticeQuestion | null): QuestionOption[] => {
  if (!question?.options) return [];
  if (Array.isArray(question.options)) {
    return question.options.map((option) => ({
      id: String(option.id),
      text: String(option.text),
    }));
  }
  return Object.entries(question.options).map(([key, value]) => {
    if (typeof value === 'string') return { id: key, text: value };
    return {
      id: String(value.id ?? key),
      text: String(value.text ?? key),
    };
  });
};

type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';

const PracticePage: React.FC = () => {
  const { data: categoriesData } = usePracticeCategories();
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [difficulty, setDifficulty] = useState<Difficulty>('mixed');
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [question, setQuestion] = useState<PracticeQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ attempted: 0, correct: 0 });

  const options = useMemo(() => normalizeOptions(question), [question]);

  const loadNext = React.useCallback(async (excludeIds: string[] = seenIds) => {
    setLoading(true);
    setSelected(null);
    setRevealed(false);
    try {
      const response = await fetchPracticeNextQuestion({
        category,
        difficulty: difficulty === 'mixed' ? undefined : difficulty,
        excludeIds,
      });
      if (response.event === 'exhausted' || !response.question) {
        setExhausted(true);
        setQuestion(null);
        return;
      }
      setExhausted(false);
      setQuestion(response.question);
      setSeenIds((prev) => [...prev, response.question!.id].slice(-100));
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Could not load a practice question.');
    } finally {
      setLoading(false);
    }
    // seenIds intentionally not in deps — we capture it via the param
    // above so this callback can also be invoked after a reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, difficulty]);

  useEffect(() => {
    // Reload when filters change. Pass an empty exclude list so a new
    // category starts fresh. The compiler lint rule flags this because
    // loadNext writes state, but here that's the intended behavior —
    // it's how we hydrate the page from the API on mount and on filter
    // change. Using react-query for this isn't a fit because the
    // question pool advances on each call rather than being a single
    // cacheable resource.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNext([]);
  }, [category, difficulty, loadNext]);

  const handleReveal = () => {
    if (!question || !selected) return;
    setRevealed(true);
    setScore((prev) => ({
      attempted: prev.attempted + 1,
      correct: prev.correct + (selected === question.correct_answer ? 1 : 0),
    }));
  };

  const handleReset = () => {
    setSeenIds([]);
    setScore({ attempted: 0, correct: 0 });
    setExhausted(false);
    void loadNext([]);
  };

  const accuracy = score.attempted ? Math.round((score.correct / score.attempted) * 100) : 0;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Untimed mode</p>
          <h2 className="text-4xl font-bold tracking-tighter text-gray-900 leading-none mb-3">Practice Lab</h2>
          <p className="text-gray-500 font-medium max-w-180">
            No timer, no scoring, no proctoring — drill questions from the same
            bank as your graded assessments. Great for shoring up weak areas
            before the real attempt.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-80">
          <div className="rounded-2xl bg-white border border-gray-100 p-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Attempted</p>
            <p className="text-2xl font-black text-gray-900">{score.attempted}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Correct</p>
            <p className="text-2xl font-black text-emerald-600">{score.correct}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Accuracy</p>
            <p className="text-2xl font-black text-gray-900">{accuracy}%</p>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Category</p>
          <Select
            allowClear
            placeholder="All categories"
            value={category}
            onChange={(value) => {
              setCategory(value || undefined);
              setSeenIds([]);
            }}
            options={(categoriesData?.items ?? []).map((c) => ({
              value: c.category,
              label: `${c.category} (${c.question_count})`,
            }))}
            className="w-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Difficulty</p>
          <Segmented
            block
            value={difficulty}
            onChange={(value) => {
              setDifficulty(value as Difficulty);
              setSeenIds([]);
            }}
            options={[
              { label: 'Mixed', value: 'mixed' },
              { label: 'Easy', value: 'easy' },
              { label: 'Medium', value: 'medium' },
              { label: 'Hard', value: 'hard' },
            ]}
          />
        </div>
        <button
          onClick={handleReset}
          className="self-end sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-[12px] border border-gray-200 hover:bg-gray-50 transition-all cursor-pointer"
          title="Clear seen-question history and start over."
        >
          <RetweetOutlined /> Reset run
        </button>
      </section>

      {loading ? (
        <div className="min-h-80 flex items-center justify-center">
          <Spin size="large" />
        </div>
      ) : exhausted ? (
        <section className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
          <div className="size-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <ThunderboltOutlined className="text-2xl" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">You've cleared the pool</h3>
          <p className="text-gray-500 max-w-100 mx-auto mb-6">
            No more unseen questions match these filters. Reset the run or
            change category / difficulty to keep practicing.
          </p>
          <button
            onClick={handleReset}
            className="px-5 py-3 rounded-2xl bg-black text-white font-bold text-[13px] hover:bg-gray-800 cursor-pointer"
          >
            Start a new run
          </button>
        </section>
      ) : question ? (
        <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-black uppercase tracking-widest">
              {question.category ?? 'General'}
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-black uppercase tracking-widest">
              Difficulty {question.difficulty_level !== null ? Math.round((question.difficulty_level ?? 0) * 100) : '?'}
            </span>
          </div>

          <div className="rounded-3xl bg-gray-50 p-6 mb-6">
            <h2 className="text-xl font-black text-gray-900 leading-relaxed">{question.text}</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 mb-6">
            {options.map((option) => {
              const isSelected = selected === option.id;
              const isCorrect = revealed && option.id === question.correct_answer;
              const isWrong = revealed && isSelected && option.id !== question.correct_answer;
              return (
                <button
                  key={option.id}
                  onClick={() => !revealed && setSelected(option.id)}
                  disabled={revealed}
                  className={`text-left rounded-2xl border p-5 font-semibold transition-all cursor-pointer ${
                    isCorrect
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : isWrong
                      ? 'border-rose-300 bg-rose-50 text-rose-700'
                      : isSelected
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 bg-white hover:border-gray-400'
                  } disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span>{option.text}</span>
                    {isCorrect && <CheckCircleFilled />}
                    {isWrong && <CloseCircleFilled />}
                  </div>
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 mb-6 text-sm text-blue-700 flex items-start gap-3">
              <BulbOutlined className="mt-1" />
              <div>
                <p className="font-bold mb-1">
                  {selected === question.correct_answer ? 'Correct.' : 'Not quite.'}
                </p>
                <p className="text-blue-700/80">
                  Adaptive difficulty in real assessments means a streak of
                  correct answers will pull harder questions toward you next
                  time.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3">
            <p className="text-[11px] text-gray-400">Practice answers are not graded or shared.</p>
            <div className="flex gap-3">
              {!revealed ? (
                <button
                  onClick={handleReveal}
                  disabled={!selected}
                  className="px-5 py-3 rounded-2xl bg-black text-white font-bold text-[13px] hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Check answer
                </button>
              ) : (
                <button
                  onClick={() => loadNext()}
                  className="px-5 py-3 rounded-2xl bg-black text-white font-bold text-[13px] hover:bg-gray-800 cursor-pointer"
                >
                  Next question
                </button>
              )}
              <button
                onClick={() => loadNext()}
                className="px-5 py-3 rounded-2xl border border-gray-200 font-bold text-[13px] hover:bg-gray-50 cursor-pointer"
              >
                Skip
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-white rounded-3xl border border-rose-100 p-12 text-center text-rose-500">
          No practice questions are available right now.
        </section>
      )}
    </div>
  );
};

export default PracticePage;
