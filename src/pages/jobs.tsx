import React, { useMemo, useState } from 'react';
import { Empty, Input, Tag, message } from 'antd';
import {
  ArrowRightOutlined,
  BankOutlined,
  BellFilled,
  CheckCircleFilled,
  EnvironmentOutlined,
  SearchOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  useApplyToVacancy,
  useNotifications,
  useVacancies,
} from '../hooks/useCandidatePortal';
import { ApiError } from '../lib/api';
import type { VacancyItem } from '../types/portal';
import VacancyDetailModal from '../components/jobs/vacancyDetailModal';
import { useI18n } from '../i18n';

const formatDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Open Roles page.
 *
 * Browse vacancies + apply in one click. Clicking a card opens the
 * full detail modal with description, dates, the linked test, and
 * pipeline tracker. Apply still works inline for speed.
 */
const JobsPage: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data, isLoading, isError } = useVacancies(search);
  const { data: notifications } = useNotifications();
  const apply = useApplyToVacancy();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Surface the latest unread status-change notification (admin
  // updated the candidate's application stage) at the top of the
  // page so the user never misses a stage move.
  const latestStatusChange = useMemo(() => {
    const items = notifications?.items ?? [];
    return items.find(
      (item) => item.type === 'status_change' && !item.is_read,
    );
  }, [notifications]);

  const handleApply = async (vacancy: VacancyItem) => {
    setPendingId(vacancy.id);
    try {
      await apply.mutateAsync(vacancy.id);
      message.success(`Applied to ${vacancy.job_name}.`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        message.info('You have already applied to this vacancy.');
      } else {
        message.error(
          error instanceof Error
            ? error.message
            : 'Could not submit your application.',
        );
      }
    } finally {
      setPendingId(null);
    }
  };

  const items = data?.items ?? [];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white leading-none mb-3">
            {t('jobs.title')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {t('jobs.subtitle')}
          </p>
        </div>
        <Input
          allowClear
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder={t('common.search')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-11 sm:min-w-70 rounded-xl!"
        />
      </div>

      {latestStatusChange && (
        <button
          type="button"
          onClick={() => {
            if (latestStatusChange.related_vacancy_id) {
              navigate(
                `/applications?highlight=${latestStatusChange.related_vacancy_id}`,
              );
            } else {
              navigate('/applications');
            }
          }}
          className="w-full text-left rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/40 dark:from-amber-900/30 dark:to-amber-800/10 dark:border-amber-700/60 p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-all duration-200 group"
        >
          <div className="size-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-lg shadow-md shadow-amber-500/30 animate-pulse">
            <BellFilled />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                {t('jobs.statusUpdated')}
              </span>
              <span className="rounded-full bg-amber-200/70 text-amber-900 dark:bg-amber-700/40 dark:text-amber-100 px-2 py-0.5 text-[10px] font-black uppercase">
                {latestStatusChange.priority === 'high' ? '!' : 'New'}
              </span>
            </div>
            <p className="text-sm font-black text-gray-900 dark:text-white truncate">
              {latestStatusChange.title}
            </p>
            <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
              {latestStatusChange.message}
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-2xl bg-amber-500 text-white px-3 py-1.5 text-xs font-black group-hover:bg-amber-600">
            {t('jobs.myApplications')} <ArrowRightOutlined />
          </span>
        </button>
      )}

      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-44 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-rose-100 p-12 text-center text-rose-500">
          {t('errors.generic')}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-16">
          <Empty
            description={search ? t('common.search') : t('jobs.noResults')}
          />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {items.map((vacancy) => {
            const deadline = formatDate(vacancy.end_date);
            return (
              <button
                key={vacancy.id}
                type="button"
                onClick={() => setDetailId(vacancy.id)}
                className="text-left bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-4 cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
                      {vacancy.job_name}
                    </h3>
                    {vacancy.company_name && (
                      <p className="text-sm text-gray-400 font-medium flex items-center gap-1.5 mt-1">
                        <BankOutlined /> {vacancy.company_name}
                      </p>
                    )}
                  </div>
                  {vacancy.tag && (
                    <Tag className="rounded-full! border-0! bg-gray-100! text-gray-600! dark:bg-gray-800! dark:text-gray-300!">
                      {vacancy.tag}
                    </Tag>
                  )}
                </div>

                {vacancy.job_description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
                    {vacancy.job_description}
                  </p>
                )}

                <div className="flex items-center justify-between gap-3 mt-auto pt-2">
                  {deadline ? (
                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                      <EnvironmentOutlined /> Closes {deadline}
                    </span>
                  ) : (
                    <span />
                  )}
                  {vacancy.has_applied ? (
                    <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
                      <CheckCircleFilled /> {t('jobs.applied')}
                    </span>
                  ) : (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleApply(vacancy);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          void handleApply(vacancy);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-2xl bg-black text-white dark:bg-white dark:text-gray-900 px-4 py-2 text-xs font-bold cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-100 ${
                        pendingId === vacancy.id ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      <ThunderboltFilled />
                      {pendingId === vacancy.id
                        ? t('jobs.applying')
                        : t('jobs.apply')}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <VacancyDetailModal
        vacancyId={detailId}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
};

export default JobsPage;
