import React from 'react';
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseCircleFilled,
  DownloadOutlined,
  ShareAltOutlined,
  TrophyOutlined,
  WarningFilled,
} from '@ant-design/icons';
import { Progress, Spin, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useReport } from '../hooks/useCandidatePortal';
import type { ReportResponse } from '../types/portal';

const buildReportShareText = (data: ReportResponse) => (
  `I scored ${data.score}% on ${data.title} in TalentFlow. ${data.percentile_label} overall.`
);

const downloadReportImage = (data: ReportResponse) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const gradient = ctx.createLinearGradient(0, 0, 1200, 675);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(0.55, '#111827');
  gradient.addColorStop(1, '#14532d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 675);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(1000, 120, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(140, 610, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 52px Inter, Arial, sans-serif';
  ctx.fillText('TalentFlow Result', 70, 100);

  ctx.font = '800 34px Inter, Arial, sans-serif';
  ctx.fillText(data.title.slice(0, 42), 70, 165);

  ctx.font = '900 140px Inter, Arial, sans-serif';
  ctx.fillText(`${data.score}%`, 70, 340);

  ctx.font = '700 28px Inter, Arial, sans-serif';
  ctx.fillStyle = '#bbf7d0';
  ctx.fillText(`${data.status === 'passed' ? 'Passed' : 'Needs improvement'} - ${data.percentile_label}`, 75, 395);

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '700 26px Inter, Arial, sans-serif';
  ctx.fillText(`Time: ${data.time_taken_label}`, 75, 470);
  ctx.fillText(`Completed: ${new Date(data.completed_at).toLocaleDateString()}`, 75, 515);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 30px Inter, Arial, sans-serif';
  ctx.fillText('talentflow.uz', 75, 600);

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `talentflow-${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-result.png`;
  link.click();
};

const ReportPage: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useReport(sessionId);

  if (isLoading) {
    return (
      <div className="min-h-120 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="bg-white rounded-3xl border border-rose-100 p-12 text-center text-rose-500">Report is unavailable.</div>;
  }

  const handleShare = async () => {
    const text = buildReportShareText(data);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'TalentFlow Result', text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(`${text} ${window.location.href}`);
        message.success('Result link copied.');
      }
    } catch {
      message.info('Sharing was cancelled.');
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <button onClick={() => navigate('/my-assessments')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black transition-colors cursor-pointer">
        <ArrowLeftOutlined /> Back to assessments
      </button>

      <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          <div>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase mb-4 ${data.status === 'passed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {data.status === 'passed' ? 'Passed' : 'Needs improvement'}
            </span>
            <h1 className="text-4xl font-black tracking-tighter text-gray-900 mb-3">{data.title}</h1>
            <p className="text-gray-500 font-medium">
              Completed {new Date(data.completed_at).toLocaleString()}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-xs font-black text-white hover:bg-gray-800 cursor-pointer"
              >
                <ShareAltOutlined /> Share result
              </button>
              <button
                type="button"
                onClick={() => downloadReportImage(data)}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-gray-900 hover:bg-gray-50 cursor-pointer"
              >
                <DownloadOutlined /> Download image
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 xl:min-w-120">
            {[
              { label: 'Score', value: `${data.score}%`, icon: <TrophyOutlined />, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Time taken', value: data.time_taken_label, icon: <ClockCircleOutlined />, color: 'text-blue-600 bg-blue-50' },
              { label: 'Percentile', value: data.percentile_label, icon: <TrophyOutlined />, color: 'text-purple-600 bg-purple-50' },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-gray-100 p-5">
                <div className={`size-11 rounded-2xl flex items-center justify-center mb-4 ${item.color}`}>{item.icon}</div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
                <p className="text-2xl font-black text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <section className="xl:col-span-8 space-y-8">
          <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <h3 className="text-xl font-black text-gray-900 mb-8">Performance by Category</h3>
            <div className="space-y-6">
              {data.performance_by_category.map((category) => (
                <div key={category.category}>
                  <div className="flex items-center justify-between text-sm font-bold mb-2">
                    <span className="text-gray-900">{category.category}</span>
                    <span className={category.score >= 80 ? 'text-emerald-600' : category.score >= 60 ? 'text-amber-600' : 'text-rose-600'}>{category.score}%</span>
                  </div>
                  <Progress
                    percent={category.score}
                    showInfo={false}
                    strokeColor={category.score >= 80 ? '#10b981' : category.score >= 60 ? '#f59e0b' : '#f43f5e'}
                    trailColor="#f3f4f6"
                  />
                </div>
              ))}
              {!data.performance_by_category.length && <p className="text-sm text-gray-400">No category data available.</p>}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-black text-gray-900">Detailed Question Review</h3>
            {data.question_review.map((question) => (
              <article key={`${question.number}-${question.question_id}`} className={`bg-white rounded-3xl border p-6 shadow-sm ${question.is_correct ? 'border-gray-100' : 'border-rose-100'}`}>
                <div className="flex gap-5">
                  <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${question.is_correct ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {question.is_correct ? <CheckCircleFilled /> : <CloseCircleFilled />}
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Question {question.number}</p>
                    <h4 className="text-base font-black text-gray-900 leading-relaxed mb-4">{question.question_text ?? 'Question text unavailable'}</h4>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="rounded-xl bg-gray-50 px-3 py-2 text-gray-500">
                        Your answer: <strong className="text-gray-900">{question.user_answer_text ?? question.user_answer ?? 'N/A'}</strong>
                      </span>
                      {!question.is_correct && (
                        <span className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">
                          Correct: <strong>{question.correct_answer_text ?? question.correct_answer_id ?? 'N/A'}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </section>

        <aside className="xl:col-span-4">
          <section className="sticky top-28 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-black text-white p-7">
              <h3 className="text-xl font-black mb-3">AI Insights</h3>
              <p className="text-sm text-white/70 leading-relaxed">{data.ai_insights.summary}</p>
            </div>
            <div className="p-7 space-y-7">
              <div>
                <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4">Strengths</p>
                <div className="space-y-3">
                  {data.ai_insights.strengths.map((item) => (
                    <p key={item} className="text-sm text-gray-600 leading-relaxed flex gap-2">
                      <CheckCircleFilled className="text-emerald-500 mt-0.5" /> {item}
                    </p>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-100 pt-7">
                <p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-4">Areas for improvement</p>
                <div className="space-y-3">
                  {data.ai_insights.areas_for_improvement.map((item) => (
                    <p key={item} className="text-sm text-gray-600 leading-relaxed flex gap-2">
                      <WarningFilled className="text-orange-500 mt-0.5" /> {item}
                    </p>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl bg-gray-50 p-5">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Recommended next step</p>
                <h4 className="font-black text-gray-900">{data.ai_insights.recommended_next_step.title}</h4>
                <p className="text-sm text-gray-500">{data.ai_insights.recommended_next_step.duration}</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default ReportPage;
