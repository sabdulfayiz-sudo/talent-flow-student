import React, { useEffect } from 'react';
import { Form, Input, Button, Typography, message, ConfigProvider } from 'antd';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { clearMustChangePassword, logout } from '../features/auth/authSlice';

const { Title, Text } = Typography;

interface SetPasswordForm {
  new_password: string;
  confirm_password: string;
}

/**
 * Forced "set a new password" screen (U2). Shown when an account was
 * created, invited, or reset by an admin (`must_change_password`). The
 * current password is not required here — the user was just issued a
 * temporary one — so the backend accepts the change without it.
 */
const SetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const mustChangePassword = useAppSelector((state) => state.auth.mustChangePassword);
  const [form] = Form.useForm<SetPasswordForm>();
  const [submitting, setSubmitting] = React.useState(false);

  // If the user lands here without the flag set, send them home.
  useEffect(() => {
    if (!mustChangePassword) {
      navigate('/', { replace: true });
    }
  }, [mustChangePassword, navigate]);

  const onFinish = async (values: SetPasswordForm) => {
    setSubmitting(true);
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ new_password: values.new_password }),
      });
      dispatch(clearMustChangePassword());
      message.success('Password updated. Welcome to TalentFlow.');
      navigate('/', { replace: true });
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Could not update your password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = () => {
    dispatch(logout());
    navigate('/signin', { replace: true });
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
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F9FAFB] relative overflow-hidden px-6">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60" />
        <div className="w-full max-w-100 z-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 mb-6 bg-black rounded-xl shadow-lg">
              <div className="w-5 h-5 bg-white rounded-sm rotate-45" />
            </div>
            <Title level={2} className="font-semibold! tracking-tight! mb-2!">
              Set a new password
            </Title>
            <Text className="text-gray-500 text-base">
              For your security, please choose a new password before continuing.
            </Text>
          </div>

          <Form layout="vertical" form={form} onFinish={onFinish} requiredMark={false} size="large">
            <Form.Item<SetPasswordForm>
              name="new_password"
              label={<span className="text-[13px] font-semibold text-gray-700 ml-1">New password</span>}
              rules={[
                { required: true, message: 'Required' },
                { min: 4, message: 'Use at least 4 characters' },
              ]}
              hasFeedback
            >
              <Input.Password className="h-12" placeholder="••••••••" />
            </Form.Item>

            <Form.Item<SetPasswordForm>
              name="confirm_password"
              dependencies={['new_password']}
              label={<span className="text-[13px] font-semibold text-gray-700 ml-1">Confirm new password</span>}
              rules={[
                { required: true, message: 'Required' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('new_password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
              hasFeedback
            >
              <Input.Password className="h-12" placeholder="••••••••" />
            </Form.Item>

            <Form.Item className="pt-2">
              <Button type="primary" htmlType="submit" block loading={submitting} className="h-12 font-semibold">
                Save password & continue
              </Button>
            </Form.Item>
          </Form>

          <p className="text-center text-sm text-gray-500 mt-4">
            <button onClick={handleSignOut} className="font-semibold text-gray-500 hover:text-black cursor-pointer">
              Sign out
            </button>
          </p>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default SetPasswordPage;
