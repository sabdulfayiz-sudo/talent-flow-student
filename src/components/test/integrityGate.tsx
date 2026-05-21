import React, { useState } from 'react';
import { Modal, Checkbox } from 'antd';
import { SafetyCertificateFilled, FullscreenOutlined } from '@ant-design/icons';
import { useI18n } from '../../i18n';

interface IntegrityGateProps {
  open: boolean;
  studentName: string;
  durationMinutes: number;
  questionCount: number;
  onAccept: (opts: { requestFullscreen: boolean }) => Promise<void> | void;
  onCancel: () => void;
}

/**
 * Pre-test integrity policy gate. Simplified to a single message:
 * the test runs in fullscreen, and leaving the page (closing the tab,
 * switching windows, exiting fullscreen) ends the test immediately
 * with no retake. The student has to actively acknowledge before the
 * test starts.
 *
 * We always request fullscreen — there is no opt-out toggle, since the
 * no-resume policy is the actual enforcement. Fullscreen is just a
 * gentle nudge to focus.
 */
const IntegrityGate: React.FC<IntegrityGateProps> = ({
  open,
  studentName,
  durationMinutes,
  questionCount,
  onAccept,
  onCancel,
}) => {
  const { t } = useI18n();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!accepted) return;
    setSubmitting(true);
    try {
      await onAccept({ requestFullscreen: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={560}
      centered
      destroyOnHidden
      maskClosable={false}
      title={null}
    >
      <div className="space-y-6 pt-2">
        <div className="flex items-start gap-4">
          <div className="bg-rose-50 text-rose-600 rounded-2xl size-12 flex items-center justify-center text-2xl">
            <SafetyCertificateFilled />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">
              {t('test.oneChance')}
            </h2>
            <p className="text-sm text-gray-500">
              {studentName ? `${studentName} — ` : ''}
              {durationMinutes} {t('common.minutes')} · {questionCount}{' '}
              {t('test.questions').toLowerCase()}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-rose-50/60 border border-rose-100 p-5 text-sm text-rose-900 leading-relaxed">
          {t('test.oneChanceBody')}
        </div>

        <div className="rounded-2xl bg-gray-50 p-4 text-xs text-gray-600 flex items-start gap-2">
          <FullscreenOutlined className="mt-0.5 text-base text-gray-500" />
          <span>
            {t('test.proctoredBody')}
          </span>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-gray-700 font-semibold leading-relaxed">
            {t('test.policyAck')}
          </span>
        </label>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-3 rounded-2xl text-sm font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
            disabled={submitting}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={!accepted || submitting}
            className="px-5 py-3 rounded-2xl text-sm font-bold bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-black/10"
          >
            {submitting ? t('test.starting') : t('test.agreeStart')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default IntegrityGate;
