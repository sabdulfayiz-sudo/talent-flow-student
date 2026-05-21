import React, { useState } from 'react';
import {
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SafetyCertificateOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { Form, Input, Modal, Select, Spin, message } from 'antd';
import { apiFetch } from '../lib/api';
import { useAddCertificate, useCertificates, useDeleteCertificate } from '../hooks/useCandidatePortal';
import type { CertificateCreatePayload, CertificateItem, CertificateStatus } from '../types/portal';

interface CertificateFormValues extends Omit<CertificateCreatePayload, 'tags'> {
  tags?: string[];
}

const statusTabs: { key: 'all' | CertificateStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'verified', label: 'Verified' },
  { key: 'pending', label: 'Pending' },
];

const CertificatesPage: React.FC = () => {
  const [status, setStatus] = useState<'all' | CertificateStatus>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm<CertificateFormValues>();
  const { data, isLoading, isError } = useCertificates(status);
  const addCertificate = useAddCertificate();
  const deleteCertificate = useDeleteCertificate();

  const handleCreate = async (values: CertificateFormValues) => {
    const payload: CertificateCreatePayload = {
      ...values,
      tags: values.tags ?? [],
    };

    try {
      await addCertificate.mutateAsync(payload);
      form.resetFields();
      setIsModalOpen(false);
      message.success('Certificate submitted for verification.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to add certificate.');
    }
  };

  const handleShare = async (certificate: CertificateItem) => {
    try {
      const payload = await apiFetch<{ share_url: string }>(`/candidate/portal/certificates/${certificate.credential_id ?? certificate.id}/share`);
      await navigator.clipboard.writeText(`${window.location.origin}${payload.share_url}`);
      message.success('Certificate link copied.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to share certificate.');
    }
  };

  const handleDownload = async (certificate: CertificateItem) => {
    try {
      const payload = await apiFetch<{ ready: boolean; download_url?: string | null }>(`/candidate/portal/certificates/${certificate.credential_id ?? certificate.id}/download`);
      if (payload.ready && payload.download_url) {
        window.open(payload.download_url, '_blank', 'noopener,noreferrer');
      } else {
        message.info('Digital certificate download is not ready yet.');
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to download certificate.');
    }
  };

  const handleDelete = async (certificate: CertificateItem) => {
    if (certificate.source !== 'external') return;
    try {
      await deleteCertificate.mutateAsync(certificate.id);
      message.success('Certificate removed.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to remove certificate.');
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Verification vault</p>
          <h2 className="text-4xl font-bold tracking-tighter text-gray-900 leading-none mb-3">Certificates</h2>
          <p className="text-gray-500 font-medium">Verified assessment awards and external credentials.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3.5 rounded-2xl font-bold text-[13px] hover:bg-gray-800 transition-all shadow-lg shadow-black/10 cursor-pointer"
        >
          <CloudUploadOutlined />
          Add Certificate
        </button>
      </div>

      <nav className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer ${
              status === tab.key ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'
            }`}
          >
            {tab.label}
            <span className="ml-2 text-[10px] text-gray-400">{data?.counts?.[tab.key] ?? 0}</span>
          </button>
        ))}
      </nav>

      {isLoading ? (
        <div className="min-h-100 flex items-center justify-center">
          <Spin size="large" />
        </div>
      ) : isError || !data ? (
        <div className="bg-white rounded-3xl border border-rose-100 p-12 text-center text-rose-500">Certificates are unavailable.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
          <button
            onClick={() => setIsModalOpen(true)}
            className="min-h-80 rounded-3xl border-2 border-dashed border-gray-200 bg-white text-center p-8 flex flex-col items-center justify-center hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="size-16 rounded-3xl bg-gray-50 flex items-center justify-center text-2xl text-gray-500 mb-5">
              <CloudUploadOutlined />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">Add External Certificate</h3>
            <p className="text-sm text-gray-500 max-w-70">Submit provider credentials for audit and verification.</p>
          </button>

          {data.items.map((certificate, index) => (
            <article key={certificate.id} className="tf-card-pop bg-white rounded-3xl border border-gray-100 p-7 shadow-sm hover:shadow-md transition-all min-h-80 flex flex-col" style={{ animationDelay: `${index * 60}ms` }}>
              <div className="flex justify-between items-start gap-4 mb-6">
                <div className="size-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 text-xl">
                  <SafetyCertificateOutlined />
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${certificate.status === 'verified' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  {certificate.badge_label ?? certificate.status}
                </span>
              </div>

              <h3 className="text-xl font-black text-gray-900 leading-tight mb-2">{certificate.title}</h3>
              <p className="text-sm text-gray-500 mb-5">{certificate.provider ?? 'Zukko'} {certificate.issued_at ? `- ${new Date(certificate.issued_at).toLocaleDateString()}` : ''}</p>

              <div className="flex flex-wrap gap-2 mb-6">
                {certificate.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">{tag}</span>
                ))}
              </div>

              {certificate.verification_notes && (
                <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 rounded-2xl p-4 mb-6">
                  {certificate.verification_notes}
                </p>
              )}

              <div className="mt-auto pt-5 border-t border-gray-100 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Credential ID</p>
                  <p className="text-xs font-bold text-gray-900">{certificate.credential_id ?? 'Pending'}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleDownload(certificate)} className="size-9 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-black transition-colors cursor-pointer">
                    <DownloadOutlined />
                  </button>
                  <button onClick={() => handleShare(certificate)} className="size-9 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-black transition-colors cursor-pointer">
                    <ShareAltOutlined />
                  </button>
                  {certificate.source === 'external' && (
                    <button onClick={() => handleDelete(certificate)} className="size-9 rounded-xl hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer">
                      <DeleteOutlined />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        title="Add external certificate"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={addCertificate.isPending}
        okText="Submit"
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} className="pt-4">
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Required' }]}>
            <Input maxLength={150} />
          </Form.Item>
          <Form.Item name="provider" label="Provider">
            <Input maxLength={150} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="issued_at" label="Issued date">
              <Input type="date" />
            </Form.Item>
            <Form.Item name="credential_id" label="Credential ID">
              <Input maxLength={80} />
            </Form.Item>
          </div>
          <Form.Item name="external_url" label="External URL">
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="file_url" label="File URL">
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="tags" label="Tags">
            <Select mode="tags" tokenSeparators={[',']} open={false} placeholder="React, SQL, AWS" />
          </Form.Item>
          <Form.Item name="verification_notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CertificatesPage;
