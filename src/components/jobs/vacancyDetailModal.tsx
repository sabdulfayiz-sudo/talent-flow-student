import React from 'react';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  ThunderboltFilled,
  UserOutlined,
} from '@ant-design/icons';
import { Modal, Spin, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useVacancyDetail, useApplyToVacancy } from '../../hooks/useCandidatePortal';
import PipelineStepper from './pipelineStepper';
import { useI18n } from '../../i18n';

interface VacancyDetailModalProps {
  vacancyId: string | null;
  onClose: () => void;
  highlightStatusChange?: boolean;
}

const formatDate = (iso: string | null) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
};

const PIPELINE_FALLBACK = ['Applied', 'Testing', 'Interviewing', 'Hired'];

/**
 * Open-roles detail panel.
 *
 * Hits `/candidate/portal/vacancies/{id}` and renders:
 *  - the full job description,
 *  - dates / candidate count / company,
 *  - the linked practice with a "Start test" CTA when the candidate
 *    is at the `Testing` stage,
 *  - the FIFA-style pipeline tracker, with a glowing highlight when
 *    the modal was opened from a status-update notification.
 */
const VacancyDetailModal: React.FC<VacancyDetailModalProps> = ({
  vacancyId,
  onClose,
  highlightStatusChange = false,
}) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data, isLoading } = useVacancyDetail(vacancyId ?? undefined);
  const apply = useApplyToVacancy();

  const start = formatDate(data?.start_date ?? null);
  const end = formatDate(data?.end_date ?? null);

  return (
    <Modal
      open={Boolean(vacancyId)}
      onCancel={onClose}
      footer={null}
      width={760}
      centered
      destroyOnHidden
      title={null}
    >
      {isLoading || !data ? (
        <div className="min-h-72 flex items-center justify-center">
          <Spin size="large" />
        </div>
      ) : (
        <div className="space-y-6 pt-2">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {data.tag && (
                <Tag color="geekblue" className="font-black uppercase">
                  {data.tag}
                </Tag>
              )}
              {data.company_name && (
                <span className="text-xs font-bold text-gray-500">
                  {data.company_name}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                  data.is_open
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {data.is_open ? t('jobs.openStatus') : t('jobs.closed')}
              </span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {data.job_name}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-gray-500">
              {start && (
                <span className="inline-flex items-center gap-1">
                  <CalendarOutlined /> {start}
                  {end ? ` → ${end}` : ''}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <UserOutlined /> {data.candidate_count}{' '}
                {t('jobs.candidates')}
              </span>
            </div>
          </div>

          {data.application && (
            <div
              className={`rounded-3xl border p-5 ${
                highlightStatusChange
                  ? 'border-amber-300 bg-amber-50/70 dark:bg-amber-900/20 ring-2 ring-amber-200'
                  : 'border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40'
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-xs font-black uppercase tracking-widest text-gray-500">
                  {t('jobs.yourStatus')}
                </div>
                <span className="inline-flex rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-1 text-xs font-black uppercase">
                  {data.application.status}
                </span>
              </div>
              <PipelineStepper
                pipeline={PIPELINE_FALLBACK}
                stageIndex={data.application.stage_index}
                status={data.application.status}
              />
            </div>
          )}

          {data.job_description && (
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                <FileTextOutlined /> {t('jobs.description')}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                {data.job_description}
              </div>
            </div>
          )}

          {data.practice && (
            <div className="rounded-3xl border border-indigo-100 bg-indigo-50/70 dark:bg-indigo-900/20 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 text-white px-2 py-0.5 text-[10px] font-black uppercase">
                  <ThunderboltFilled /> {t('jobs.assignedTest')}
                </span>
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                  {data.practice.title}
                </span>
              </div>
              {data.practice.description && (
                <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed mb-3">
                  {data.practice.description}
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded-2xl bg-white dark:bg-gray-900 p-3">
                  <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                    {t('test.duration')}
                  </div>
                  <div className="font-black text-gray-900 dark:text-white">
                    {data.practice.duration_minutes}m
                  </div>
                </div>
                <div className="rounded-2xl bg-white dark:bg-gray-900 p-3">
                  <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                    {t('test.questions')}
                  </div>
                  <div className="font-black text-gray-900 dark:text-white">
                    {data.practice.question_count}
                  </div>
                </div>
                <div className="rounded-2xl bg-white dark:bg-gray-900 p-3">
                  <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                    {t('jobs.difficulty')}
                  </div>
                  <div className="font-black text-gray-900 dark:text-white capitalize">
                    {data.practice.difficulty}
                  </div>
                </div>
                <div className="rounded-2xl bg-white dark:bg-gray-900 p-3">
                  <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                    {t('jobs.deadline')}
                  </div>
                  <div className="font-black text-gray-900 dark:text-white">
                    {formatDate(data.practice.deadline) ?? '—'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (data.practice) {
                    onClose();
                    navigate(`/test/${data.practice.practice_id}`);
                  }
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-bold cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                <ThunderboltFilled /> {t('jobs.startAssignedTest')}
              </button>
            </div>
          )}

          {!data.application && data.is_open && (
            <div className="flex items-center justify-between rounded-3xl border border-gray-100 dark:border-gray-800 p-4">
              <div className="text-xs text-gray-500 inline-flex items-center gap-2">
                <ClockCircleOutlined /> {t('jobs.notAppliedYet')}
              </div>
              <button
                type="button"
                disabled={apply.isPending}
                onClick={() => apply.mutate(data.id)}
                className="rounded-2xl bg-black hover:bg-gray-800 text-white px-4 py-2 text-sm font-bold cursor-pointer disabled:opacity-50"
              >
                {apply.isPending ? t('jobs.applying') : t('jobs.apply')}
              </button>
            </div>
          )}

          {data.company_name && (
            <div className="text-xs text-gray-400 inline-flex items-center gap-1">
              <EnvironmentOutlined /> {data.company_name}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default VacancyDetailModal;
