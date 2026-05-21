import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  LoadingOutlined,
  PlusOutlined,
  RobotFilled,
  SendOutlined,
  StopFilled,
} from '@ant-design/icons';
import { Input, Modal, message } from 'antd';
import { useI18n } from '../i18n';
import {
  useAIInterview,
  useAIInterviewHealth,
  useAIInterviews,
  useFinishAIInterview,
  useSendAIInterviewMessage,
  useStartAIInterview,
} from '../hooks/useAIInterview';
import type { AIInterviewSession } from '../types/portal';

const StatusPill: React.FC<{ session: AIInterviewSession }> = ({ session }) => {
  const { t } = useI18n();
  if (session.status === 'finished') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-2 py-1 text-[10px] font-black uppercase tracking-widest">
        <CheckCircleFilled /> {t('aiInterview.finished')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-600 px-2 py-1 text-[10px] font-black uppercase tracking-widest">
      <LoadingOutlined /> {t('aiInterview.active')}
    </span>
  );
};

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const AIInterviewPage: React.FC = () => {
  const { t } = useI18n();
  const health = useAIInterviewHealth();
  const list = useAIInterviews();
  const start = useStartAIInterview();
  const [activeId, setActiveId] = useState<string | undefined>();
  const [newOpen, setNewOpen] = useState(false);
  const [role, setRole] = useState('');
  const [context, setContext] = useState('');
  const [draft, setDraft] = useState('');
  const finish = useFinishAIInterview(activeId);
  const send = useSendAIInterviewMessage(activeId);
  const session = useAIInterview(activeId);
  const transcript = session.data?.messages ?? [];
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new messages.
  useEffect(() => {
    if (!transcriptRef.current) return;
    transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [transcript.length]);

  const configured = health.data?.configured ?? true;
  const items = list.data?.items ?? [];
  const activeStatus = session.data?.status;

  const canSend = useMemo(
    () =>
      Boolean(activeId) &&
      activeStatus === 'active' &&
      !send.isPending &&
      draft.trim().length > 0,
    [activeId, activeStatus, send.isPending, draft],
  );

  const handleStart = async () => {
    const trimmed = role.trim();
    if (!trimmed) {
      message.error(t('aiInterview.roleLabel'));
      return;
    }
    try {
      const created = await start.mutateAsync({
        role: trimmed,
        context: context.trim() || undefined,
      });
      setActiveId(created.id);
      setNewOpen(false);
      setRole('');
      setContext('');
    } catch (error) {
      message.error(error instanceof Error ? error.message : t('errors.generic'));
    }
  };

  const handleSend = async () => {
    if (!canSend) return;
    const text = draft.trim();
    setDraft('');
    try {
      await send.mutateAsync(text);
    } catch (error) {
      message.error(error instanceof Error ? error.message : t('errors.generic'));
      // Keep what the student typed so they can retry.
      setDraft(text);
    }
  };

  const handleFinish = async () => {
    if (!activeId) return;
    Modal.confirm({
      title: t('aiInterview.finish'),
      content: t('aiInterview.finishConfirm'),
      okText: t('aiInterview.finish'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await finish.mutateAsync();
        } catch (error) {
          message.error(error instanceof Error ? error.message : t('errors.generic'));
        }
      },
    });
  };

  if (!configured) {
    return (
      <div className="max-w-220 mx-auto space-y-6">
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
            {t('nav.aiInterview')}
          </p>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 mb-2">
            {t('aiInterview.title')}
          </h1>
          <p className="text-gray-500 max-w-180">{t('aiInterview.subtitle')}</p>
        </div>
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-amber-800 text-sm font-semibold">
          {t('aiInterview.configMissing')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
            {t('nav.aiInterview')}
          </p>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 mb-2">
            {t('aiInterview.title')}
          </h1>
          <p className="text-gray-500 max-w-180">{t('aiInterview.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-2xl font-bold text-[13px] hover:bg-gray-800 transition-all shadow-lg shadow-black/10 cursor-pointer self-start sm:self-auto"
        >
          <PlusOutlined /> {t('aiInterview.newButton')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Session list */}
        <aside className="space-y-3">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
            {t('aiInterview.history')}
          </p>
          {list.isLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm text-gray-500">
              {t('common.loading')}
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm text-gray-500">
              {t('aiInterview.empty')}
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={`w-full text-left bg-white rounded-2xl border p-4 transition-all cursor-pointer ${
                      activeId === item.id
                        ? 'border-black shadow-md'
                        : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-black text-gray-900 text-sm leading-tight">
                        {item.role}
                      </h3>
                      <StatusPill session={item} />
                    </div>
                    <p className="text-[11px] text-gray-400">
                      {formatDate(item.created_at)} ·{' '}
                      {item.message_count} msg
                    </p>
                    {item.final_score !== null && (
                      <p className="text-xs font-black text-emerald-600 mt-1">
                        {t('aiInterview.score')}: {item.final_score.toFixed(1)} / 100
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Chat / detail */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col min-h-150">
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 p-12 text-center">
              {t('aiInterview.empty')}
            </div>
          ) : session.isLoading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              {t('common.loading')}
            </div>
          ) : !session.data ? (
            <div className="flex-1 flex items-center justify-center text-sm text-rose-500">
              {t('errors.notFound')}
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between gap-3 p-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveId(undefined)}
                    className="lg:hidden text-gray-400 hover:text-black cursor-pointer"
                  >
                    <ArrowLeftOutlined />
                  </button>
                  <div>
                    <h2 className="font-black text-gray-900 leading-tight">
                      {session.data.role}
                    </h2>
                    <p className="text-[11px] text-gray-400">
                      {formatDate(session.data.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill session={session.data} />
                  {session.data.status === 'active' && (
                    <button
                      type="button"
                      onClick={handleFinish}
                      disabled={finish.isPending}
                      className="text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-full cursor-pointer disabled:opacity-50"
                    >
                      <StopFilled /> {t('aiInterview.finish')}
                    </button>
                  )}
                </div>
              </header>

              <div
                ref={transcriptRef}
                className="flex-1 overflow-y-auto p-5 space-y-3"
              >
                {transcript.length === 0 && (
                  <div className="text-sm text-gray-400 text-center pt-10">
                    {t('common.loading')}
                  </div>
                )}
                {transcript.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-180 ${isUser ? 'text-right' : ''}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                          {isUser ? t('aiInterview.you') : t('aiInterview.interviewer')}
                        </p>
                        <div
                          className={`inline-block whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            isUser
                              ? 'bg-black text-white'
                              : 'bg-gray-50 text-gray-900'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {send.isPending && (
                  <div className="text-xs text-gray-400 flex items-center gap-2">
                    <RobotFilled /> {t('common.loading')}
                  </div>
                )}
              </div>

              {session.data.status === 'active' && (
                <footer className="p-4 border-t border-gray-100">
                  <div className="flex items-end gap-2">
                    <Input.TextArea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      autoSize={{ minRows: 1, maxRows: 4 }}
                      placeholder={t('aiInterview.answerPlaceholder')}
                      onPressEnter={(e) => {
                        if (!e.shiftKey) {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!canSend}
                      className="bg-black text-white px-4 py-3 rounded-2xl font-bold text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                    >
                      <SendOutlined /> {t('aiInterview.send')}
                    </button>
                  </div>
                </footer>
              )}

              {session.data.status === 'finished' && session.data.final_feedback && (
                <div className="border-t border-gray-100 p-5 space-y-3 bg-gray-50/60">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500">
                      {t('aiInterview.summary')}
                    </p>
                    <p className="text-3xl font-black text-emerald-600">
                      {session.data.final_score?.toFixed(1) ?? '—'}
                      <span className="text-sm text-emerald-500 font-bold ml-1">/ 100</span>
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {session.data.final_feedback.summary}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white rounded-2xl border border-gray-100 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">
                        {t('aiInterview.strengths')}
                      </p>
                      <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
                        {session.data.final_feedback.strengths.map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">
                        {t('aiInterview.improvements')}
                      </p>
                      <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
                        {session.data.final_feedback.improvements.map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {session.data.final_feedback.skill_breakdown &&
                    session.data.final_feedback.skill_breakdown.length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-100 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                          {t('aiInterview.skillBreakdown')}
                        </p>
                        <ul className="space-y-1">
                          {session.data.final_feedback.skill_breakdown.map(
                            (skill, idx) => (
                              <li
                                key={idx}
                                className="flex justify-between gap-3 text-xs"
                              >
                                <span className="font-bold text-gray-700">
                                  {skill.skill}
                                </span>
                                <span className="text-gray-500">
                                  {skill.score.toFixed(0)} — {skill.comment}
                                </span>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <Modal
        open={newOpen}
        onCancel={() => setNewOpen(false)}
        title={t('aiInterview.newButton')}
        okText={t('aiInterview.startInterview')}
        cancelText={t('common.cancel')}
        confirmLoading={start.isPending}
        onOk={handleStart}
        destroyOnHidden
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">
              {t('aiInterview.roleLabel')}
            </label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={t('aiInterview.rolePlaceholder')}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">
              {t('aiInterview.contextLabel')}
            </label>
            <Input.TextArea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={t('aiInterview.contextPlaceholder')}
              rows={4}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AIInterviewPage;
