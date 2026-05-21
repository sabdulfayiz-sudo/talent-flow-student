import React, { useEffect, useState } from 'react';
import {
  BellFilled,
  BulbFilled,
  GlobalOutlined,
  SafetyCertificateFilled,
  SoundFilled,
} from '@ant-design/icons';
import { Segmented, Switch, message } from 'antd';

const THEME_KEY = 'tf-theme';
const NOTIF_KEY = 'tf-notifications';
const SOUND_KEY = 'tf-sound';
const LANG_KEY = 'tf-language';

const SettingsPage: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(
    () => (localStorage.getItem(THEME_KEY) as 'light' | 'dark' | 'system') || 'light',
  );
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem(NOTIF_KEY) !== 'false',
  );
  const [sound, setSound] = useState(
    () => localStorage.getItem(SOUND_KEY) !== 'false',
  );
  const [language, setLanguage] = useState(
    () => localStorage.getItem(LANG_KEY) || 'en',
  );

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    const dark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('tf-dark', dark);
  }, [theme]);

  const persistBoolean = (key: string, value: boolean) => {
    localStorage.setItem(key, value ? 'true' : 'false');
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Preferences</p>
        <h2 className="text-4xl font-bold tracking-tighter text-gray-900 leading-none mb-3">Settings</h2>
        <p className="text-gray-500 font-medium max-w-180">
          Personal preferences that live in this browser. Account-level
          settings live on the profile page.
        </p>
      </div>

      <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <header className="flex items-center gap-3 mb-5">
          <div className="bg-amber-50 text-amber-600 rounded-2xl size-11 flex items-center justify-center text-xl">
            <BulbFilled />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">Appearance</h3>
            <p className="text-sm text-gray-500">Choose how the dashboard looks.</p>
          </div>
        </header>
        <Segmented
          value={theme}
          onChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
          options={[
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
            { label: 'System', value: 'system' },
          ]}
        />
        <p className="text-[11px] text-gray-400 mt-3">
          Dark mode is in beta — most pages already follow it but a few
          dashboards still render light surfaces.
        </p>
      </section>

      <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
        <header className="flex items-center gap-3">
          <div className="bg-blue-50 text-blue-600 rounded-2xl size-11 flex items-center justify-center text-xl">
            <BellFilled />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">Notifications</h3>
            <p className="text-sm text-gray-500">Tune in-app alerts.</p>
          </div>
        </header>
        <div className="flex items-center justify-between gap-3 pt-2">
          <div>
            <p className="font-bold text-gray-900">Show notification dropdown</p>
            <p className="text-xs text-gray-500">Hides the bell icon when off.</p>
          </div>
          <Switch
            checked={notifications}
            onChange={(value) => {
              setNotifications(value);
              persistBoolean(NOTIF_KEY, value);
              message.success(value ? 'Notifications enabled.' : 'Notifications hidden.');
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-gray-900">Audible alerts</p>
            <p className="text-xs text-gray-500 flex items-center gap-1"><SoundFilled /> Plays a short chime on important events.</p>
          </div>
          <Switch
            checked={sound}
            onChange={(value) => {
              setSound(value);
              persistBoolean(SOUND_KEY, value);
            }}
          />
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <header className="flex items-center gap-3 mb-5">
          <div className="bg-emerald-50 text-emerald-600 rounded-2xl size-11 flex items-center justify-center text-xl">
            <GlobalOutlined />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">Language</h3>
            <p className="text-sm text-gray-500">UI language (server content stays in the original language).</p>
          </div>
        </header>
        <Segmented
          value={language}
          onChange={(value) => {
            const next = String(value);
            setLanguage(next);
            localStorage.setItem(LANG_KEY, next);
          }}
          options={[
            { label: 'English', value: 'en' },
            { label: 'Oʻzbekcha', value: 'uz' },
            { label: 'Русский', value: 'ru' },
          ]}
        />
        <p className="text-[11px] text-gray-400 mt-3">
          Localization is incremental — most page chrome flips immediately,
          some long-form copy will follow.
        </p>
      </section>

      <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <header className="flex items-center gap-3 mb-5">
          <div className="bg-rose-50 text-rose-600 rounded-2xl size-11 flex items-center justify-center text-xl">
            <SafetyCertificateFilled />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">Privacy &amp; security</h3>
            <p className="text-sm text-gray-500">
              Test sessions log integrity events to your account. You can
              review them on each report page.
            </p>
          </div>
        </header>
        <p className="text-sm text-gray-600 leading-relaxed">
          We never sell your data. Integrity events are visible only to you
          and the admins who assigned the assessment. See the Help page for
          the full list of monitored behaviors.
        </p>
      </section>
    </div>
  );
};

export default SettingsPage;
