import React from 'react';
import { Form, Input, Button, Typography, message, ConfigProvider, Divider } from 'antd';
import { GoogleOutlined, LinkedinFilled } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAppDispatch } from '../app/hooks';
import { setSession, type SessionPayload } from '../features/auth/authSlice';
import { PROFILE_INCOMPLETE_KEY } from '../App';

const { Title, Text } = Typography;

interface SignUpForm {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

interface RegisterResponse extends SessionPayload {
  profile_complete?: boolean;
}

/**
 * Public self sign-up (U3). The backend forces role=USER and
 * company_id=NULL regardless of payload, so there is nothing to escalate
 * here. OAuth (Google / LinkedIn) is scaffolded but Phase 2 — the buttons
 * are present and the callback structure is stubbed, but they are disabled
 * so they never block email sign-up.
 */
const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [form] = Form.useForm<SignUpForm>();
  const [submitting, setSubmitting] = React.useState(false);

  const onFinish = async (values: SignUpForm) => {
    setSubmitting(true);
    try {
      const data = await apiFetch<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: values.username,
          email: values.email,
          password: values.password,
        }),
      });
      dispatch(setSession(data));
      message.success('Account created. Welcome to TalentFlow.');
      // Gate into profile completion when required data is missing.
      if (data.profile_complete) {
        localStorage.removeItem(PROFILE_INCOMPLETE_KEY);
        navigate('/', { replace: true });
      } else {
        localStorage.setItem(PROFILE_INCOMPLETE_KEY, '1');
        navigate('/complete-profile', { replace: true });
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  // Phase 2 — OAuth is intentionally a non-functional stub for now.
  const handleOAuth = (provider: 'google' | 'linkedin') => {
    message.info(`${provider === 'google' ? 'Google' : 'LinkedIn'} sign-in is coming soon.`);
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#000000',
          borderRadius: 12,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      }}
    >
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F9FAFB] relative overflow-hidden px-6 py-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60" />
        <div className="w-full max-w-100 z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 mb-6 bg-black rounded-xl shadow-lg">
              <div className="w-5 h-5 bg-white rounded-sm rotate-45" />
            </div>
            <Title level={2} className="font-semibold! tracking-tight! mb-2!">
              Create your account
            </Title>
            <Text className="text-gray-500 text-base">Start practicing and applying in minutes.</Text>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-2">
            <Button block size="large" icon={<GoogleOutlined />} className="h-12" onClick={() => handleOAuth('google')}>
              Google
            </Button>
            <Button block size="large" icon={<LinkedinFilled />} className="h-12" onClick={() => handleOAuth('linkedin')}>
              LinkedIn
            </Button>
          </div>
          <Divider plain className="text-gray-400! text-xs!">
            or sign up with email
          </Divider>

          <Form layout="vertical" form={form} onFinish={onFinish} requiredMark={false} size="large">
            <Form.Item<SignUpForm>
              name="username"
              label={<span className="text-[13px] font-semibold text-gray-700 ml-1">Username</span>}
              rules={[
                { required: true, message: 'Required' },
                { max: 30, message: 'Keep it under 30 characters' },
              ]}
            >
              <Input className="h-12" placeholder="jane.doe" autoComplete="username" />
            </Form.Item>

            <Form.Item<SignUpForm>
              name="email"
              label={<span className="text-[13px] font-semibold text-gray-700 ml-1">Email</span>}
              rules={[
                { required: true, message: 'Required' },
                { type: 'email', message: 'Enter a valid email' },
              ]}
            >
              <Input className="h-12" placeholder="you@example.com" autoComplete="email" />
            </Form.Item>

            <Form.Item<SignUpForm>
              name="password"
              label={<span className="text-[13px] font-semibold text-gray-700 ml-1">Password</span>}
              rules={[
                { required: true, message: 'Required' },
                { min: 4, message: 'Use at least 4 characters' },
              ]}
              hasFeedback
            >
              <Input.Password className="h-12" placeholder="••••••••" autoComplete="new-password" />
            </Form.Item>

            <Form.Item<SignUpForm>
              name="confirm_password"
              dependencies={['password']}
              label={<span className="text-[13px] font-semibold text-gray-700 ml-1">Confirm password</span>}
              rules={[
                { required: true, message: 'Required' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
              hasFeedback
            >
              <Input.Password className="h-12" placeholder="••••••••" autoComplete="new-password" />
            </Form.Item>

            <Form.Item className="pt-1">
              <Button type="primary" htmlType="submit" block loading={submitting} className="h-12 font-semibold">
                Create account
              </Button>
            </Form.Item>
          </Form>

          <p className="text-center text-sm text-gray-500 mt-2">
            Already have an account?{' '}
            <Link to="/signin" className="font-semibold text-black hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default SignUp;
