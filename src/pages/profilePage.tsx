import React, { useEffect, useRef, useState } from 'react';
import {
  CameraOutlined,
  CheckCircleFilled,
  EditOutlined,
  EnvironmentOutlined,
  LinkOutlined,
  MailOutlined,
  PhoneOutlined,
  ShareAltOutlined,
  ThunderboltFilled,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Form, Input, Modal, Progress, Switch, message } from 'antd';
import { apiFetch, resolveAssetUrl } from '../lib/api';
import { useAIProfile, useAnalytics, useUpdateAIProfile, useUploadProfileAvatar } from '../hooks/useCandidatePortal';
import type { ProfileUpdatePayload } from '../types/portal';
import { useAppDispatch } from '../app/hooks';
import { updateUser } from '../features/auth/authSlice';

interface SharePayload {
  share_url: string;
}

const ProfilePage: React.FC = () => {
  const { data, isLoading, isError } = useAIProfile();
  const { data: analytics } = useAnalytics();
  const dispatch = useAppDispatch();
  const updateProfile = useUpdateAIProfile();
  const uploadAvatar = useUploadProfileAvatar();
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm<ProfileUpdatePayload>();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        name: data.profile.name ?? '',
        surname: data.profile.surname ?? '',
        email: data.contact.email ?? '',
        headline: data.profile.headline,
        location: data.profile.location ?? '',
        university: data.profile.university ?? '',
        graduation_year: data.profile.graduation_year ?? '',
        phone: data.contact.phone ?? '',
        portfolio_url: data.contact.portfolio_url ?? '',
        linkedin_url: data.contact.linkedin_url ?? '',
        open_to_work: data.profile.open_to_work,
      });
    }
  }, [data, form]);

  const handleShare = async () => {
    try {
      const payload = await apiFetch<SharePayload>('/candidate/portal/profile/share');
      const url = `${window.location.origin}${payload.share_url}`;
      await navigator.clipboard.writeText(url);
      message.success('Profile link copied.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to create share link.');
    }
  };

  const handleSave = async (values: ProfileUpdatePayload) => {
    try {
      const updated = await updateProfile.mutateAsync(values);
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        localStorage.setItem('user', JSON.stringify({
          ...parsed,
          name: updated.profile.name ?? parsed.name,
          surname: updated.profile.surname ?? parsed.surname,
          email: updated.contact.email ?? parsed.email,
          avatar_url: updated.profile.avatar_url ?? parsed.avatar_url,
        }));
      }
      dispatch(updateUser({
        name: updated.profile.name,
        surname: updated.profile.surname,
        email: updated.contact.email ?? undefined,
        avatar_url: updated.profile.avatar_url,
      }));
      setIsEditing(false);
      message.success('Profile updated.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to update profile.');
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      message.error('Please upload a PNG, JPG, or WEBP image.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      message.error('Profile image must be smaller than 3MB.');
      return;
    }
    try {
      const updated = await uploadAvatar.mutateAsync(file);
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        localStorage.setItem('user', JSON.stringify({
          ...parsed,
          avatar_url: updated.profile.avatar_url,
        }));
      }
      dispatch(updateUser({ avatar_url: updated.profile.avatar_url }));
      message.success('Profile image updated.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Unable to upload image.');
    }
  };

  if (isLoading) {
    return <div className="p-20 text-center text-gray-400 animate-pulse">Loading profile...</div>;
  }

  if (isError || !data) {
    return <div className="bg-white rounded-3xl border border-rose-100 p-12 text-center text-rose-500">Profile is unavailable.</div>;
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-black" />
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="relative size-28 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-50 group">
            <Avatar
              className="w-full h-full bg-gray-100 border border-gray-200"
              icon={<UserOutlined className="text-gray-400" />}
              src={resolveAssetUrl(data.profile.avatar_url)}
              size={106}
            >
              {data.profile.avatar_initials}
            </Avatar>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadAvatar.isPending}
              className="absolute inset-x-0 bottom-0 h-10 bg-black/70 text-white text-xs font-black flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-60"
            >
              <CameraOutlined /> {uploadAvatar.isPending ? 'Uploading' : 'Photo'}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="flex-1 text-center lg:text-left">
            <div className="flex flex-col lg:flex-row items-center gap-3 mb-2">
              <h1 className="text-3xl font-black text-gray-900">{data.profile.full_name}</h1>
              {data.profile.open_to_work && (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-full border border-emerald-100">
                  Open to Work
                </span>
              )}
            </div>
            <p className="text-gray-500 text-lg mb-4">{data.profile.headline}</p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-sm text-gray-400 font-medium">
              {data.profile.location && <span className="flex items-center gap-1.5"><EnvironmentOutlined /> {data.profile.location}</span>}
              {data.contact.email && <span className="flex items-center gap-1.5"><MailOutlined /> {data.contact.email}</span>}
              {data.contact.phone && <span className="flex items-center gap-1.5"><PhoneOutlined /> {data.contact.phone}</span>}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-lg shadow-black/10 cursor-pointer"
            >
              <EditOutlined /> Edit Profile
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-900 font-bold rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all cursor-pointer"
            >
              <ShareAltOutlined /> Share
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <section className="xl:col-span-4 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-gray-900">Profile Strength</h3>
            <span className="text-3xl font-black tracking-tighter">{data.profile_strength.score}</span>
          </div>
          <Progress percent={data.profile_strength.score} strokeColor="#111827" showInfo={false} />
          <p className="text-sm text-gray-500 leading-relaxed mt-5">{data.profile_strength.label}</p>

          <div className="mt-8 pt-8 border-t border-gray-100 space-y-4">
            {[
              { label: 'Completed assessments', value: analytics?.overview.completed_assessments ?? 0 },
              { label: 'Average score', value: `${analytics?.overview.average_score ?? 0}%` },
              { label: 'Best score', value: `${analytics?.overview.best_score ?? 0}%` },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{item.label}</span>
                <span className="font-black text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="xl:col-span-5 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-gray-900 text-white flex items-center justify-center">
              <ThunderboltFilled />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">{data.ai_review.title}</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                Updated {new Date(data.ai_review.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="p-8 space-y-7">
            {data.ai_review.insights.map((item, index) => (
              <article key={item.title} className="tf-card-pop flex gap-4" style={{ animationDelay: `${index * 80}ms` }}>
                <div className="size-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-900 shrink-0">
                  <CheckCircleFilled />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="xl:col-span-3 space-y-8">
          <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 mb-6">Career Roadmap</h3>
            <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
              {data.career_roadmap.map((step) => (
                <div key={step.title} className="flex gap-4 pl-6 relative">
                  <div className={`absolute left-0 size-4 rounded-full border-4 border-white ${step.status === 'achieved' ? 'bg-emerald-500' : step.status === 'missing' ? 'bg-orange-400' : 'bg-blue-500'}`} />
                  <div className="flex-1">
                    <h4 className="text-sm font-black text-gray-900">{step.title}</h4>
                    <p className="text-xs text-gray-400 mt-1">{step.subtitle}</p>
                    {step.progress > 0 && <Progress percent={step.progress} showInfo={false} size="small" className="mt-2" strokeColor="#111827" />}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[#0a66c2] rounded-3xl p-8 shadow-sm text-white overflow-hidden relative">
            <LinkOutlined className="absolute right-6 top-6 text-6xl opacity-10" />
            <h3 className="text-lg font-black mb-3">LinkedIn Optimization</h3>
            <p className="text-sm text-white/80 leading-relaxed mb-5">{data.linkedin_optimization.suggested_headline}</p>
            <div className="space-y-2">
              {data.linkedin_optimization.recommendations.slice(0, 3).map((item) => (
                <p key={item} className="text-xs font-semibold text-white/90">- {item}</p>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <Modal
        title="Edit profile"
        open={isEditing}
        onCancel={() => setIsEditing(false)}
        onOk={() => form.submit()}
        confirmLoading={updateProfile.isPending}
        okText="Save"
        className="tf-profile-modal"
      >
        <Form form={form} layout="vertical" onFinish={handleSave} className="pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required.' }]}>
              <Input maxLength={30} />
            </Form.Item>
            <Form.Item name="surname" label="Surname" rules={[{ required: true, message: 'Surname is required.' }]}>
              <Input maxLength={30} />
            </Form.Item>
          </div>
          <Form.Item name="email" label="Email">
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item name="headline" label="Headline">
            <Input maxLength={150} />
          </Form.Item>
          <Form.Item name="location" label="Location">
            <Input maxLength={100} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="university" label="University">
              <Input maxLength={150} />
            </Form.Item>
            <Form.Item name="graduation_year" label="Graduation year">
              <Input maxLength={10} />
            </Form.Item>
          </div>
          <Form.Item name="phone" label="Phone">
            <Input maxLength={30} />
          </Form.Item>
          <Form.Item name="portfolio_url" label="Portfolio URL">
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="linkedin_url" label="LinkedIn URL">
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="open_to_work" label="Open to work" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProfilePage;
