import React, { useMemo, useState } from 'react';
import {
  BellOutlined,
  BulbOutlined,
  GlobalOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  PlayCircleFilled,
  QuestionCircleOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  ThunderboltFilled,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Badge, Button, Dropdown, Empty, Input, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../features/auth/authSlice';
import { useNotifications } from '../../hooks/useCandidatePortal';
import { useI18n, SUPPORTED_LOCALES, type Locale } from '../../i18n';
import useTheme from '../../hooks/useTheme';

interface HeaderProps {
  user: User | null;
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
}

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  uz: 'Oʻzbekcha',
};

const Header: React.FC<HeaderProps> = ({ user, collapsed, onToggle, onLogout }) => {
  const navigate = useNavigate();
  const { data: notifications } = useNotifications();
  const { locale, setLocale, t } = useI18n();
  const { isDark, toggleTheme } = useTheme();
  const [search, setSearch] = useState('');

  const quickDestinations = useMemo(
    () => [
      { value: '/my-assessments', label: t('nav.assessments'), icon: <ThunderboltFilled /> },
      { value: '/practice', label: t('nav.practice'), icon: <BulbOutlined /> },
      { value: '/ai-interview', label: t('nav.aiInterview'), icon: <RobotOutlined /> },
      { value: '/resume-review', label: 'Resume review', icon: <SafetyCertificateOutlined /> },
      { value: '/leaderboard', label: t('nav.leaderboard'), icon: <SafetyCertificateOutlined /> },
      { value: '/achievements', label: t('nav.achievements'), icon: <SafetyCertificateOutlined /> },
      { value: '/certificates', label: t('nav.certificates'), icon: <SafetyCertificateOutlined /> },
      { value: '/profile', label: t('nav.profile'), icon: <UserOutlined /> },
      { value: '/help', label: t('nav.help'), icon: <QuestionCircleOutlined /> },
      { value: '/settings', label: t('nav.settings'), icon: <SettingOutlined /> },
    ],
    [t],
  );
  const userMenuItems: MenuProps['items'] = [
    { key: 'profile', label: t('nav.profile'), icon: <UserOutlined />, onClick: () => navigate('/profile') },
    { key: 'achievements', label: t('nav.achievements'), icon: <SafetyCertificateOutlined />, onClick: () => navigate('/achievements') },
    { key: 'settings', label: t('nav.settings'), icon: <SettingOutlined />, onClick: () => navigate('/settings') },
    { key: 'help', label: t('nav.help'), icon: <QuestionCircleOutlined />, onClick: () => navigate('/help') },
    { type: 'divider' },
    { key: 'logout', label: t('nav.logout'), icon: <LogoutOutlined />, onClick: onLogout, danger: true },
  ];

  const languageItems: MenuProps['items'] = SUPPORTED_LOCALES.map((code) => ({
    key: code,
    label: LOCALE_LABELS[code],
    onClick: () => setLocale(code),
  }));

  const notificationItems: MenuProps['items'] = notifications?.items.length
    ? notifications.items.map((item, index) => ({
      key: `${item.type}-${index}`,
      label: (
        <div className="max-w-72 py-1">
          <p className="text-xs font-black text-gray-900 mb-1">{item.title}</p>
          <p className="text-xs text-gray-500 leading-relaxed">{item.message}</p>
        </div>
      ),
      onClick: () => {
        if (item.action_url) navigate(item.action_url.replace('/candidate/portal/reports/', '/reports/'));
      },
    }))
    : [
      {
        key: 'empty',
        label: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notifications" />,
        disabled: true,
      },
    ];

  const handleSearchSubmit = () => {
    const term = search.trim().toLowerCase();
    if (!term) return;
    const hit = quickDestinations.find((d) => d.label.toLowerCase().includes(term));
    if (hit) {
      navigate(hit.value);
      setSearch('');
      return;
    }
    // Default: search assessments by query string.
    navigate(`/my-assessments?search=${encodeURIComponent(term)}`);
    setSearch('');
  };

  const initials = user
    ? `${user.name?.[0] ?? ''}${user.surname?.[0] ?? ''}`.toUpperCase() || (user.email?.[0]?.toUpperCase() ?? 'S')
    : 'S';

  return (
    <header className="flex items-center justify-between border-b border-gray-100 px-6 lg:px-8 h-20 bg-white/80 backdrop-blur-md shrink-0 sticky top-0 z-20 gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggle}
          className="text-gray-400 hover:text-black"
        />
        <div className="hidden md:flex items-center w-full max-w-100">
          <Input
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={handleSearchSubmit}
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder={t('header.searchPlaceholder')}
            className="rounded-2xl"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
        <Tooltip title={t('header.startPractice')}>
          <button
            onClick={() => navigate('/practice')}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-black text-white text-xs font-black uppercase tracking-widest hover:bg-gray-800 cursor-pointer shadow-md shadow-black/10"
          >
            <PlayCircleFilled /> {t('nav.practice')}
          </button>
        </Tooltip>

        <Dropdown menu={{ items: languageItems, selectable: true, selectedKeys: [locale] }} placement="bottomRight" trigger={['click']}>
          <Tooltip title={t('header.language')}>
            <button className="flex items-center gap-1.5 rounded-full px-3 h-10 text-gray-600 hover:bg-gray-100 hover:text-black transition-colors cursor-pointer text-xs font-bold uppercase tracking-widest">
              <GlobalOutlined className="text-base" />
              {locale}
            </button>
          </Tooltip>
        </Dropdown>

        <Tooltip title={t('header.theme')}>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center rounded-full size-10 text-gray-500 hover:bg-gray-100 hover:text-black transition-colors cursor-pointer"
          >
            {isDark ? <BulbOutlined className="text-lg" /> : <MoonOutlined className="text-lg" />}
          </button>
        </Tooltip>

        <Tooltip title={t('nav.help')}>
          <button
            onClick={() => navigate('/help')}
            className="flex items-center justify-center rounded-full size-10 text-gray-500 hover:bg-gray-100 hover:text-black transition-colors cursor-pointer"
          >
            <QuestionCircleOutlined className="text-lg" />
          </button>
        </Tooltip>

        <Dropdown menu={{ items: notificationItems }} placement="bottomRight" trigger={['click']}>
          <Tooltip title={t('header.notifications')}>
            <button className="flex items-center justify-center rounded-full size-10 text-gray-500 hover:bg-gray-100 hover:text-black transition-colors relative cursor-pointer">
              <Badge count={notifications?.unread_count ?? 0} size="small">
                <BellOutlined className="text-lg" />
              </Badge>
            </button>
          </Tooltip>
        </Dropdown>

        <div className="h-8 w-px bg-gray-100 mx-1" />

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
          <button className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-full hover:bg-gray-50 cursor-pointer">
            <Avatar
              className="bg-gradient-to-br from-gray-900 to-gray-700 text-white border border-gray-200 shadow-sm font-bold"
              size={'default'}
            >
              {initials}
            </Avatar>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-black text-gray-900 leading-none mb-1 truncate max-w-32">
                {user ? `${user.name ?? ''} ${user.surname ?? ''}`.trim() || user.username || user.email : t('aiInterview.you')}
              </p>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                {user?.userRole || t('nav.account')}
              </p>
            </div>
          </button>
        </Dropdown>
      </div>
    </header>
  );
};

export default Header;
