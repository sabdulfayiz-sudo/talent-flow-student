import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import type {
  AIInterviewListResponse,
  AIInterviewMessageResponse,
  AIInterviewSession,
} from '../types/portal';

const BASE = '/candidate/portal/ai-interview';

const keys = {
  health: ['aiInterview', 'health'] as const,
  list: ['aiInterview', 'list'] as const,
  one: (id: string) => ['aiInterview', 'session', id] as const,
};

export const useAIInterviewHealth = () =>
  useQuery({
    queryKey: keys.health,
    queryFn: () =>
      apiFetch<{ configured: boolean; model: string }>(`${BASE}/health`),
    staleTime: 1000 * 60 * 5,
  });

export const useAIInterviews = () =>
  useQuery({
    queryKey: keys.list,
    queryFn: () => apiFetch<AIInterviewListResponse>(`${BASE}/sessions`),
    staleTime: 1000 * 30,
  });

export const useAIInterview = (id?: string) =>
  useQuery({
    queryKey: keys.one(id ?? ''),
    queryFn: () => apiFetch<AIInterviewSession>(`${BASE}/sessions/${id}`),
    enabled: Boolean(id),
  });

export const useStartAIInterview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { role: string; context?: string }) =>
      apiFetch<AIInterviewSession>(`${BASE}/sessions`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.list });
      queryClient.setQueryData(keys.one(data.id), data);
    },
  });
};

export const useSendAIInterviewMessage = (sessionId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => {
      if (!sessionId) {
        return Promise.reject(new Error('Interview not started'));
      }
      return apiFetch<AIInterviewMessageResponse>(
        `${BASE}/sessions/${sessionId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ content }),
        },
      );
    },
    onSuccess: (data) => {
      // Patch the session cache with the two new messages so the UI
      // updates instantly without a re-fetch.
      queryClient.setQueryData<AIInterviewSession | undefined>(
        keys.one(data.session.id),
        (current) => {
          if (!current) return current;
          const messages = current.messages ?? [];
          return {
            ...current,
            ...data.session,
            messages: [
              ...messages,
              data.student_message,
              data.interviewer_message,
            ],
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: keys.list });
    },
  });
};

export const useFinishAIInterview = (sessionId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!sessionId) {
        return Promise.reject(new Error('Interview not started'));
      }
      return apiFetch<AIInterviewSession>(
        `${BASE}/sessions/${sessionId}/finish`,
        {
          method: 'POST',
        },
      );
    },
    onSuccess: (data) => {
      queryClient.setQueryData(keys.one(data.id), data);
      queryClient.invalidateQueries({ queryKey: keys.list });
    },
  });
};
