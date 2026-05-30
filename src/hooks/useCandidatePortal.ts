import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch, buildQuery } from '../lib/api';
import type {
  AchievementsResponse,
  AIProfileResponse,
  AnalyticsResponse,
  ApplicationsResponse,
  ApplyResponse,
  AssessmentsResponse,
  AvatarUploadResponse,
  CertificateCreatePayload,
  CertificateItem,
  CertificatesResponse,
  CandidateMe,
  DashboardResponse,
  LeaderboardResponse,
  NextQuestionResponse,
  NotificationsResponse,
  PortalStatus,
  PracticeCategoriesResponse,
  PracticeEligibility,
  PracticeInfo,
  PracticeNextQuestionResponse,
  ProfileUpdatePayload,
  ReportResponse,
  ResumeReview,
  SubmitAnswerResponse,
  TestSessionProgress,
  TestSessionStart,
  VacanciesResponse,
  VacancyDetail,
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
  leaderboard: (scope: string) => ['candidatePortal', 'leaderboard', scope] as const,
  achievements: ['candidatePortal', 'achievements'] as const,
  practiceCategories: ['candidatePortal', 'practice', 'categories'] as const,
  vacancies: (search: string) => ['candidatePortal', 'vacancies', search] as const,
  vacancyDetail: (vacancyId: string) =>
    ['candidatePortal', 'vacancy', vacancyId] as const,
  applications: ['candidatePortal', 'applications'] as const,
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

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => (
      apiFetch<{ ok: boolean; unread_count: number; last_read_at: string }>(
        '/candidate/portal/notifications/read-all',
        { method: 'POST' },
      )
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portalKeys.notifications });
      queryClient.invalidateQueries({ queryKey: portalKeys.dashboard });
    },
  });
};

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

export const useUploadProfileAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      return apiFetch<AvatarUploadResponse>('/candidate/portal/profile/avatar', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(portalKeys.aiProfile, data);
      queryClient.invalidateQueries({ queryKey: portalKeys.me });
      queryClient.invalidateQueries({ queryKey: portalKeys.dashboard });
    },
  });
};

export const useDeleteProfileAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => (
      apiFetch<AvatarUploadResponse>('/candidate/portal/profile/avatar', {
        method: 'DELETE',
      })
    ),
    onSuccess: (data) => {
      queryClient.setQueryData(portalKeys.aiProfile, data);
      queryClient.invalidateQueries({ queryKey: portalKeys.me });
      queryClient.invalidateQueries({ queryKey: portalKeys.dashboard });
    },
  });
};

// U6: browse currently-open vacancies the candidate can apply to.
export const useVacancies = (search: string) => (
  useQuery({
    queryKey: portalKeys.vacancies(search),
    queryFn: () => (
      apiFetch<VacanciesResponse>(`/candidate/portal/vacancies${buildQuery({ search: search || undefined })}`)
    ),
    placeholderData: keepPreviousData,
  })
);

// U6: apply to a vacancy. A user may apply to many vacancies but only once
// each — the backend returns 409 on a duplicate, surfaced to the UI.
export const useApplyToVacancy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vacancyId: string) => (
      apiFetch<ApplyResponse>(`/candidate/portal/vacancies/${vacancyId}/apply`, {
        method: 'POST',
      })
    ),
    onSuccess: (_, vacancyId) => {
      queryClient.invalidateQueries({ queryKey: ['candidatePortal', 'vacancies'] });
      queryClient.invalidateQueries({ queryKey: portalKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: portalKeys.applications });
      queryClient.invalidateQueries({
        queryKey: portalKeys.vacancyDetail(vacancyId),
      });
    },
  });
};

// Full vacancy info for the open-roles detail modal: description,
// dates, candidate count, the linked practice, and my application
// status (if any).
export const useVacancyDetail = (vacancyId?: string) => (
  useQuery({
    queryKey: portalKeys.vacancyDetail(vacancyId ?? ''),
    queryFn: () => (
      apiFetch<VacancyDetail>(`/candidate/portal/vacancies/${vacancyId}`)
    ),
    enabled: Boolean(vacancyId),
    staleTime: 1000 * 30,
  })
);

// My pipeline: every vacancy I've applied to with current status,
// stage index for the FIFA-style stepper, linked test and my latest
// session against it.
export const useMyApplications = () => (
  useQuery({
    queryKey: portalKeys.applications,
    queryFn: () => apiFetch<ApplicationsResponse>('/candidate/portal/applications'),
    staleTime: 1000 * 30,
  })
);

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
      // No-resume policy: this hook only starts NEW sessions. If the
      // user already has any session for the practice the backend will
      // return 409 and the UI redirects to the report page; we do not
      // silently resume.
      const eligibility = await apiFetch<PracticeEligibility>(
        `/testing/practices/${practiceId}/eligibility`,
      );

      if (!eligibility.can_start) {
        throw new ApiError(
          409,
          eligibility.reason ?? 'This assessment is not available.',
          eligibility,
        );
      }

      return apiFetch<TestSessionStart>(`/testing/practices/${practiceId}/sessions`, {
        method: 'POST',
        body: JSON.stringify({
          device_fingerprint: `${navigator.platform || 'unknown'}:${screen.width}x${screen.height}:${Intl.DateTimeFormat().resolvedOptions().timeZone || 'tz'}`,
        }),
      });
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
    onSuccess: (data) => {
      // Perf: the backend now ships the adaptive next-question alongside
      // the answer result, so we seed the next-question cache directly
      // instead of invalidating + refetching (which would cost an
      // additional HTTP round-trip on every submission).
      if (sessionId) {
        if (data.is_finished) {
          // Test is over — drop the cached question so a stale stub
          // doesn't briefly flash while we navigate to the report.
          queryClient.removeQueries({
            queryKey: portalKeys.nextQuestion(sessionId),
          });
        } else if (data.next_question) {
          queryClient.setQueryData(
            portalKeys.nextQuestion(sessionId),
            data.next_question,
          );
        }
        // Light session-meta refresh stays as an invalidation; it's not
        // on the critical render path.
        queryClient.invalidateQueries({ queryKey: portalKeys.session(sessionId) });
      }
      queryClient.invalidateQueries({ queryKey: portalKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: ['candidatePortal', 'assessments'] });
    },
  });
};

export const useLeaderboard = (scope: 'group' | 'global' = 'group') => (
  useQuery({
    queryKey: portalKeys.leaderboard(scope),
    queryFn: () => apiFetch<LeaderboardResponse>(`/candidate/portal/leaderboard${buildQuery({ scope })}`),
    staleTime: 1000 * 60,
  })
);

export const useAchievements = () => (
  useQuery({
    queryKey: portalKeys.achievements,
    queryFn: () => apiFetch<AchievementsResponse>('/candidate/portal/achievements'),
    staleTime: 1000 * 60,
  })
);

export const usePracticeCategories = () => (
  useQuery({
    queryKey: portalKeys.practiceCategories,
    queryFn: () => apiFetch<PracticeCategoriesResponse>('/candidate/portal/practice/categories'),
    staleTime: 1000 * 60 * 10,
  })
);

export const fetchPracticeNextQuestion = (params: {
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  excludeIds?: string[];
}) => {
  const query = buildQuery({
    category: params.category,
    difficulty: params.difficulty,
    exclude_ids: params.excludeIds?.join(',') ?? undefined,
  });
  return apiFetch<PracticeNextQuestionResponse>(`/candidate/portal/practice/next-question${query}`);
};
