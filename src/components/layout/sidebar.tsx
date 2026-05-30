import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppstoreOutlined,
  BulbOutlined,
  CrownOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  ProfileOutlined,
  ShopOutlined,
  QuestionCircleOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ThunderboltFilled,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useI18n } from '../../i18n';

interface SidebarProps {
  collapsed: boolean;
}

type NavItem = {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
};

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  const primaryItems: NavItem[] = useMemo(
    () => [
      { label: t('nav.dashboard'), icon: <AppstoreOutlined />, path: '/' },
      { label: t('nav.jobs'), icon: <ShopOutlined />, path: '/jobs' },
      { label: t('nav.myApplications'), icon: <ProfileOutlined />, path: '/applications' },
      { label: t('nav.assessments'), icon: <FileTextOutlined />, path: '/my-assessments' },
      { label: t('nav.practice'), icon: <BulbOutlined />, path: '/practice', badge: 'New' },
      { label: t('nav.aiInterview'), icon: <RobotOutlined />, path: '/ai-interview', badge: 'AI' },
      { label: 'Resume', icon: <FileSearchOutlined />, path: '/resume-review' },
      { label: t('nav.leaderboard'), icon: <CrownOutlined />, path: '/leaderboard' },
      { label: t('nav.achievements'), icon: <TrophyOutlined />, path: '/achievements' },
      { label: t('nav.certificates'), icon: <SafetyCertificateOutlined />, path: '/certificates' },
      { label: t('nav.profile'), icon: <UserOutlined />, path: '/profile' },
    ],
    [t],
  );

  const secondaryItems: NavItem[] = useMemo(
    () => [
      { label: t('nav.help'), icon: <QuestionCircleOutlined />, path: '/help' },
      { label: t('nav.settings'), icon: <SettingOutlined />, path: '/settings' },
    ],
    [t],
  );

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const renderItem = (item: NavItem) => {
    const active = isActive(item.path);
    return (
      <button
        key={item.label}
        onClick={() => navigate(item.path)}
        title={collapsed ? item.label : ''}
        className={`group w-full flex items-center rounded-xl transition-all duration-200 cursor-pointer ${
          collapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
        } ${
          active
            ? 'bg-black text-white shadow-md'
            : 'text-gray-500 hover:bg-gray-50 hover:text-black'
        }`}
      >
        <span className="text-lg flex items-center shrink-0">{item.icon}</span>
        {!collapsed && (
          <span className="text-sm font-semibold whitespace-nowrap animate-in fade-in duration-300 flex items-center gap-2 flex-1 justify-between">
            {item.label}
            {item.badge && (
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${active ? 'bg-white text-black' : 'bg-amber-100 text-amber-700'}`}>
                {item.badge}
              </span>
            )}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-72'} hidden lg:flex flex-col h-full bg-white border-r border-gray-100 shrink-0 font-sans transition-all duration-300 overflow-hidden`}>
      <div className="flex flex-col h-full p-6 justify-between">
        <div className="space-y-8">
          <button
            onClick={() => navigate('/')}
            className={`flex items-center cursor-pointer ${collapsed ? 'justify-center' : 'gap-3 px-2'}`}
          >
            <div className="bg-black flex items-center justify-center rounded-xl size-10 text-white shadow-md shrink-0">
              <ThunderboltFilled className="text-xl" />
            </div>
            {!collapsed && (
              <div className="text-left animate-in fade-in duration-300">
                <h1 className="text-gray-900 text-lg font-bold leading-tight tracking-tight whitespace-nowrap">
                  {t('nav.appName')}
                </h1>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{t('nav.primary')}</p>
              </div>
            )}
          </button>

          <nav className="space-y-1">{primaryItems.map(renderItem)}</nav>
        </div>

        <div className="space-y-2 pt-6 border-t border-gray-50">
          {secondaryItems.map(renderItem)}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
