import React from 'react';
import {
  BellOutlined, 
  UserOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined
} from '@ant-design/icons';
import { Avatar, Badge, Dropdown, Button, Empty } from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../features/auth/authSlice';
import { useNotifications } from '../../hooks/useCandidatePortal';

interface HeaderProps {
  user: User | null;
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, collapsed, onToggle, onLogout }) => {
  const navigate = useNavigate();
  const { data: notifications } = useNotifications();

  const userMenuItems: MenuProps['items'] = [
    { key: 'profile', label: 'Profile', icon: <UserOutlined />, onClick: () => navigate('/profile') },
    { type: 'divider' },
    { key: 'logout', label: 'Logout', icon: <LogoutOutlined />, onClick: onLogout },
  ];
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

  return (
    <header className="flex items-center justify-between border-b border-gray-100 px-8 h-20 bg-white/80 backdrop-blur-md shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggle}
          className="text-gray-400 hover:text-black lg:hidden"
        />
      </div>

      <div className="flex items-center gap-6">
        <Dropdown menu={{ items: notificationItems }} placement="bottomRight" trigger={['click']}>
          <button className="flex items-center justify-center rounded-full size-10 text-gray-400 hover:bg-gray-100 hover:text-black transition-colors relative cursor-pointer">
            <Badge count={notifications?.unread_count ?? 0} size="small">
              <BellOutlined className="text-lg text-gray-500" />
            </Badge>
          </button>
        </Dropdown>

        <div className="h-8 w-px bg-gray-100" />

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            {/* Displaying actual user name and role from Redux state */}
            <p className="text-xs font-bold text-gray-900 leading-none mb-1">
              {user ? `${user.name} ${user.surname}` : 'Admin'}
            </p>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
              {user?.userRole || 'Recruitment Lead'}
            </p>
          </div>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
            <Avatar 
              className="cursor-pointer bg-gray-100 border border-gray-200 shadow-sm"
              icon={<UserOutlined className="text-gray-400" />}
              size={'large'}
            />
          </Dropdown>
        </div>
      </div>
    </header>
  );
};

export default Header;
