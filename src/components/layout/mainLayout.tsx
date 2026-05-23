import React, { useState } from 'react';
import { Layout, ConfigProvider, theme as antdTheme } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { logout } from '../../features/auth/authSlice';
import Sidebar from './sidebar';
import HeaderComponent from './header';
import useTheme from '../../hooks/useTheme';

const { Content } = Layout;

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
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: isDark ? '#f3f5f9' : '#000000',
          borderRadius: 8,
          fontFamily: 'Inter, sans-serif',
          colorBgBase: isDark ? '#0d1018' : '#ffffff',
          colorTextBase: isDark ? '#f3f5f9' : '#0b1220',
        },
        components: {
          Layout: {
            bodyBg: isDark ? '#0d1018' : '#fbfbfc',
            siderBg: isDark ? '#161a23' : '#ffffff',
            headerBg: isDark ? '#161a23' : '#ffffff',
          },
          Card: {
            colorBgContainer: isDark ? '#1d222d' : '#ffffff',
          },
          Modal: {
            contentBg: isDark ? '#1d222d' : '#ffffff',
            headerBg: isDark ? '#1d222d' : '#ffffff',
          },
        },
      }}
    >
      <div className="flex h-screen overflow-hidden bg-[#FBFBFC] dark:bg-[#0d1018]">
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
