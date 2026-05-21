import React, { useRef } from 'react';
import {
  BarChartOutlined,
  FilePdfOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Progress, Spin, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import AssessmentCard from '../components/assessments/assessmentCard';
import { useAnalytics, useDashboard, useUploadResumeReview } from '../hooks/useCandidatePortal';
import type { PortalAssessment } from '../types/portal';

const statCards = [
  { key: 'active_assessments', label: 'Active assessments', icon: <ThunderboltOutlined /> },
  { key: 'completed_assessments', label: 'Completed', icon: <TrophyOutlined /> },
  { key: 'average_score', label: 'Average score', icon: <BarChartOutlined />, suffix: '%' },
  { key: 'certificates', label: 'Certificates', icon: <SafetyCertificateOutlined /> },
] as const;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { data, isLoading, isError } = useDashboard();
  const { data: analytics } = useAnalytics();
  const uploadResume = useUploadResumeReview();

  const handleAssessmentAction = (item: PortalAssessment) => {
    if (item.status === 'completed' && item.session_id) {
      navigate(`/reports/${item.session_id}`);
      return;
    }
    if ((item.status === 'active' || item.status === 'draft') && item.practice_id) {
      navigate(`/test/${item.practice_id}`);
    }
  };

  const handleActivityOpen = (url: string | null) => {
    if (!url) return;
    if (url.includes('/reports/')) {
      navigate(url.replace('/candidate/portal', ''));
      return;
    }
    if (url.startsWith('/testing/practices/')) {
      navigate(`/test/${url.split('/').pop()}`);
      return;
    }
    navigate('/my-assessments');
  };

  const handleResumeSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      message.error('Please upload a PDF file.');
      return;
    }

    try {
      await uploadResume.mutateAsync(file);
      message.success('Resume review updated.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Upload failed.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-120 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-white rounded-3xl border border-rose-100 p-12 text-center text-rose-500">
        Dashboard data is unavailable.
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Candidate workspace</p>
          <h2 className="text-4xl font-bold tracking-tighter text-gray-900 leading-none mb-3">
            {data.greeting.headline}
          </h2>
          <p className="text-gray-500 font-medium">{data.greeting.message}</p>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleResumeSelected}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploadResume.isPending}
            className="flex items-center gap-2 bg-black text-white px-6 py-3.5 rounded-2xl font-bold text-[13px] hover:bg-gray-800 transition-all shadow-lg shadow-black/10 disabled:opacity-60 cursor-pointer"
          >
            <UploadOutlined />
            {uploadResume.isPending ? 'Uploading...' : 'Quick Resume Upload'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, index) => {
          const value = data.stats[card.key] ?? 0;

          return (
            <section key={card.key} className="tf-card-pop bg-white rounded-3xl border border-gray-100 p-6 shadow-sm" style={{ animationDelay: `${index * 60}ms` }}>
              <div className="flex items-center justify-between mb-5">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{card.label}</p>
                <span className="text-gray-400 text-lg">{card.icon}</span>
              </div>
              <p className="text-3xl font-black tracking-tighter text-gray-900">
                {value}{'suffix' in card ? card.suffix : ''}
              </p>
            </section>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black tracking-tight text-gray-900">Active Assessments</h3>
            <button onClick={() => navigate('/my-assessments')} className="text-sm font-bold text-gray-400 hover:text-black transition-colors cursor-pointer">
              View all
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.active_assessments.length ? (
              data.active_assessments.map((item) => (
                <AssessmentCard key={item.assignment_id} item={item} onAction={handleAssessmentAction} />
              ))
            ) : (
              <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-12 text-center text-gray-400">
                No active assessments right now.
              </div>
            )}
          </div>

          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Recent Activity</h3>
              <button onClick={() => navigate('/my-assessments')} className="text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors cursor-pointer">
                View all
              </button>
            </div>

            {data.recent_activity.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assessment</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.recent_activity.map((row) => (
                      <tr key={`${row.title}-${row.date}`} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-gray-900">{row.title}</td>
                        <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-500">
                          {row.date ? new Date(row.date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold bg-gray-100 text-gray-600">
                            {row.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <button
                            onClick={() => handleActivityOpen(row.action_url)}
                            disabled={!row.action_url}
                            className="text-sm font-bold text-blue-600 disabled:text-gray-300 cursor-pointer disabled:cursor-not-allowed"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400">No activity yet.</div>
            )}
          </section>
        </section>

        <aside className="space-y-8">
          <section className="bg-white rounded-3xl border border-gray-100 p-7 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="size-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FilePdfOutlined className="text-lg" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Resume Insights</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Latest analysis</p>
              </div>
            </div>
            {data.resume_insights ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900 truncate pr-4">{data.resume_insights.filename}</p>
                  <span className="rounded-full bg-emerald-50 text-emerald-600 px-3 py-1 text-xs font-black">
                    {data.resume_insights.score}/100
                  </span>
                </div>
                <ul className="space-y-2">
                  {[...data.resume_insights.strengths, ...data.resume_insights.suggestions].slice(0, 3).map((item) => (
                    <li key={item} className="text-sm text-gray-500 leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <button
                onClick={() => inputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-10 text-sm font-bold text-gray-400 hover:text-black hover:border-gray-300 transition-all cursor-pointer"
              >
                Upload PDF resume
              </button>
            )}
          </section>

          <section className="bg-white rounded-3xl border border-gray-100 p-7 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-gray-900">Skill Analytics</h3>
              <span className="text-xs font-black text-gray-400">{analytics?.overview.total_time_label ?? '0m'}</span>
            </div>
            <div className="space-y-5">
              {(analytics?.categories ?? []).slice(0, 4).map((category) => (
                <div key={category.category}>
                  <div className="flex items-center justify-between text-xs font-bold mb-2">
                    <span className="text-gray-600">{category.category}</span>
                    <span className="text-gray-900">{category.score}%</span>
                  </div>
                  <Progress percent={category.score} showInfo={false} size="small" strokeColor="#111827" />
                </div>
              ))}
              {!analytics?.categories.length && <p className="text-sm text-gray-400">Complete assessments to unlock analytics.</p>}
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-gray-100 p-7 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-gray-900">Certificates</h3>
              <button onClick={() => navigate('/certificates')} className="size-9 rounded-full hover:bg-gray-50 text-gray-400 hover:text-black transition-colors cursor-pointer">
                <RightOutlined />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {data.certificates_preview.slice(0, 4).map((certificate) => (
                <div key={certificate.id} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 min-h-28 flex flex-col justify-between">
                  <SafetyCertificateOutlined className="text-xl text-gray-500" />
                  <p className="text-xs font-black text-gray-900 leading-tight">{certificate.title}</p>
                </div>
              ))}
              {!data.certificates_preview.length && <p className="col-span-2 text-sm text-gray-400">No certificates yet.</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;
