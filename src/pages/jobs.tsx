import React, { useState } from 'react';
import { Button, Empty, Input, Tag, message } from 'antd';
import {
  BankOutlined,
  CheckCircleFilled,
  EnvironmentOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useApplyToVacancy, useVacancies } from '../hooks/useCandidatePortal';
import { ApiError } from '../lib/api';
import type { VacancyItem } from '../types/portal';

const formatDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const JobsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const { data, isLoading, isError } = useVacancies(search);
  const apply = useApplyToVacancy();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleApply = async (vacancy: VacancyItem) => {
    setPendingId(vacancy.id);
    try {
      await apply.mutateAsync(vacancy.id);
      message.success(`Applied to ${vacancy.job_name}.`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        message.info('You have already applied to this vacancy.');
      } else {
        message.error(error instanceof Error ? error.message : 'Could not submit your application.');
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
          <h2 className="text-4xl font-bold tracking-tighter text-gray-900 leading-none mb-3">Open Roles</h2>
          <p className="text-gray-500 font-medium">Browse open vacancies and apply in one click.</p>
        </div>
        <Input
          allowClear
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder="Search roles"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-11 sm:min-w-70 rounded-xl!"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-44 rounded-3xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="bg-white rounded-3xl border border-rose-100 p-12 text-center text-rose-500">
          Vacancies are unavailable right now.
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-16">
          <Empty description={search ? 'No roles match your search.' : 'No open roles right now. Check back soon.'} />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {items.map((vacancy) => {
            const deadline = formatDate(vacancy.end_date);
            return (
              <div
                key={vacancy.id}
                className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 truncate">{vacancy.job_name}</h3>
                    {vacancy.company_name && (
                      <p className="text-sm text-gray-400 font-medium flex items-center gap-1.5 mt-1">
                        <BankOutlined /> {vacancy.company_name}
                      </p>
                    )}
                  </div>
                  {vacancy.tag && <Tag className="rounded-full! border-0! bg-gray-100! text-gray-600!">{vacancy.tag}</Tag>}
                </div>

                {vacancy.job_description && (
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">{vacancy.job_description}</p>
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
                    <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5">
                      <CheckCircleFilled /> Applied
                    </span>
                  ) : (
                    <Button
                      type="primary"
                      onClick={() => handleApply(vacancy)}
                      loading={pendingId === vacancy.id}
                      className="h-10 font-semibold"
                    >
                      Apply
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JobsPage;
