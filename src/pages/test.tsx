import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  FullscreenExitOutlined,
  PlayCircleOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  WarningFilled,
} from '@ant-design/icons';
import { Progress, Spin, Tooltip, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useNextQuestion,
  usePracticeEligibility,
  usePracticeInfo,
  useSessionProgress,
  useStartSession,
  useSubmitAnswer,
} from '../hooks/useCandidatePortal';
import { useAntiCheat } from '../hooks/useAntiCheat';
import { useAppSelector } from '../app/hooks';
import IntegrityGate from '../components/test/integrityGate';
import Watermark from '../components/test/watermark';
import { HUMAN_LABELS } from '../types/integrity';
import { apiFetch } from '../lib/api';
import type { NextQuestionResponse, QuestionOption } from '../types/portal';

const normalizeOptions = (question?: NextQuestionResponse): QuestionOption[] => {
  if (!question?.options) return [];

  if (Array.isArray(question.options)) {
    return question.options.map((option) => ({
      id: String(option.id),
      text: String(option.text),
    }));
  }

  return Object.entries(question.options).map(([key, value]) => {
    if (typeof value === 'string') {
      return { id: key, text: value };
    }

    return {
      id: String(value.id ?? key),
      text: String(value.text ?? key),
    };
  });
};

const formatSeconds = (value?: number | null) => {
  if (value === null || value === undefined) return 'No limit';
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
};

const TestPage: React.FC = () => {
  const { practiceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [answerState, setAnswerState] = useState<{ questionId: string | null; answerId: string | null }>({
    questionId: null,
    answerId: null,
  });
  const [gateOpen, setGateOpen] = useState(false);
  const questionStartedAtRef = useRef(0);
  const autoSubmittedRef = useRef(false);
  const { data: practice, isLoading: practiceLoading } = usePracticeInfo(practiceId);
  const { data: eligibility, isLoading: eligibilityLoading } = usePracticeEligibility(practiceId);
  const effectiveSessionId = sessionId ?? (eligibility?.can_resume ? eligibility.session_id ?? undefined : undefined);
  const startSession = useStartSession();
  const { data: progress } = useSessionProgress(effectiveSessionId);
  const nextQuestion = useNextQuestion(effectiveSessionId && !progress?.is_finished ? effectiveSessionId : undefined);
  const submitAnswer = useSubmitAnswer(effectiveSessionId);
  const options = useMemo(() => normalizeOptions(nextQuestion.data), [nextQuestion.data]);
  const selectedAnswer = answerState.questionId === nextQuestion.data?.id ? answerState.answerId : null;

  const studentDisplayName = useMemo(() => {
    if (!user) return 'Student';
    const fullName = [user.name, user.surname].filter(Boolean).join(' ').trim();
    return fullName || user.username || user.email || 'Student';
  }, [user]);

  const watermarkLabel = useMemo(() => {
    const id = user?.id ? ` · ${user.id.slice(0, 8)}` : '';
    return `${studentDisplayName}${id}`;
  }, [studentDisplayName, user]);

  const isTestActive = Boolean(effectiveSessionId) && !progress?.is_finished;

  const handleAutoSubmit = useCallback(async () => {
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    if (!effectiveSessionId) return;
    try {
      await apiFetch(`/testing/sessions/${effectiveSessionId}/finish`, {
        method: 'POST',
      });
    } catch {
      // Even if the finish call fails, redirecting away is the right UX —
      // the server timer will still finalize the session if the user
      // closes the tab.
    }
    message.warning('Your test was auto-submitted due to integrity violations.');
    navigate(`/reports/${effectiveSessionId}`, { replace: true });
  }, [effectiveSessionId, navigate]);

  const { penalty, warning, integrityScore, reportEvent, violations } = useAntiCheat({
    sessionId: effectiveSessionId,
    enabled: isTestActive,
    onHardStop: handleAutoSubmit,
  });

  useEffect(() => {
    if (eligibility?.status === 'finished' && eligibility.session_id) {
      navigate(`/reports/${eligibility.session_id}`, { replace: true });
    }
  }, [eligibility, navigate]);

  useEffect(() => {
    if (nextQuestion.data?.event === 'question_data') {
      questionStartedAtRef.current = Date.now();
    }
    if (nextQuestion.data?.event === 'test_finished' && effectiveSessionId) {
      navigate(`/reports/${effectiveSessionId}`, { replace: true });
    }
  }, [nextQuestion.data, navigate, effectiveSessionId]);

  const handleStartClick = () => {
    if (!practiceId) return;
    if (eligibility?.can_resume) {
      // Resuming an in-flight session — skip the policy gate but still
      // log an audit event.
      void runStart({ requestFullscreen: false, resume: true });
      return;
    }
    setGateOpen(true);
  };

  const runStart = async (opts: { requestFullscreen: boolean; resume?: boolean }) => {
    if (!practiceId) return;
    try {
      const session = await startSession.mutateAsync(practiceId);
      setSessionId(session.session_id);
      setGateOpen(false);
      reportEvent(opts.resume ? 'session_resumed' : 'policy_accepted', {
        request_fullscreen: opts.requestFullscreen,
      });
      if (opts.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
        } catch {
          reportEvent('fullscreen_request_denied');
        }
      }
      message.success('Assessment ready.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to start assessment.');
    }
  };

  const handleSubmit = async () => {
    if (!nextQuestion.data?.id || !selectedAnswer) return;
    try {
      const result = await submitAnswer.mutateAsync({
        question_id: nextQuestion.data.id,
        user_answer: selectedAnswer,
        time_spent: Math.max(1, Math.round((Date.now() - questionStartedAtRef.current) / 1000)),
      });

      if (result.is_finished && effectiveSessionId) {
        navigate(`/reports/${effectiveSessionId}`, { replace: true });
        return;
      }

      await nextQuestion.refetch();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to submit answer.');
    }
  };

  if (practiceLoading || eligibilityLoading) {
    return (
      <div className="min-h-120 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!practice) {
    return <div className="bg-white rounded-3xl border border-rose-100 p-12 text-center text-rose-500">Assessment is unavailable.</div>;
  }

  const answered = progress?.answered_count ?? nextQuestion.data?.progress?.answered_count ?? 0;
  const total = progress?.total_questions ?? practice.question_count;
  const percent = total ? Math.round((answered / total) * 100) : 0;
  const isBlocked = eligibility && !eligibility.can_start && !eligibility.can_resume && eligibility.status !== 'finished';

  const integrityTone = integrityScore >= 90 ? 'text-emerald-600 bg-emerald-50' : integrityScore >= 70 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50';
  const recentViolations = violations.slice(-3).reverse();

  if (!effectiveSessionId) {
    return (
      <div className="max-w-220 mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <button onClick={() => navigate('/my-assessments')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black transition-colors cursor-pointer">
          <ArrowLeftOutlined /> Back to assessments
        </button>

        <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">{practice.tags.join(' / ') || 'Assessment'}</p>
              <h1 className="text-4xl font-black tracking-tighter text-gray-900 mb-4">{practice.title}</h1>
              <p className="text-gray-500 leading-relaxed max-w-180">{practice.description || 'You can start this assessment when ready.'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-64">
              <div className="rounded-3xl bg-gray-50 p-5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Questions</p>
                <p className="text-2xl font-black text-gray-900">{practice.question_count}</p>
              </div>
              <div className="rounded-3xl bg-gray-50 p-5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</p>
                <p className="text-2xl font-black text-gray-900">{practice.duration_minutes}m</p>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 p-4 flex items-start gap-3 text-sm">
            <SafetyCertificateOutlined className="mt-0.5 text-lg" />
            <div className="space-y-1">
              <p className="font-bold">Proctored session</p>
              <p className="text-blue-700/80 leading-relaxed">
                Tab switches, copy/paste, right-click and developer tools are
                monitored. Questions and answer options are randomized per
                attempt, and the next question adapts to your previous
                answers.
              </p>
            </div>
          </div>

          {isBlocked && (
            <div className="mt-4 rounded-2xl bg-amber-50 text-amber-700 p-4 text-sm font-semibold">
              {eligibility.reason ?? 'This assessment is not available.'}
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleStartClick}
              disabled={startSession.isPending || Boolean(isBlocked)}
              className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3.5 rounded-2xl font-bold text-[13px] hover:bg-gray-800 transition-all shadow-lg shadow-black/10 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <PlayCircleOutlined />
              {eligibility?.can_resume ? 'Resume Assessment' : 'Start Assessment'}
            </button>
            <button onClick={() => navigate('/my-assessments')} className="px-6 py-3.5 rounded-2xl font-bold text-[13px] border border-gray-200 hover:bg-gray-50 transition-all cursor-pointer">
              Later
            </button>
          </div>
        </section>

        <IntegrityGate
          open={gateOpen}
          studentName={studentDisplayName}
          durationMinutes={practice.duration_minutes}
          questionCount={practice.question_count}
          onAccept={runStart}
          onCancel={() => setGateOpen(false)}
        />
      </div>
    );
  }

  if (nextQuestion.isLoading || !nextQuestion.data) {
    return (
      <div className="min-h-120 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const secondsLeft = progress?.seconds_remaining;
  const timerLow = typeof secondsLeft === 'number' && secondsLeft <= 60;

  return (
    <div className="relative max-w-240 mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 select-none">
      <Watermark label={watermarkLabel} />

      <div className="relative z-20 flex items-center justify-between gap-4 flex-wrap">
        <button onClick={() => navigate('/my-assessments')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black transition-colors cursor-pointer">
          <ArrowLeftOutlined /> Assessments
        </button>
        <div className="flex items-center gap-3">
          <Tooltip title={`Integrity score reflects logged anti-cheat events. ${violations.length} event(s) so far.`}>
            <div className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${integrityTone}`}>
              <SafetyCertificateOutlined /> Integrity {integrityScore}%
            </div>
          </Tooltip>
          <div className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${timerLow ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-white border-gray-100 text-gray-900'}`}>
            <ClockCircleOutlined className={timerLow ? 'text-rose-500' : 'text-gray-400'} />
            {formatSeconds(secondsLeft)}
          </div>
        </div>
      </div>

      {warning && (
        <div className="relative z-20 rounded-2xl border border-rose-100 bg-rose-50 text-rose-700 p-4 flex items-start gap-3 text-sm">
          <WarningFilled className="mt-0.5 text-lg" />
          <div className="flex-1 font-semibold">{warning}</div>
          <span className="text-xs font-black bg-white text-rose-700 px-2 py-1 rounded-full border border-rose-200">
            penalty {penalty}
          </span>
        </div>
      )}

      {recentViolations.length > 0 && (
        <div className="relative z-20 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-xs text-amber-800 flex items-start gap-3">
          <FullscreenExitOutlined className="mt-0.5 text-base" />
          <div>
            <p className="font-black uppercase tracking-widest mb-1">Recent integrity events</p>
            <ul className="space-y-0.5">
              {recentViolations.map((v) => (
                <li key={v.id} className="font-semibold">
                  · {HUMAN_LABELS[v.type] ?? v.type} ({v.severity})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <section className="relative z-20 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{practice.title}</p>
            <h1 className="text-2xl font-black text-gray-900">Question {answered + 1} of {total}</h1>
          </div>
          <div className="md:min-w-80">
            <Progress percent={percent} showInfo={false} strokeColor="#111827" />
          </div>
        </div>

        <div className="rounded-3xl bg-gray-50 p-6 mb-6">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">{nextQuestion.data.category ?? 'General'}</p>
          <h2 className="text-xl font-black text-gray-900 leading-relaxed">{nextQuestion.data.text}</h2>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => setAnswerState({ questionId: nextQuestion.data?.id ?? null, answerId: option.id })}
              className={`text-left rounded-2xl border p-5 font-semibold transition-all cursor-pointer ${
                selectedAnswer === option.id
                  ? 'bg-black text-white border-black shadow-lg shadow-black/10'
                  : 'bg-white border-gray-200 hover:border-gray-400'
              }`}
            >
              {option.text}
            </button>
          ))}
        </div>

        <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3">
          <p className="text-[11px] text-gray-400">Adaptive difficulty — your next question depends on how you answer.</p>
          <button
            onClick={handleSubmit}
            disabled={!selectedAnswer || submitAnswer.isPending}
            className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-bold text-[13px] hover:bg-gray-800 transition-all shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitAnswer.isPending ? 'Submitting…' : 'Submit answer'}
            <SendOutlined />
          </button>
        </div>
      </section>
    </div>
  );
};

export default TestPage;
