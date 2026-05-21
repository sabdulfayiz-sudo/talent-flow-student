import React, { useState } from 'react';
import { Modal, Checkbox, Tooltip } from 'antd';
import {
  EyeInvisibleOutlined,
  FullscreenOutlined,
  SafetyCertificateFilled,
  StopOutlined,
  WarningFilled,
} from '@ant-design/icons';

interface IntegrityGateProps {
  open: boolean;
  studentName: string;
  durationMinutes: number;
  questionCount: number;
  onAccept: (opts: { requestFullscreen: boolean }) => Promise<void> | void;
  onCancel: () => void;
}

/**
 * Pre-test integrity policy gate. Surfaces, in plain language, exactly
 * what the proctoring layer monitors so students aren't surprised when
 * their session is flagged. They have to actively check "I understand"
 * before the test begins.
 */
const IntegrityGate: React.FC<IntegrityGateProps> = ({
  open,
  studentName,
  durationMinutes,
  questionCount,
  onAccept,
  onCancel,
}) => {
  const [accepted, setAccepted] = useState(false);
  const [fullscreen, setFullscreen] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!accepted) return;
    setSubmitting(true);
    try {
      await onAccept({ requestFullscreen: fullscreen });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={640}
      centered
      destroyOnClose
      maskClosable={false}
      title={null}
    >
      <div className="space-y-6 pt-2">
        <div className="flex items-start gap-4">
          <div className="bg-blue-50 text-blue-600 rounded-2xl size-12 flex items-center justify-center text-2xl">
            <SafetyCertificateFilled />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">
              Test Integrity Policy
            </h2>
            <p className="text-sm text-gray-500">
              {studentName ? `${studentName}, ` : ''}before you start, please read
              what the proctoring layer monitors. The test is {durationMinutes}
              {' '}minutes / {questionCount} questions.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-gray-50 p-5 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-gray-500">
            We monitor and log
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <EyeInvisibleOutlined className="text-amber-500 mt-0.5" />
              Switching tabs, minimizing the window, or losing window focus.
            </li>
            <li className="flex items-start gap-2">
              <StopOutlined className="text-rose-500 mt-0.5" />
              Copy, cut, paste, right-click, drag-and-drop, and text-selection
              attempts.
            </li>
            <li className="flex items-start gap-2">
              <StopOutlined className="text-rose-500 mt-0.5" />
              Developer tools (F12 / Ctrl+Shift+I), view-source, printing,
              and screenshot keyboard shortcuts.
            </li>
            <li className="flex items-start gap-2">
              <WarningFilled className="text-amber-500 mt-0.5" />
              Exiting fullscreen, going offline, or connecting an external
              display while the test is open.
            </li>
            <li className="flex items-start gap-2">
              <SafetyCertificateFilled className="text-emerald-500 mt-0.5" />
              Each page is watermarked with your name and student id so
              screenshots are traceable.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-700 leading-relaxed">
          <strong>What we cannot detect from the browser:</strong> a second
          device, a phone, in-person help, audio assistance, or remote-desktop
          software. The questions you'll see are <em>shuffled per-attempt</em>
          {' '}and the next question is chosen based on your previous answers,
          so copying another student's answers wholesale will not work.
        </div>

        <Tooltip title="Fullscreen helps you focus and makes integrity tracking more reliable.">
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={fullscreen}
              onChange={(e) => setFullscreen(e.target.checked)}
            />
            <span className="text-sm text-gray-700 font-semibold flex items-center gap-2">
              <FullscreenOutlined /> Open the test in fullscreen
            </span>
          </label>
        </Tooltip>

        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-gray-700 font-semibold leading-relaxed">
            I understand that integrity violations will be logged and may
            flag my submission for review. I have read the policy above.
          </span>
        </label>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-5 py-3 rounded-2xl text-sm font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={!accepted || submitting}
            className="px-5 py-3 rounded-2xl text-sm font-bold bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-black/10"
          >
            {submitting ? 'Starting…' : 'I agree, start test'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default IntegrityGate;
