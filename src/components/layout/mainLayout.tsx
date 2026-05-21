import React, { useState } from 'react';
import { Layout, ConfigProvider } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { logout } from '../../features/auth/authSlice';
import Sidebar from './sidebar';
import HeaderComponent from './header';

const { Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  
  const handleLogout = () => {
    dispatch(logout());
    navigate('/signin');
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#000000',
          borderRadius: 8,
          fontFamily: 'Inter, sans-serif',
        },
      }}
    >
      <div className="flex h-screen overflow-hidden bg-[#FBFBFC]">
        
        <Sidebar collapsed={collapsed} />

        <Layout className="bg-transparent flex flex-col h-full">
          {/* Custom Header Component */}
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
