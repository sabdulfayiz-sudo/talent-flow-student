import React from 'react';
import {
  CrownFilled,
  FireFilled,
  StarFilled,
  ThunderboltFilled,
  TrophyFilled,
} from '@ant-design/icons';
import { Progress, Spin } from 'antd';
import { useAchievements } from '../hooks/useCandidatePortal';

const tierStyle: Record<string, { ring: string; chip: string; icon: string }> = {
  bronze: { ring: 'ring-amber-200', chip: 'bg-amber-50 text-amber-700', icon: 'text-amber-600' },
  silver: { ring: 'ring-gray-200', chip: 'bg-gray-100 text-gray-700', icon: 'text-gray-500' },
  gold: { ring: 'ring-amber-300', chip: 'bg-amber-100 text-amber-800', icon: 'text-amber-500' },
};

const AchievementsPage: React.FC = () => {
  const { data, isLoading, isError } = useAchievements();

  if (isLoading) {
    return (
      <div className="min-h-80 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-white rounded-3xl border border-rose-100 p-12 text-center text-rose-500">
        Achievements unavailable.
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Progression</p>
          <h2 className="text-4xl font-bold tracking-tighter text-gray-900 leading-none mb-3">Achievements</h2>
          <p className="text-gray-500 font-medium max-w-180">
            Badges awarded based on your finished assessments, certificates,
            and answering streak. Earn more by completing assessments and
            scoring above 80%.
          </p>
        </div>

        <div className="rounded-3xl bg-black text-white px-6 py-5 min-w-72">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Badges earned</p>
          <p className="text-3xl font-black">
            {data.earned_count}
            <span className="text-white/40 text-lg font-bold"> / {data.total_count}</span>
          </p>
          <Progress
            percent={data.total_count ? Math.round((data.earned_count / data.total_count) * 100) : 0}
            strokeColor="#facc15"
            trailColor="rgba(255,255,255,0.15)"
            showInfo={false}
          />
        </div>
      </div>

      <section className="tf-stagger grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Completed', value: data.summary.completed_assessments, icon: <TrophyFilled className="text-amber-500" /> },
          { label: 'Perfect', value: data.summary.perfect_scores, icon: <CrownFilled className="text-amber-500" /> },
          { label: 'Average', value: `${data.summary.average_score}%`, icon: <ThunderboltFilled className="text-emerald-500" /> },
          { label: 'Certificates', value: data.summary.certificates, icon: <StarFilled className="text-blue-500" /> },
          { label: 'Streak', value: `${data.summary.current_streak_days}d`, icon: <FireFilled className="text-rose-500" /> },
        ].map((card) => (
          <div key={card.label} className="tf-hover-lift animate-in fade-in slide-in-from-bottom-2 duration-500 bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1">
              {card.icon} {card.label}
            </p>
            <p className="text-xl font-black text-gray-900">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="tf-stagger grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {data.badges.map((badge) => {
          const tier = tierStyle[badge.tier] ?? tierStyle.bronze;
          const percent = Math.min(100, Math.round((badge.progress / badge.target) * 100));
          return (
            <article
              key={badge.id}
              className={`tf-hover-lift animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm relative overflow-hidden ${badge.earned ? `ring-4 ${tier.ring}` : 'opacity-90'}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`size-12 rounded-2xl flex items-center justify-center text-2xl ${tier.chip}`}>
                  <TrophyFilled className={tier.icon} />
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${badge.earned ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {badge.earned ? 'Earned' : 'In progress'}
                  </p>
                  <p className="text-lg font-black text-gray-900">{badge.title}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4 min-h-10">{badge.description}</p>
              <Progress percent={percent} showInfo={false} strokeColor={badge.earned ? '#10b981' : '#111827'} trailColor="#f3f4f6" />
              <p className="text-[11px] font-black text-gray-400 mt-2">
                {badge.progress} / {badge.target}
              </p>
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default AchievementsPage;
