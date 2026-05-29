import React, { useEffect } from 'react';
import { Form, Input, Button, Typography, message, ConfigProvider } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { loginUser, clearError, type LoginCredentials } from '../features/auth/authSlice';

const { Title, Text } = Typography;

interface LoginFormType {
  identifier: string;
  password?: string;
}

const SignIn: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      message.success('Welcome back');
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      message.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const onFinish = (values: LoginFormType) => {
    const isEmail = values.identifier.includes('@');
    const credentials: LoginCredentials = {
      password: values.password,
      email: isEmail ? values.identifier : undefined,
      username: !isEmail ? values.identifier : undefined,
    };
    dispatch(loginUser(credentials));
  };

  return (
    // ConfigProvider allows us to override Ant Design's default blue to a sleek black
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#000000',
          borderRadius: 12,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      }}
    >
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F9FAFB] relative overflow-hidden">
        {/* Subtle Background Decorative Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-50 rounded-full blur-[120px] opacity-60" />

        <div className="w-full max-w-100 px-6 z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 mb-6 bg-black rounded-xl shadow-lg">
              <div className="w-5 h-5 bg-white rounded-sm rotate-45" />
            </div>
            <Title level={2} className="font-semibold! tracking-tight! mb-2!">
              Sign in
            </Title>
            <Text className="text-gray-500 text-base">
              Enter your credentials to access your account
            </Text>
          </div>

          <Form
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            size="large"
            className="space-y-4"
          >
            <Form.Item<LoginFormType>
              name="identifier"
              label={<span className="text-[13px] font-semibold text-gray-700 ml-1">Email or Username</span>}
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input 
                className="h-12 border-gray-200 hover:border-black focus:border-black transition-all bg-white" 
                placeholder="e.g. alex@studio.com" 
                disabled={loading}
              />
            </Form.Item>

            <Form.Item<LoginFormType>
              name="password"
              label={
                <div className="flex justify-between w-full items-center">
                  <a href="forgot-password" className="text-[13px] font-medium text-gray-400 hover:text-black transition-colors">Forgot password?</a>
                </div>
              }
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input.Password 
                className="h-12 border-gray-200 hover:border-black focus:border-black transition-all bg-white" 
                placeholder="••••••••" 
                disabled={loading}
              />
            </Form.Item>

            <Form.Item className="pt-4">
              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                loading={loading}
                className="h-12 text-[15px] font-semibold shadow-sm hover:translate-y-px active:translate-y-0 transition-all"
              >
                Continue
              </Button>
            </Form.Item>
          </Form>

          <p className="text-center text-sm text-gray-500 mt-6">
            New to TalentFlow?{' '}
            <Link to="/signup" className="font-semibold text-black hover:underline">
              Create an account
            </Link>
          </p>

        </div>
      </div>
    </ConfigProvider>
  );
};

export default SignIn;