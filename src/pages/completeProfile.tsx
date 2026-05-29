import React from 'react';
import { Form, Input, Button, Typography, message, ConfigProvider } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useUpdateAIProfile } from '../hooks/useCandidatePortal';
import { useAppDispatch } from '../app/hooks';
import { updateUser } from '../features/auth/authSlice';
import { PROFILE_INCOMPLETE_KEY } from '../App';

const { Title, Text } = Typography;

interface CompleteProfileForm {
  name: string;
  surname: string;
  headline?: string;
}

/**
 * "Complete your profile" step (U3). Shown once after self sign-up when the
 * account is missing core profile data. Skippable so the user is never
 * blocked from reaching the dashboard.
 */
const CompleteProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const updateProfile = useUpdateAIProfile();
  const [form] = Form.useForm<CompleteProfileForm>();

  const finish = () => {
    localStorage.removeItem(PROFILE_INCOMPLETE_KEY);
    navigate('/', { replace: true });
  };

  const onFinish = async (values: CompleteProfileForm) => {
    try {
      await updateProfile.mutateAsync({
        name: values.name,
        surname: values.surname,
        headline: values.headline,
      });
      dispatch(updateUser({ name: values.name, surname: values.surname }));
      message.success('Profile saved.');
      finish();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Could not save your profile.');
    }
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
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60" />
        <div className="w-full max-w-100 z-10">
          <div className="text-center mb-8">
            <Title level={2} className="font-semibold! tracking-tight! mb-2!">
              Complete your profile
            </Title>
            <Text className="text-gray-500 text-base">
              Tell us a little about yourself. You can always edit this later.
            </Text>
          </div>

          <Form layout="vertical" form={form} onFinish={onFinish} requiredMark={false} size="large">
            <Form.Item<CompleteProfileForm>
              name="name"
              label={<span className="text-[13px] font-semibold text-gray-700 ml-1">First name</span>}
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input className="h-12" placeholder="Jane" />
            </Form.Item>

            <Form.Item<CompleteProfileForm>
              name="surname"
              label={<span className="text-[13px] font-semibold text-gray-700 ml-1">Last name</span>}
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input className="h-12" placeholder="Doe" />
            </Form.Item>

            <Form.Item<CompleteProfileForm>
              name="headline"
              label={<span className="text-[13px] font-semibold text-gray-700 ml-1">Headline (optional)</span>}
            >
              <Input className="h-12" placeholder="Aspiring Frontend Engineer" />
            </Form.Item>

            <Form.Item className="pt-1 mb-2">
              <Button type="primary" htmlType="submit" block loading={updateProfile.isPending} className="h-12 font-semibold">
                Save & continue
              </Button>
            </Form.Item>
          </Form>

          <p className="text-center text-sm text-gray-500 mt-2">
            <button onClick={finish} className="font-semibold text-gray-500 hover:text-black cursor-pointer">
              Skip for now
            </button>
          </p>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default CompleteProfilePage;
