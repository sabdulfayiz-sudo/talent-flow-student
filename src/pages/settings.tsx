import React, { useState } from 'react';
import {
  BellFilled,
  BulbFilled,
  GlobalOutlined,
  SafetyCertificateFilled,
  SoundFilled,
} from '@ant-design/icons';
import { Segmented, Switch, message } from 'antd';
import { useI18n, type Locale } from '../i18n';
import { useTheme } from '../hooks/useTheme';

const NOTIF_KEY = 'tf-notifications';
const SOUND_KEY = 'tf-sound';

const SettingsPage: React.FC = () => {
  const { locale, setLocale, t } = useI18n();
  const { mode: theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem(NOTIF_KEY) !== 'false',
  );
  const [sound, setSound] = useState(
    () => localStorage.getItem(SOUND_KEY) !== 'false',
  );

  const handleSetTheme = (value: 'light' | 'dark' | 'system') => {
    document.documentElement.classList.add('tf-theme-animate');
    setTheme(value);
    setTimeout(() => {
      document.documentElement.classList.remove('tf-theme-animate');
    }, 300);
  };

  const persistBoolean = (key: string, value: boolean) => {
    localStorage.setItem(key, value ? 'true' : 'false');
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">{t('nav.settings')}</p>
        <h2 className="text-4xl font-bold tracking-tighter text-gray-900 leading-none mb-3">{t('settings.title')}</h2>
        <p className="text-gray-500 font-medium max-w-180">
          {t('settings.subtitle')}
        </p>
      </div>

      <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <header className="flex items-center gap-3 mb-5">
          <div className="bg-amber-50 text-amber-600 rounded-2xl size-11 flex items-center justify-center text-xl">
            <BulbFilled />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">{t('settings.appearance')}</h3>
            <p className="text-sm text-gray-500">{t('settings.appearanceSubtitle')}</p>
          </div>
        </header>
        <Segmented
          value={theme}
          onChange={(value) => handleSetTheme(value as 'light' | 'dark' | 'system')}
          options={[
            { label: t('settings.themeLight'), value: 'light' },
            { label: t('settings.themeDark'), value: 'dark' },
          ]}
        />
        <p className="text-[11px] text-gray-400 mt-3">
          {t('settings.darkBeta')}
        </p>
      </section>

      <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
        <header className="flex items-center gap-3">
          <div className="bg-blue-50 text-blue-600 rounded-2xl size-11 flex items-center justify-center text-xl">
            <BellFilled />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">{t('settings.notifications')}</h3>
            <p className="text-sm text-gray-500">{t('settings.notificationsSubtitle')}</p>
          </div>
        </header>
        <div className="flex items-center justify-between gap-3 pt-2">
          <div>
            <p className="font-bold text-gray-900">{t('settings.showBell')}</p>
            <p className="text-xs text-gray-500">{t('settings.showBellHint')}</p>
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
            <p className="font-bold text-gray-900">{t('settings.audible')}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1"><SoundFilled /> {t('settings.audibleHint')}</p>
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
            <h3 className="text-lg font-black text-gray-900">{t('settings.language')}</h3>
            <p className="text-sm text-gray-500">{t('settings.languageSubtitle')}</p>
          </div>
        </header>
        <Segmented
          value={locale}
          onChange={(value) => setLocale(String(value) as Locale)}
          options={[
            { label: 'English', value: 'en' },
            { label: 'Oʻzbekcha', value: 'uz' },
            { label: 'Русский', value: 'ru' },
          ]}
        />
        <p className="text-[11px] text-gray-400 mt-3">
          {t('settings.languageNote')}
        </p>
      </section>

      <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <header className="flex items-center gap-3 mb-5">
          <div className="bg-rose-50 text-rose-600 rounded-2xl size-11 flex items-center justify-center text-xl">
            <SafetyCertificateFilled />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">{t('settings.privacy')}</h3>
            <p className="text-sm text-gray-500">
              {t('settings.privacySubtitle')}
            </p>
          </div>
        </header>
        <p className="text-sm text-gray-600 leading-relaxed">
          {t('settings.privacyBody')}
        </p>
      </section>
    </div>
  );
};

export default SettingsPage;
