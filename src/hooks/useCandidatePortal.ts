import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch, buildQuery } from '../lib/api';
import type {
  AIProfileResponse,
  AnalyticsResponse,
  AssessmentsResponse,
  CertificateCreatePayload,
  CertificateItem,
  CertificatesResponse,
  CandidateMe,
  DashboardResponse,
  NextQuestionResponse,
  NotificationsResponse,
  PortalStatus,
  PracticeEligibility,
  PracticeInfo,
  ProfileUpdatePayload,
  ReportResponse,
  ResumeReview,
  SubmitAnswerResponse,
  TestSessionProgress,
  TestSessionStart,
} from '../types/portal';

export const portalKeys = {
  me: ['candidatePortal', 'me'] as const,
  dashboard: ['candidatePortal', 'dashboard'] as const,
  analytics: ['candidatePortal', 'analytics'] as const,
  aiProfile: ['candidatePortal', 'aiProfile'] as const,
  certificates: (status: string) => ['candidatePortal', 'certificates', status] as const,
  notifications: ['candidatePortal', 'notifications'] as const,
  resumeReview: ['candidatePortal', 'resumeReview'] as const,
  assessments: (params: unknown) => ['candidatePortal', 'assessments', params] as const,
  assessment: (practiceId: string) => ['candidatePortal', 'assessment', practiceId] as const,
  report: (sessionId: string) => ['candidatePortal', 'report', sessionId] as const,
  practice: (practiceId: string) => ['testing', 'practice', practiceId] as const,
  eligibility: (practiceId: string) => ['testing', 'eligibility', practiceId] as const,
  session: (sessionId: string) => ['testing', 'session', sessionId] as const,
  nextQuestion: (sessionId: string) => ['testing', 'nextQuestion', sessionId] as const,
};

export const useCandidateMe = () => (
  useQuery({
    queryKey: portalKeys.me,
    queryFn: () => apiFetch<CandidateMe>('/candidate/portal/me'),
    staleTime: 1000 * 60 * 15,
  })
);

export const useDashboard = () => (
  useQuery({
    queryKey: portalKeys.dashboard,
    queryFn: () => apiFetch<DashboardResponse>('/candidate/portal/dashboard'),
  })
);

export const useAssessments = (
  status: PortalStatus | 'all' | 'drafts',
  page: number,
  search: string,
  difficulty: string,
  sort: string,
) => {
  const params = { status, page, size: 6, search, difficulty, sort };

  return useQuery({
    queryKey: portalKeys.assessments(params),
    queryFn: () => apiFetch<AssessmentsResponse>(`/candidate/portal/assessments${buildQuery(params)}`),
    placeholderData: keepPreviousData,
  });
};

export const useAssessmentDetail = (practiceId?: string) => (
  useQuery({
    queryKey: portalKeys.assessment(practiceId ?? ''),
    queryFn: () => apiFetch(`/candidate/portal/assessments/${practiceId}`),
    enabled: Boolean(practiceId),
  })
);

export const useAnalytics = () => (
  useQuery({
    queryKey: portalKeys.analytics,
    queryFn: () => apiFetch<AnalyticsResponse>('/candidate/portal/analytics'),
  })
);

export const useAIProfile = () => (
  useQuery({
    queryKey: portalKeys.aiProfile,
    queryFn: () => apiFetch<AIProfileResponse>('/candidate/portal/ai-profile'),
  })
);

export const useUpdateAIProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProfileUpdatePayload) => (
      apiFetch<AIProfileResponse>('/candidate/portal/ai-profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
    ),
    onSuccess: (data) => {
      queryClient.setQueryData(portalKeys.aiProfile, data);
      queryClient.invalidateQueries({ queryKey: portalKeys.dashboard });
    },
  });
};

export const useCertificates = (status: 'all' | 'verified' | 'pending') => (
  useQuery({
    queryKey: portalKeys.certificates(status),
    queryFn: () => apiFetch<CertificatesResponse>(`/candidate/portal/certificates${buildQuery({ status })}`),
  })
);

export const useAddCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CertificateCreatePayload) => (
      apiFetch<CertificateItem>('/candidate/portal/certificates', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidatePortal', 'certificates'] });
      queryClient.invalidateQueries({ queryKey: portalKeys.dashboard });
    },
  });
};

export const useDeleteCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (certificateId: string) => (
      apiFetch<{ deleted: boolean }>(`/candidate/portal/certificates/${certificateId}`, {
        method: 'DELETE',
      })
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidatePortal', 'certificates'] });
      queryClient.invalidateQueries({ queryKey: portalKeys.dashboard });
    },
  });
};

export const useNotifications = () => (
  useQuery({
    queryKey: portalKeys.notifications,
    queryFn: () => apiFetch<NotificationsResponse>('/candidate/portal/notifications'),
    staleTime: 1000 * 60 * 2,
  })
);

export const useLatestResumeReview = () => (
  useQuery({
    queryKey: portalKeys.resumeReview,
    queryFn: () => apiFetch<ResumeReview | null>('/candidate/portal/resume-reviews/latest'),
  })
);

export const useUploadResumeReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      return apiFetch<ResumeReview>('/candidate/portal/resume-reviews', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portalKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: portalKeys.resumeReview });
      queryClient.invalidateQueries({ queryKey: portalKeys.notifications });
    },
  });
};

export const useReport = (sessionId?: string) => (
  useQuery({
    queryKey: portalKeys.report(sessionId ?? ''),
    queryFn: () => apiFetch<ReportResponse>(`/candidate/portal/reports/${sessionId}`),
    enabled: Boolean(sessionId),
  })
);

export const usePracticeInfo = (practiceId?: string) => (
  useQuery({
    queryKey: portalKeys.practice(practiceId ?? ''),
    queryFn: () => apiFetch<PracticeInfo>(`/testing/practices/${practiceId}`),
    enabled: Boolean(practiceId),
  })
);

export const usePracticeEligibility = (practiceId?: string) => (
  useQuery({
    queryKey: portalKeys.eligibility(practiceId ?? ''),
    queryFn: () => apiFetch<PracticeEligibility>(`/testing/practices/${practiceId}/eligibility`),
    enabled: Boolean(practiceId),
  })
);

export const useSessionProgress = (sessionId?: string) => (
  useQuery({
    queryKey: portalKeys.session(sessionId ?? ''),
    queryFn: () => apiFetch<TestSessionProgress>(`/testing/sessions/${sessionId}`),
    enabled: Boolean(sessionId),
    refetchInterval: 15000,
  })
);

export const useNextQuestion = (sessionId?: string) => (
  useQuery({
    queryKey: portalKeys.nextQuestion(sessionId ?? ''),
    queryFn: () => apiFetch<NextQuestionResponse>(`/testing/sessions/${sessionId}/next-question`),
    enabled: Boolean(sessionId),
    retry: false,
  })
);

export const useStartSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (practiceId: string) => {
      const eligibility = await apiFetch<PracticeEligibility>(`/testing/practices/${practiceId}/eligibility`);

      if (eligibility.can_resume && eligibility.session_id) {
        return apiFetch<TestSessionProgress>(`/testing/sessions/${eligibility.session_id}`);
      }

      if (!eligibility.can_start) {
        throw new ApiError(409, eligibility.reason ?? 'This assessment is not available.', eligibility);
      }

      try {
        return await apiFetch<TestSessionStart>(`/testing/practices/${practiceId}/sessions`, {
          method: 'POST',
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          const detail = error.payload && typeof error.payload === 'object' && 'detail' in error.payload
            ? (error.payload as { detail?: unknown }).detail
            : null;
          const sessionId = detail && typeof detail === 'object' && 'session_id' in detail
            ? (detail as { session_id?: string }).session_id
            : null;

          if (sessionId) {
            return apiFetch<TestSessionProgress>(`/testing/sessions/${sessionId}`);
          }
        }

        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: portalKeys.practice(data.practice_id) });
      queryClient.invalidateQueries({ queryKey: portalKeys.eligibility(data.practice_id) });
      queryClient.invalidateQueries({ queryKey: portalKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: ['candidatePortal', 'assessments'] });
    },
  });
};

export const useSubmitAnswer = (sessionId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { question_id: string; user_answer: string; time_spent: number }) => (
      apiFetch<SubmitAnswerResponse>(`/testing/sessions/${sessionId}/answers`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    ),
    onSuccess: () => {
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: portalKeys.session(sessionId) });
        queryClient.invalidateQueries({ queryKey: portalKeys.nextQuestion(sessionId) });
      }
      queryClient.invalidateQueries({ queryKey: portalKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: ['candidatePortal', 'assessments'] });
    },
  });
};
