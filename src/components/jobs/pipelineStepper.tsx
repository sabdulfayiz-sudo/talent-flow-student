import React from 'react';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  FileTextOutlined,
  RocketFilled,
  SmileFilled,
  UserOutlined,
} from '@ant-design/icons';

interface PipelineStepperProps {
  pipeline: string[];
  stageIndex: number;
  status: string;
  // `compact` = horizontal pill row used inside cards; default = full
  // FIFA-style horizontal track with labels + icons.
  compact?: boolean;
}

const STAGE_ICONS: Record<string, React.ReactNode> = {
  Applied: <FileTextOutlined />,
  Testing: <RocketFilled />,
  Interviewing: <UserOutlined />,
  Hired: <SmileFilled />,
  Rejected: <CloseCircleFilled />,
};

/**
 * "FIFA-style" application pipeline stepper.
 *
 * Renders the canonical pipeline (Applied → Testing → Interviewing →
 * Hired) as a horizontal track of dots connected by progress bars.
 * The current stage glows; cleared stages get a checkmark; future
 * stages are dimmed. If the candidate was rejected we re-paint the
 * trail in rose and pin the marker to the last stage they reached.
 */
const PipelineStepper: React.FC<PipelineStepperProps> = ({
  pipeline,
  stageIndex,
  status,
  compact = false,
}) => {
  const rejected = status === 'Rejected';
  const hired = status === 'Hired';

  const accent = rejected
    ? 'bg-rose-500 ring-rose-200 text-white'
    : hired
    ? 'bg-emerald-500 ring-emerald-200 text-white'
    : 'bg-gray-900 ring-gray-200 text-white';

  const accentBar = rejected
    ? 'bg-rose-400'
    : hired
    ? 'bg-emerald-400'
    : 'bg-gray-900';

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex items-center justify-between gap-2">
        {pipeline.map((stage, index) => {
          const cleared = index < stageIndex || hired;
          const active = index === stageIndex && !hired && !rejected;
          const isLast = index === pipeline.length - 1;

          return (
            <React.Fragment key={stage}>
              <div className="flex flex-col items-center text-center min-w-0">
                <div
                  className={`
                    size-9 rounded-full flex items-center justify-center
                    ring-4 transition-all duration-300 shadow-sm
                    ${
                      cleared
                        ? 'bg-emerald-500 ring-emerald-100 text-white'
                        : active
                        ? `${accent} scale-110 animate-pulse`
                        : 'bg-gray-100 ring-gray-50 text-gray-400'
                    }
                    ${compact ? 'size-7 text-xs' : ''}
                  `}
                >
                  {cleared ? (
                    <CheckCircleFilled />
                  ) : (
                    STAGE_ICONS[stage] ?? <FileTextOutlined />
                  )}
                </div>
                {!compact && (
                  <span
                    className={`mt-2 text-[10px] font-black uppercase tracking-widest ${
                      cleared || active
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-400'
                    }`}
                  >
                    {stage}
                  </span>
                )}
              </div>

              {!isLast && (
                <div className="flex-1 h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mt-[-18px]">
                  <div
                    className={`h-full ${
                      index < stageIndex ? accentBar : 'bg-transparent'
                    } transition-all duration-500`}
                    style={{
                      width: index < stageIndex ? '100%' : '0%',
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Status sub-line: only show when not in a neutral state. */}
      {(rejected || hired) && (
        <div className="text-center">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase ${
              rejected
                ? 'bg-rose-50 text-rose-600'
                : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {rejected ? <CloseCircleFilled /> : <CheckCircleFilled />}
            {status}
          </span>
        </div>
      )}
    </div>
  );
};

export default PipelineStepper;
