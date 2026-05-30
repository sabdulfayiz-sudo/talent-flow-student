import React, { useMemo, useState } from 'react';
import {
  BankOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseCircleFilled,
  FileSearchOutlined,
  RocketFilled,
  ThunderboltFilled,
} from '@ant-design/icons';
import { Empty, Spin } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMyApplications } from '../hooks/useCandidatePortal';
import type { VacancyDetail } from '../types/portal';
import PipelineStepper from '../components/jobs/pipelineStepper';
import VacancyDetailModal from '../components/jobs/vacancyDetailModal';
import { useI18n } from '../i18n';

type Tab = 'all' | 'in_progress' | 'completed' | 'rejected';

const tabFor = (status: string): Tab => {
  if (status === 'Hired') return 'completed';
  if (status === 'Rejected') return 'rejected';
  return 'in_progress';
};

const formatDate = (iso: string | null | undefined) => {
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

/**
 * My Applications — FIFA-style pipeline view.
 *
 * Lists every vacancy the user has applied to with a horizontal
 * stepper showing where they are in the funnel. Cards expand to the
 * full vacancy detail modal on click. A `?highlight=<vacancyId>` URL
 * param (set by notification deep-links) auto-opens the matching card
 * with an amber ring so the user can see exactly what just changed.
 */
const ApplicationsPage: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const highlightId = search.get('highlight');
  const [activeTab, setActiveTab] = useState<Tab>('all');
  // Initialise straight from the URL highlight param so we never need
  // to call setState inside an effect (forbidden by react-hooks lint).
  const [openVacancyId, setOpenVacancyId] = useState<string | null>(
    highlightId,
  );
  const { data, isLoading } = useMyApplications();

  const counts = data?.counts ?? {
    total: 0,
    in_progress: 0,
    completed: 0,
    rejected: 0,
  };

  const filtered = useMemo<VacancyDetail[]>(() => {
    const items = data?.items ?? [];
    if (activeTab === 'all') return items;
    return items.filter((item) => {
      if (!item.application) return false;
      return tabFor(item.application.status) === activeTab;
    });
  }, [data?.items, activeTab]);

  const pipeline = data?.pipeline ?? ['Applied', 'Testing', 'Interviewing', 'Hired'];

  if (isLoading) {
    return (
      <div className="min-h-120 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white leading-none mb-3">
            {t('jobs.myApplications')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {t('jobs.myApplicationsSubtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/jobs')}
          className="rounded-2xl bg-black text-white dark:bg-white dark:text-black px-5 py-3 text-sm font-bold cursor-pointer shadow-lg shadow-black/10 hover:bg-gray-800"
        >
          {t('jobs.browseRoles')}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryTile
          label={t('jobs.tabs.all')}
          count={counts.total}
          icon={<FileSearchOutlined />}
          color="bg-gray-900 text-white"
        />
        <SummaryTile
          label={t('jobs.tabs.inProgress')}
          count={counts.in_progress}
          icon={<RocketFilled />}
          color="bg-blue-50 text-blue-700"
        />
        <SummaryTile
          label={t('jobs.tabs.completed')}
          count={counts.completed}
          icon={<CheckCircleFilled />}
          color="bg-emerald-50 text-emerald-700"
        />
        <SummaryTile
          label={t('jobs.tabs.rejected')}
          count={counts.rejected}
          icon={<CloseCircleFilled />}
          color="bg-rose-50 text-rose-700"
        />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
        {([
          ['all', 'jobs.tabs.all'],
          ['in_progress', 'jobs.tabs.inProgress'],
          ['completed', 'jobs.tabs.completed'],
          ['rejected', 'jobs.tabs.rejected'],
        ] as const).map(([key, labelKey]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest cursor-pointer transition-all ${
              activeTab === key
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-12 text-center">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-gray-500 dark:text-gray-400">
                {t('jobs.noApplications')}
              </span>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((vacancy) => {
            const highlighted = highlightId === vacancy.id;
            return (
              <ApplicationCard
                key={vacancy.id}
                vacancy={vacancy}
                pipeline={pipeline}
                highlighted={highlighted}
                onOpen={() => setOpenVacancyId(vacancy.id)}
                onStartTest={
                  vacancy.practice
                    ? () => navigate(`/test/${vacancy.practice!.practice_id}`)
                    : undefined
                }
              />
            );
          })}
        </div>
      )}

      <VacancyDetailModal
        vacancyId={openVacancyId}
        highlightStatusChange={Boolean(highlightId && highlightId === openVacancyId)}
        onClose={() => setOpenVacancyId(null)}
      />
    </div>
  );
};

interface SummaryTileProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
}

const SummaryTile: React.FC<SummaryTileProps> = ({ label, count, icon, color }) => (
  <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
    <div className={`size-9 rounded-2xl ${color} flex items-center justify-center text-lg mb-2`}>
      {icon}
    </div>
    <div className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
      {count}
    </div>
    <div className="text-[10px] uppercase font-black tracking-widest text-gray-400 mt-1">
      {label}
    </div>
  </div>
);

interface ApplicationCardProps {
  vacancy: VacancyDetail;
  pipeline: string[];
  highlighted: boolean;
  onOpen: () => void;
  onStartTest?: () => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({
  vacancy,
  pipeline,
  highlighted,
  onOpen,
  onStartTest,
}) => {
  const { t } = useI18n();
  const app = vacancy.application;
  const stageIndex = app?.stage_index ?? 0;
  const status = app?.status ?? 'Applied';

  return (
    <div
      className={`rounded-3xl border bg-white dark:bg-gray-900 p-6 transition-all ${
        highlighted
          ? 'border-amber-300 ring-2 ring-amber-200 shadow-lg shadow-amber-100/40'
          : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {vacancy.company_name && (
              <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 inline-flex items-center gap-1">
                <BankOutlined /> {vacancy.company_name}
              </span>
            )}
            {highlighted && (
              <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-black uppercase">
                {t('jobs.statusUpdated')}
              </span>
            )}
          </div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight truncate">
            {vacancy.job_name}
          </h3>
          <div className="mt-1 text-xs text-gray-500 inline-flex items-center gap-2">
            <CalendarOutlined />
            {formatDate(app?.applied_at) ?? '—'}
          </div>
        </div>

        <span
          className={`shrink-0 inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase ${
            status === 'Hired'
              ? 'bg-emerald-50 text-emerald-600'
              : status === 'Rejected'
              ? 'bg-rose-50 text-rose-600'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
          }`}
        >
          {status}
        </span>
      </div>

      <PipelineStepper pipeline={pipeline} stageIndex={stageIndex} status={status} />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-200 hover:text-gray-900 cursor-pointer inline-flex items-center gap-1"
        >
          {t('jobs.viewDetails')}
        </button>

        {vacancy.practice && status === 'Testing' && onStartTest && (
          <button
            type="button"
            onClick={onStartTest}
            className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-black cursor-pointer shadow-md shadow-indigo-600/20 inline-flex items-center gap-1.5"
          >
            <ThunderboltFilled /> {t('jobs.startAssignedTest')}
          </button>
        )}

        {vacancy.practice && status !== 'Testing' && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 inline-flex items-center gap-1">
            <ClockCircleOutlined /> {vacancy.practice.title}
          </span>
        )}
      </div>
    </div>
  );
};

export default ApplicationsPage;
