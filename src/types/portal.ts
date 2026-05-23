export type PortalStatus = 'active' | 'draft' | 'completed' | 'in_review' | 'locked';
export type CertificateStatus = 'verified' | 'pending';

export interface CandidateMe {
  id: string;
  username?: string;
  full_name: string;
  name?: string;
  surname?: string;
  email?: string;
  role: string;
  group_name?: string;
  avatar_url?: string | null;
  student_id: string;
  avatar_initials: string;
}

export interface PortalAssessment {
  practice_id: string;
  assignment_id: string;
  session_id: string | null;
  title: string;
  description: string;
  category: string;
  tags: string[];
  duration_minutes: number;
  deadline: string | null;
  assigned_at: string;
  completed_at: string | null;
  question_count: number;
  difficulty: string;
  status: PortalStatus;
  status_label: string;
  status_tone: string;
  cta_label: string;
  cta_url: string | null;
  score: number | null;
  progress: number | null;
}

export interface AssessmentsResponse {
  items: PortalAssessment[];
  counts: Record<string, number>;
  total: number;
  page: number;
  size: number;
  total_pages: number;
}

export interface ResumeReview {
  id: string;
  filename: string;
  file_url?: string | null;
  score: number;
  analysis_summary?: string | null;
  strengths: string[];
  suggestions: string[];
  created_at: string;
}

export interface CertificateItem {
  id: string;
  source: 'assessment' | 'external';
  title: string;
  provider?: string | null;
  issued_at?: string | null;
  status: CertificateStatus;
  badge_label?: string | null;
  credential_id?: string | null;
  tags: string[];
  score?: number | null;
  download_url?: string | null;
  share_url?: string | null;
  verification_notes?: string | null;
}

export interface CertificatesResponse {
  items: CertificateItem[];
  counts: Record<'all' | CertificateStatus, number>;
  total: number;
}

export interface DashboardResponse {
  greeting: {
    headline: string;
    message: string;
  };
  stats: {
    active_assessments: number;
    completed_assessments: number;
    average_score: number;
    certificates: number;
    notifications?: number;
  };
  active_assessments: PortalAssessment[];
  recent_activity: {
    title: string;
    date: string | null;
    status: string;
    score: number | null;
    action_url: string | null;
  }[];
  resume_insights: ResumeReview | null;
  certificates_preview: CertificateItem[];
  notifications_preview?: NotificationItem[];
  profile_share_url?: string;
}

export interface AnalyticsResponse {
  overview: {
    assigned_assessments: number;
    started_assessments: number;
    completed_assessments: number;
    average_score: number;
    best_score: number;
    total_time_seconds: number;
    total_time_label: string;
  };
  categories: {
    category: string;
    score: number;
    answered: number;
    correct: number;
  }[];
  timeline: {
    session_id: string;
    practice_id: string;
    title: string;
    score: number;
    is_finished: boolean;
    started_at: string;
  }[];
}

export interface AIProfileResponse {
  profile: {
    id: string;
    username?: string;
    full_name: string;
    name?: string;
    surname?: string;
    role: string;
    headline: string;
    location?: string | null;
    university?: string | null;
    graduation_year?: string | null;
    open_to_work: boolean;
    avatar_url?: string | null;
    avatar_initials: string;
  };
  contact: {
    email?: string | null;
    phone?: string | null;
    portfolio_url?: string | null;
    linkedin_url?: string | null;
  };
  profile_strength: {
    score: number;
    label: string;
    improve_url: string;
  };
  ai_review: {
    title: string;
    updated_at: string;
    summary: string;
    insights: {
      type: string;
      title: string;
      body: string;
      score?: number | null;
    }[];
  };
  linkedin_optimization: {
    current_headline: string;
    suggested_headline: string;
    recommendations: string[];
  };
  career_roadmap: {
    title: string;
    subtitle: string;
    status: 'achieved' | 'in_progress' | 'missing' | 'goal';
    progress: number;
  }[];
}

export interface ProfileUpdatePayload {
  name?: string;
  surname?: string;
  email?: string;
  headline?: string;
  location?: string;
  university?: string;
  graduation_year?: string;
  phone?: string;
  portfolio_url?: string;
  linkedin_url?: string;
  open_to_work?: boolean;
}

export interface NotificationItem {
  id?: string;
  type: string;
  title: string;
  message: string;
  priority: 'high' | 'normal';
  created_at: string;
  action_label: string;
  action_url: string | null;
  is_read?: boolean;
}

export interface NotificationsResponse {
  items: NotificationItem[];
  unread_count: number;
}

export type AvatarUploadResponse = AIProfileResponse;

export interface ReportResponse {
  session_id: string;
  practice_id: string;
  title: string;
  status: 'passed' | 'needs_improvement';
  score: number;
  completed_at: string;
  time_taken_seconds: number;
  time_taken_label: string;
  percentile: number;
  percentile_label: string;
  performance_by_category: {
    category: string;
    score: number;
    answered: number;
    correct: number;
  }[];
  question_review: {
    number: number;
    question_id: string | null;
    question_text: string | null;
    category: string;
    is_correct: boolean;
    user_answer: string | null;
    user_answer_text?: string | null;
    correct_answer_id?: string | null;
    correct_answer_text?: string | null;
    points_awarded: number;
    time_spent?: number | null;
  }[];
  ai_insights: {
    summary: string;
    strengths: string[];
    areas_for_improvement: string[];
    recommended_next_step: {
      title: string;
      duration: string;
      url: string;
    };
  };
}

export interface CertificateCreatePayload {
  title: string;
  provider?: string;
  issued_at?: string;
  tags?: string[];
  credential_id?: string;
  external_url?: string;
  file_url?: string;
  verification_notes?: string;
}

export interface PracticeInfo {
  practice_id: string;
  title: string;
  description: string;
  duration_minutes: number;
  deadline: string | null;
  question_count: number;
  tags: string[];
}

export interface PracticeEligibility {
  status: string;
  can_start: boolean;
  can_resume: boolean;
  session_id: string | null;
  reason: string | null;
}

export interface TestSessionStart {
  event: string;
  session_id: string;
  practice_id: string;
  started_at: string;
  duration_minutes: number;
  ends_at: string | null;
  total_questions: number;
  quantity: number;
  duration: number;
}

export interface TestSessionProgress {
  session_id: string;
  practice_id: string;
  is_finished: boolean;
  answered_count: number;
  correct_count: number;
  total_questions: number;
  overall_points: number;
  started_at: string;
  ends_at: string | null;
  seconds_remaining: number | null;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface NextQuestionResponse {
  event: 'question_data' | 'test_finished';
  session_id: string;
  id?: string;
  text?: string;
  options?: QuestionOption[] | Record<string, QuestionOption | string>;
  category?: string | null;
  points?: number;
  progress?: {
    answered_count: number;
    total_questions: number;
    remaining_count: number;
  };
  final_score?: number;
  reason?: string;
}

export interface SubmitAnswerResponse {
  event: 'answer_result';
  is_correct: boolean;
  correct_answer: string;
  points_awarded: number;
  new_difficulty: number;
  answered_count: number;
  total_questions: number;
  is_finished: boolean;
  final_score: number | null;
}

export interface LeaderboardItem {
  rank: number;
  user_id: string | null;
  display_name: string;
  is_self: boolean;
  group_name: string | null;
  average_score: number;
  completed_sessions: number;
  last_activity_at: string | null;
}

export interface LeaderboardResponse {
  scope: 'group' | 'global';
  group_name: string | null;
  items: LeaderboardItem[];
  you_rank: number | null;
  total_ranked: number;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold';
  earned: boolean;
  progress: number;
  target: number;
}

export interface AchievementsResponse {
  summary: {
    completed_assessments: number;
    perfect_scores: number;
    average_score: number;
    certificates: number;
    current_streak_days: number;
  };
  badges: AchievementBadge[];
  earned_count: number;
  total_count: number;
}

export interface PracticeCategory {
  category: string;
  question_count: number;
}

export interface PracticeCategoriesResponse {
  items: PracticeCategory[];
}

export interface PracticeQuestion {
  id: string;
  text: string;
  options: QuestionOption[] | Record<string, QuestionOption | string>;
  category: string | null;
  difficulty_level: number | null;
  correct_answer: string;
}

export interface PracticeNextQuestionResponse {
  event: 'practice_question' | 'exhausted';
  question: PracticeQuestion | null;
}


// ============================================================
// AI Interview (OpenAI-backed text chat with grading).
// Mirrors the schema returned by /candidate/portal/ai-interview/*.
// ============================================================

export interface AIInterviewMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface AIInterviewSkillBreakdown {
  skill: string;
  score: number;
  comment: string;
}

export interface AIInterviewFeedback {
  score: number | null;
  summary: string;
  strengths: string[];
  improvements: string[];
  skill_breakdown?: AIInterviewSkillBreakdown[];
}

export interface AIInterviewSession {
  id: string;
  role: string;
  context: string | null;
  status: 'active' | 'finished' | 'abandoned';
  created_at: string;
  finished_at: string | null;
  final_score: number | null;
  final_feedback: AIInterviewFeedback | null;
  message_count: number;
  messages?: AIInterviewMessage[];
}

export interface AIInterviewListResponse {
  items: AIInterviewSession[];
  configured: boolean;
}

export interface AIInterviewMessageResponse {
  student_message: AIInterviewMessage;
  interviewer_message: AIInterviewMessage;
  session: AIInterviewSession;
}
