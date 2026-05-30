import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  WarningFilled,
} from '@ant-design/icons';
import { Modal, Progress, Spin, message } from 'antd';
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
import CameraTile, { type CameraStatus } from '../components/test/cameraTile';
import { apiFetch } from '../lib/api';
import { useI18n } from '../i18n';
import type { NextQuestionResponse, QuestionOption } from '../types/portal';

const API_URL = import.meta.env.VITE_API_URL ?? '';

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
  if (value === null || value === undefined) return '—';
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
};

const isMobileTestDevice = () => {
  const ua = navigator.userAgent.toLowerCase();
  const mobileUa = /android|iphone|ipad|ipod|mobile|windows phone|opera mini/.test(ua);
  const coarseSmallScreen = window.matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 800;
  return mobileUa || coarseSmallScreen;
};

const hasMultipleScreens = async () => {
  const screenAny = window.screen as Screen & { isExtended?: boolean };
  if (screenAny.isExtended) return true;
  const windowAny = window as Window & {
    getScreenDetails?: () => Promise<{ screens?: unknown[] }>;
  };
  if (typeof windowAny.getScreenDetails !== 'function') return false;
  try {
    const details = await windowAny.getScreenDetails();
    return (details.screens?.length ?? 1) > 1;
  } catch {
    return false;
  }
};

/**
 * Fire the abandon beacon. Uses `navigator.sendBeacon` so the browser
 * will still deliver it during `pagehide`/`beforeunload`, when a regular
 * fetch is silently cancelled.
 *
 * The beacon API does not let us set headers, so we fall back to a
 * `fetch` with `keepalive` if the auth token is required. (Most
 * deployments accept the bearer header from sendBeacon's blob payload,
 * but we go through fetch for correctness.)
 */
const fireAbandonBeacon = (sessionId: string) => {
  const token = localStorage.getItem('token');
  const url = `${API_URL}/testing/sessions/${sessionId}/abandon`;
  try {
    fetch(url, {
      method: 'POST',
      keepalive: true,
      headers: token
        ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' },
      body: '{}',
    }).catch(() => undefined);
  } catch {
    // ignore — best effort
  }
};

const fireIntegrityBeacon = (sessionId: string, eventType: string) => {
  const token = localStorage.getItem('token');
  const url = `${API_URL}/testing/sessions/${sessionId}/events`;
  try {
    fetch(url, {
      method: 'POST',
      keepalive: true,
      headers: token
        ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        severity: 'critical',
        payload: { source: 'test_page' },
      }),
    }).catch(() => undefined);
  } catch {
    // best effort during unload
  }
};

const TestPage: React.FC = () => {
  const { practiceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { t } = useI18n();
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [answerState, setAnswerState] = useState<{
    questionId: string | null;
    answerId: string | null;
  }>({
    questionId: null,
    answerId: null,
  });
  const [gateOpen, setGateOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const questionStartedAtRef = useRef(0);
  const autoSubmittedRef = useRef(false);
  const abandonFiredRef = useRef(false);
  // Wall-clock timestamp of when the session was created. Used to
  // suppress spurious tab-hidden / fullscreen-change events during
  // the first ~2s of the test (camera permission prompt, fullscreen
  // transition, etc.) which the OS sometimes briefly hides our tab
  // for and would otherwise be treated as cheating.
  const sessionStartedAtRef = useRef(0);
  const START_GRACE_MS = 2000;
  const mobileBlocked = useMemo(() => isMobileTestDevice(), []);

  const { data: practice, isLoading: practiceLoading } = usePracticeInfo(practiceId);
  const { data: eligibility, isLoading: eligibilityLoading } = usePracticeEligibility(practiceId);
  // Derive the active session id from React state OR an existing
  // `in_progress` session reported by the backend — covers two cases:
  //   1. fresh start: setSessionId fires from useStartSession.onSuccess,
  //      the post-start refetch then echoes the same id back as
  //      `in_progress` and we keep it.
  //   2. hard refresh during the test: React state is empty but the
  //      backend still reports `in_progress` so the test page picks
  //      the session back up instead of reverting to the intro screen.
  const resumableSessionId =
    eligibility?.status === 'in_progress' && eligibility.session_id
      ? eligibility.session_id
      : undefined;
  const effectiveSessionId = sessionId ?? resumableSessionId;
  const startSession = useStartSession();
  const { data: progress } = useSessionProgress(effectiveSessionId);
  const nextQuestion = useNextQuestion(
    effectiveSessionId && !progress?.is_finished ? effectiveSessionId : undefined,
  );
  const submitAnswer = useSubmitAnswer(effectiveSessionId);
  const options = useMemo(() => normalizeOptions(nextQuestion.data), [nextQuestion.data]);
  const selectedAnswer =
    answerState.questionId === nextQuestion.data?.id ? answerState.answerId : null;

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

  // Lock the body & html into a fullscreen, no-scroll shell while the
  // test is running. The `.tf-test-shell` class is defined in
  // `src/index.css` and prevents background scrolling and stretches
  // the surface across the viewport.
  useEffect(() => {
    if (isTestActive) {
      document.documentElement.classList.add('tf-test-shell');
      document.body.classList.add('tf-test-shell');
    } else {
      document.documentElement.classList.remove('tf-test-shell');
      document.body.classList.remove('tf-test-shell');
    }
    return () => {
      document.documentElement.classList.remove('tf-test-shell');
      document.body.classList.remove('tf-test-shell');
    };
  }, [isTestActive]);

  const handleAutoSubmit = useCallback(async () => {
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    if (!effectiveSessionId) return;
    try {
      await apiFetch(`/testing/sessions/${effectiveSessionId}/abandon`, {
        method: 'POST',
      });
    } catch {
      // Network failure on abandon is fine — the eligibility endpoint
      // auto-finishes any abandoned session on the next page load.
    }
    message.warning(t('test.exitConfirmBody'));
    navigate(`/reports/${effectiveSessionId}`, { replace: true });
  }, [effectiveSessionId, navigate, t]);

  const handleIntegrityStop = useCallback(() => {
    if (!effectiveSessionId || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    message.error('Integrity violation detected. Your test was closed with a zero score.');
    navigate(`/reports/${effectiveSessionId}`, { replace: true });
  }, [effectiveSessionId, navigate]);

  const recordCheatingAndStop = useCallback(
    async (eventType: string, payload?: Record<string, unknown>) => {
      if (!effectiveSessionId || autoSubmittedRef.current) return;
      autoSubmittedRef.current = true;
      try {
        await apiFetch(`/testing/sessions/${effectiveSessionId}/events`, {
          method: 'POST',
          body: JSON.stringify({
            event_type: eventType,
            severity: 'critical',
            payload: payload ?? {},
          }),
        });
      } catch {
        fireIntegrityBeacon(effectiveSessionId, eventType);
      }
      message.error('Integrity violation detected. Your test was closed with a zero score.');
      navigate(`/reports/${effectiveSessionId}`, { replace: true });
    },
    [effectiveSessionId, navigate],
  );

  // Soft toast on logged violations — replaces the giant penalty banner.
  const handleViolationToast = useCallback(
    (violation: { type: string }) => {
      if (violation.type === 'copy_blocked' || violation.type === 'paste_blocked') {
        setToast(t('test.copyWarn'));
      } else if (violation.type === 'right_click_blocked') {
        setToast(t('test.rightClickWarn'));
      }
    },
    [t],
  );

  const { reportEvent } = useAntiCheat({
    sessionId: effectiveSessionId,
    enabled: isTestActive,
    onHardStop: handleIntegrityStop,
    onViolation: handleViolationToast,
  });

  // If the backend says the user already finished or the timer expired,
  // route straight to the report. `already_attempted` is the legacy
  // status the backend used to return for both finished AND in-progress
  // sessions — we keep it here for one release of compatibility but it
  // should never be returned anymore.
  useEffect(() => {
    if (!eligibility?.session_id) return;
    const terminal =
      eligibility.status === 'finished' ||
      eligibility.status === 'duration_exceeded' ||
      eligibility.status === 'already_attempted';
    if (terminal) {
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

  // Abandon-beacon: any time the test is active and the user leaves
  // (closes the tab, navigates away, switches windows, exits
  // fullscreen) we fire `POST /sessions/{id}/abandon` so the backend
  // immediately marks the session finished. Per the no-resume policy,
  // this is intentional and irrevocable.
  useEffect(() => {
    if (!isTestActive || !effectiveSessionId) return;

    const fire = (eventType = 'page_unload_attempt') => {
      if (abandonFiredRef.current) return;
      abandonFiredRef.current = true;
      fireIntegrityBeacon(effectiveSessionId, eventType);
    };

    const withinGrace = () => {
      const startedAt = sessionStartedAtRef.current;
      return startedAt > 0 && Date.now() - startedAt < START_GRACE_MS;
    };

    const onVisibility = () => {
      if (!document.hidden) return;
      // Ignore briefly-hidden during start-up: OS permission prompts
      // (camera/fullscreen) can momentarily flip document.hidden true.
      if (withinGrace()) return;
      void recordCheatingAndStop('tab_hidden', { reason: 'left_test_tab' });
    };
    const onPageHide = () => {
      fire();
    };
    const onBeforeUnload = () => {
      fire();
    };
    const onFullscreenChange = () => {
      // Exiting fullscreen during an active test is treated as leaving,
      // except during the start-up grace window where the transition
      // itself fires this event before the user can even see the page.
      if (!document.fullscreenElement && !withinGrace()) {
        void recordCheatingAndStop('fullscreen_exit', { reason: 'fullscreen_closed' });
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [isTestActive, effectiveSessionId, recordCheatingAndStop]);

  // Auto-dismiss soft toast after a beat so the test surface doesn't
  // accumulate banners.
  useEffect(() => {
    if (!toast) return;
    const handle = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(handle);
  }, [toast]);

  const handleStartClick = () => {
    if (!practiceId) return;
    if (mobileBlocked) {
      message.error('Tests can only be started from a desktop or laptop browser.');
      return;
    }
    setGateOpen(true);
  };

  const runStart = async (opts: {
    requestFullscreen: boolean;
    cameraAvailable: boolean;
  }) => {
    if (!practiceId) return;
    if (mobileBlocked) {
      message.error('Tests can only be started from a desktop or laptop browser.');
      return;
    }
    try {
      if (await hasMultipleScreens()) {
        message.error('Disconnect extra displays before starting the test.');
        return;
      }
      if (opts.requestFullscreen) {
        if (!document.fullscreenEnabled) {
          message.error('Fullscreen is required to start this test.');
          return;
        }
        try {
          await document.documentElement.requestFullscreen();
        } catch {
          message.error('Please allow fullscreen to start this test.');
          return;
        }
      }
      const session = await startSession.mutateAsync(practiceId);
      setSessionId(session.session_id);
      setGateOpen(false);
      // Mark the session-start moment so the abandon listeners can
      // ignore spurious focus/visibility events triggered by the
      // fullscreen / camera permission prompts during start-up.
      sessionStartedAtRef.current = Date.now();
      reportEvent('policy_accepted', {
        request_fullscreen: opts.requestFullscreen,
        camera_available: opts.cameraAvailable,
      });
      if (!opts.cameraAvailable) {
        // Camera was denied or no device — proctoring tile won't run.
        // Logged as info so it does NOT count as a strike on the
        // backend's two-strikes-and-out policy.
        reportEvent('camera_unavailable', {
          reason: 'preflight_denied_or_missing',
        });
      }
    } catch (error) {
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => undefined);
      }
      message.error(error instanceof Error ? error.message : t('errors.generic'));
    }
  };

  const handleSubmit = async () => {
    if (!nextQuestion.data?.id || !selectedAnswer) return;
    try {
      // Perf: this single mutate also returns the next adaptive
      // question in its response — `useSubmitAnswer` seeds the
      // next-question cache from `data.next_question`, so we no
      // longer need a separate `nextQuestion.refetch()` round-trip.
      const result = await submitAnswer.mutateAsync({
        question_id: nextQuestion.data.id,
        user_answer: selectedAnswer,
        time_spent: Math.max(
          1,
          Math.round((Date.now() - questionStartedAtRef.current) / 1000),
        ),
      });

      if (result.is_finished && effectiveSessionId) {
        navigate(`/reports/${effectiveSessionId}`, { replace: true });
        return;
      }

      // Defensive: if the backend (older deployment) didn't include
      // the next question payload, fall back to a refetch so we don't
      // end up stuck on the just-answered question.
      if (!result.next_question) {
        await nextQuestion.refetch();
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : t('errors.generic'));
    }
  };

  // Back / "leave" → confirm modal. Confirming calls /abandon and
  // routes to the report.
  const handleLeaveAttempt = () => {
    if (!isTestActive) {
      navigate('/my-assessments');
      return;
    }
    setExitOpen(true);
  };

  const confirmExit = async () => {
    setExitOpen(false);
    if (effectiveSessionId) fireAbandonBeacon(effectiveSessionId);
    await handleAutoSubmit();
  };

  if (practiceLoading || eligibilityLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFC] dark:bg-[#0d1018]">
        <Spin size="large" />
      </div>
    );
  }

  if (!practice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFC] dark:bg-[#0d1018] p-6">
        <div className="bg-white rounded-3xl border border-rose-100 p-12 text-center text-rose-500 max-w-md">
          {t('test.unavailable')}
        </div>
      </div>
    );
  }

  const answered =
    progress?.answered_count ?? nextQuestion.data?.progress?.answered_count ?? 0;
  const total = progress?.total_questions ?? practice.question_count;
  const percent = total ? Math.round((answered / total) * 100) : 0;
  // No-resume policy (A5): a session is only not-started, in-progress
  // (this tab) or finished. We never offer a resume path — if the backend
  // says the user can't start and the session isn't terminal, the practice
  // is simply locked.
  const isBlocked =
    eligibility &&
    !eligibility.can_start &&
    eligibility.status !== 'finished' &&
    eligibility.status !== 'duration_exceeded' &&
    eligibility.status !== 'already_attempted';

  if (!effectiveSessionId) {
    return (
      <div className="min-h-screen bg-[#FBFBFC] dark:bg-[#0d1018] py-10 px-6">
        <div className="max-w-220 mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <button
          onClick={() => navigate('/my-assessments')}
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black transition-colors cursor-pointer"
        >
          <ArrowLeftOutlined /> {t('test.back')}
        </button>

        <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                {practice.tags.join(' / ') || t('nav.assessments')}
              </p>
              <h1 className="text-4xl font-black tracking-tighter text-gray-900 mb-4">
                {practice.title}
              </h1>
              <p className="text-gray-500 leading-relaxed max-w-180">
                {practice.description || ''}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-64">
              <div className="rounded-3xl bg-gray-50 p-5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {t('test.questions')}
                </p>
                <p className="text-2xl font-black text-gray-900">
                  {practice.question_count}
                </p>
              </div>
              <div className="rounded-3xl bg-gray-50 p-5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {t('test.duration')}
                </p>
                <p className="text-2xl font-black text-gray-900">
                  {practice.duration_minutes}m
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-rose-100 bg-rose-50 text-rose-700 p-4 flex items-start gap-3 text-sm">
            <SafetyCertificateOutlined className="mt-0.5 text-lg" />
            <div className="space-y-1">
              <p className="font-bold">{t('test.oneChance')}</p>
              <p className="text-rose-700/80 leading-relaxed">
                {t('test.proctoredBody')}
              </p>
            </div>
          </div>

          {isBlocked && (
            <div className="mt-4 rounded-2xl bg-amber-50 text-amber-700 p-4 text-sm font-semibold">
              {eligibility.reason ?? t('test.unavailable')}
            </div>
          )}
          {mobileBlocked && (
            <div className="mt-4 rounded-2xl bg-rose-50 text-rose-700 p-4 text-sm font-semibold">
              Tests are locked to desktop and laptop browsers. Please switch to a computer to start this assessment.
            </div>
          )}
          {(eligibility?.status === 'already_attempted' ||
            eligibility?.status === 'finished' ||
            eligibility?.status === 'duration_exceeded') && (
            <div className="mt-4 rounded-2xl bg-rose-50 text-rose-700 p-4 text-sm font-semibold">
              {t('test.alreadyAttempted')}
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleStartClick}
              disabled={
                startSession.isPending ||
                mobileBlocked ||
                Boolean(isBlocked) ||
                eligibility?.status === 'already_attempted' ||
                eligibility?.status === 'finished' ||
                eligibility?.status === 'duration_exceeded'
              }
              className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3.5 rounded-2xl font-bold text-[13px] hover:bg-gray-800 transition-all shadow-lg shadow-black/10 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <PlayCircleOutlined />
              {t('test.start')}
            </button>
            <button
              onClick={() => navigate('/my-assessments')}
              className="px-6 py-3.5 rounded-2xl font-bold text-[13px] border border-gray-200 hover:bg-gray-50 transition-all cursor-pointer"
            >
              {t('test.later')}
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
      </div>
    );
  }

  if (nextQuestion.isLoading || !nextQuestion.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFC] dark:bg-[#0d1018]">
        <Spin size="large" />
      </div>
    );
  }

  const secondsLeft = progress?.seconds_remaining;
  const timerLow = typeof secondsLeft === 'number' && secondsLeft <= 60;

  return (
    <div className="fixed inset-0 bg-[#FBFBFC] dark:bg-[#0d1018] overflow-y-auto">
      <Watermark label={watermarkLabel} />
      <CameraTile
        enabled={isTestActive}
        onStatusChange={setCameraStatus}
        onPresenceLost={(absentForMs) => reportEvent('face_not_detected', { absent_for_ms: absentForMs })}
      />

      {(cameraStatus === 'denied' ||
        cameraStatus === 'unavailable' ||
        cameraStatus === 'error') && (
        <div className="fixed top-4 left-56 right-4 z-50">
          <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 text-amber-900 p-3 flex items-start gap-2 text-xs font-bold shadow-lg">
            <WarningFilled className="mt-0.5 text-base text-amber-600" />
            <span>{t('test.cameraOffHint')}</span>
          </div>
        </div>
      )}

      <div className="relative max-w-240 mx-auto py-8 px-6 lg:px-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <div className="relative z-20 flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={handleLeaveAttempt}
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black transition-colors cursor-pointer"
        >
          <ArrowLeftOutlined /> {t('nav.assessments')}
        </button>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black bg-rose-50 text-rose-600">
            <SafetyCertificateOutlined /> {t('test.oneChance')}
          </div>
          <div
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${
              timerLow
                ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse'
                : 'bg-white border-gray-100 text-gray-900'
            }`}
          >
            <ClockCircleOutlined className={timerLow ? 'text-rose-500' : 'text-gray-400'} />
            {formatSeconds(secondsLeft)}
          </div>
        </div>
      </div>

      {toast && (
        <div className="relative z-20 rounded-2xl border border-amber-100 bg-amber-50 text-amber-800 p-3 flex items-start gap-2 text-xs font-semibold">
          <WarningFilled className="mt-0.5 text-base text-amber-500" />
          <span>{toast}</span>
        </div>
      )}

      <section className="relative z-20 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              {practice.title}
            </p>
            <h1 className="text-2xl font-black text-gray-900">
              {t('test.questionOf', { current: answered + 1, total })}
            </h1>
          </div>
          <div className="md:min-w-80">
            <Progress percent={percent} showInfo={false} strokeColor="#111827" />
          </div>
        </div>

        <div className="rounded-3xl bg-gray-50 p-6 mb-6">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
            {nextQuestion.data.category ?? 'General'}
          </p>
          <h2 className="text-xl font-black text-gray-900 leading-relaxed">
            {nextQuestion.data.text}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() =>
                setAnswerState({
                  questionId: nextQuestion.data?.id ?? null,
                  answerId: option.id,
                })
              }
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
          <p className="text-[11px] text-gray-400">{t('test.adaptiveHint')}</p>
          <button
            onClick={handleSubmit}
            disabled={!selectedAnswer || submitAnswer.isPending}
            className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-bold text-[13px] hover:bg-gray-800 transition-all shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitAnswer.isPending ? t('test.submitting') : t('test.submit')}
            <SendOutlined />
          </button>
        </div>
      </section>

      <Modal
        open={exitOpen}
        onCancel={() => setExitOpen(false)}
        centered
        footer={null}
        title={null}
        destroyOnHidden
      >
        <div className="space-y-5 pt-1">
          <h3 className="text-2xl font-black text-gray-900">
            {t('test.exitConfirm')}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {t('test.exitConfirmBody')}
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={() => setExitOpen(false)}
              className="px-5 py-3 rounded-2xl text-sm font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              {t('test.stay')}
            </button>
            <button
              type="button"
              onClick={confirmExit}
              className="px-5 py-3 rounded-2xl text-sm font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
            >
              {t('test.exit')}
            </button>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
};

export default TestPage;
