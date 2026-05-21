import React from 'react';
import {
  ArrowRightOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  EyeOutlined,
  LockOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { Progress, Tag } from 'antd';
import type { PortalAssessment } from '../../types/portal';

interface AssessmentCardProps {
  item: PortalAssessment;
  onAction: (item: PortalAssessment) => void;
}

const toneClass: Record<string, string> = {
  danger: 'bg-rose-50 text-rose-600',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  neutral: 'bg-gray-100 text-gray-600',
  muted: 'bg-gray-100 text-gray-400',
};

const actionIcon = (status: PortalAssessment['status']) => {
  if (status === 'completed') return <EyeOutlined />;
  if (status === 'locked') return <LockOutlined />;
  if (status === 'draft') return <PlayCircleOutlined />;
  return <ArrowRightOutlined className="text-xs group-hover:translate-x-1 transition-transform" />;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'No date';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const AssessmentCard: React.FC<AssessmentCardProps> = ({ item, onAction }) => {
  const isActive = item.status === 'active';
  const isCompleted = item.status === 'completed';
  const disabled = !item.cta_url && item.status !== 'active';

  return (
    <article className={`tf-card-pop bg-white rounded-3xl border ${isActive ? 'border-blue-100 shadow-blue-500/5' : 'border-gray-100'} p-6 shadow-sm hover:shadow-md transition-all flex flex-col h-full relative overflow-hidden group`}>
      {isActive && <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />}

      <div className="flex justify-between items-start gap-3 mb-5">
        <Tag className="m-0! border-0! bg-gray-50! text-gray-500! font-bold uppercase text-[10px] tracking-wider px-2 py-0.5">
          {item.category || 'Assessment'}
        </Tag>

        <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${toneClass[item.status_tone] ?? 'bg-gray-100 text-gray-600'}`}>
          {isCompleted ? <CheckCircleFilled /> : <span className={`size-1.5 rounded-full ${isActive ? 'bg-blue-500 animate-pulse' : 'bg-current'}`} />}
          {item.status_label}
        </span>
      </div>

      <div className="mb-6 flex-1">
        <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight group-hover:text-blue-600 transition-colors">
          {item.title}
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
          {item.description || `${item.question_count} questions prepared for this assessment.`}
        </p>

        {(isCompleted || item.status === 'draft') && item.progress !== null && (
          <div className="flex items-center gap-3 mt-5">
            <Progress
              percent={item.progress}
              showInfo={false}
              strokeColor={isCompleted ? '#10b981' : '#2563eb'}
              trailColor="#f3f4f6"
              size="small"
              className="flex-1"
            />
            <span className={`text-xs font-black ${isCompleted ? 'text-emerald-600' : 'text-blue-600'}`}>
              {item.progress}%
            </span>
          </div>
        )}
      </div>

      <div className="mt-auto">
        <div className="grid grid-cols-2 gap-3 text-[11px] font-bold text-gray-400 mb-6 pt-4 border-t border-gray-50">
          <div className="flex items-center gap-1.5">
            <ClockCircleOutlined /> {item.duration_minutes || 0} mins
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <CalendarOutlined /> {formatDate(item.deadline ?? item.completed_at ?? item.assigned_at)}
          </div>
        </div>

        <button
          disabled={disabled}
          onClick={() => onAction(item)}
          className={`w-full py-3 text-[13px] font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
            isActive || item.status === 'draft'
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
              : 'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50'
          }`}
        >
          {actionIcon(item.status)}
          {item.cta_label}
        </button>
      </div>
    </article>
  );
};

export default AssessmentCard;
