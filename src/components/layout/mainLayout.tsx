import React, { useState } from 'react';
import { Layout, ConfigProvider, theme as antTheme } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { logout } from '../../features/auth/authSlice';
import { useTheme } from '../../hooks/useTheme';
import Sidebar from './sidebar';
import HeaderComponent from './header';
import useTheme from '../../hooks/useTheme';

const { Content } = Layout;

const lightTokens = {
  colorPrimary: '#111827',
  colorBgContainer: '#ffffff',
  colorBorder: '#e5e7eb',
  colorText: '#111827',
  colorTextSecondary: '#6b7280',
  borderRadius: 12,
  fontFamily: 'Inter, sans-serif',
};

const darkTokens = {
  colorPrimary: '#3b82f6',
  colorBgContainer: '#111827',
  colorBorder: '#334155',
  colorText: '#f9fafb',
  colorTextSecondary: '#94a3b8',
  borderRadius: 12,
  fontFamily: 'Inter, sans-serif',
};

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { isDark } = useTheme();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/signin');
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: isDark ? darkTokens : lightTokens,
      }}
    >
      <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-[#0b1020]' : 'bg-[#FBFBFC]'}`}>
        <Sidebar collapsed={collapsed} />

        <Layout className="bg-transparent flex flex-col h-full">
          <HeaderComponent
            user={user}
            collapsed={collapsed}
            onToggle={() => setCollapsed(!collapsed)}
            onLogout={handleLogout}
          />

          <Content className="p-8 lg:p-12 overflow-y-auto">
            <div className="max-w-350 mx-auto">
              <Outlet />
            </div>
          </Content>
        </Layout>
      </div>
    </ConfigProvider>
  );
};

export default MainLayout;
