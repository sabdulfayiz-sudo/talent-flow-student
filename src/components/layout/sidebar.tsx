import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppstoreOutlined,
  BulbOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ThunderboltFilled,
  TrophyOutlined,
  UserOutlined,
  CrownOutlined,
} from '@ant-design/icons';

interface SidebarProps {
  collapsed: boolean;
}

type NavItem = {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
};

const PRIMARY_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: <AppstoreOutlined />, path: '/' },
  { label: 'My assessments', icon: <FileTextOutlined />, path: '/my-assessments' },
  { label: 'Practice lab', icon: <BulbOutlined />, path: '/practice', badge: 'New' },
  { label: 'Leaderboard', icon: <CrownOutlined />, path: '/leaderboard' },
  { label: 'Achievements', icon: <TrophyOutlined />, path: '/achievements' },
  { label: 'Certificates', icon: <SafetyCertificateOutlined />, path: '/certificates' },
  { label: 'My profile', icon: <UserOutlined />, path: '/profile' },
];

const SECONDARY_ITEMS: NavItem[] = [
  { label: 'Help', icon: <QuestionCircleOutlined />, path: '/help' },
  { label: 'Settings', icon: <SettingOutlined />, path: '/settings' },
];

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

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
                  Talent Flow AI
                </h1>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Student workspace</p>
              </div>
            )}
          </button>

          <nav className="space-y-1">{PRIMARY_ITEMS.map(renderItem)}</nav>
        </div>

        <div className="space-y-2 pt-6 border-t border-gray-50">
          {SECONDARY_ITEMS.map(renderItem)}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
