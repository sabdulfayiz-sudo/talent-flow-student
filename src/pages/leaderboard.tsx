import React, { useState } from 'react';
import { CrownFilled, TeamOutlined, TrophyFilled } from '@ant-design/icons';
import { Segmented, Spin } from 'antd';
import { useLeaderboard } from '../hooks/useCandidatePortal';

const LeaderboardPage: React.FC = () => {
  const [scope, setScope] = useState<'group' | 'global'>('group');
  const { data, isLoading, isError } = useLeaderboard(scope);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Standings</p>
          <h2 className="text-4xl font-bold tracking-tighter text-gray-900 leading-none mb-3">Leaderboard</h2>
          <p className="text-gray-500 font-medium max-w-180">
            Average score across your finished assessments. Other students are
            shown by initials only — your row is visible to you alone.
          </p>
        </div>

        <Segmented
          value={scope}
          onChange={(value) => setScope(value as 'group' | 'global')}
          options={[
            { label: 'My group', value: 'group' },
            { label: 'Everyone', value: 'global' },
          ]}
        />
      </div>

      {data?.group_name && scope === 'group' && (
        <div className="rounded-2xl bg-blue-50 text-blue-700 p-4 flex items-center gap-3 text-sm font-bold">
          <TeamOutlined /> Showing students in <span className="px-2 py-0.5 rounded-full bg-white">{data.group_name}</span>
          {data.you_rank ? <span className="ml-auto">You are #{data.you_rank}</span> : null}
        </div>
      )}

      {isLoading ? (
        <div className="min-h-80 flex items-center justify-center">
          <Spin size="large" />
        </div>
      ) : isError || !data ? (
        <div className="bg-white rounded-3xl border border-rose-100 p-12 text-center text-rose-500">
          Leaderboard unavailable.
        </div>
      ) : !data.items.length ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center text-gray-500">
          No standings yet. Finish an assessment to appear on the board.
        </div>
      ) : (
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <header className="grid grid-cols-12 gap-2 px-6 py-4 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-500">
            <div className="col-span-1">Rank</div>
            <div className="col-span-5">Student</div>
            <div className="col-span-2 text-right">Score</div>
            <div className="col-span-2 text-right">Sessions</div>
            <div className="col-span-2 text-right">Last activity</div>
          </header>
          <ul>
            {data.items.map((item) => {
              const podium = item.rank <= 3;
              return (
                <li
                  key={`${item.rank}-${item.user_id ?? item.display_name}`}
                  className={`grid grid-cols-12 gap-2 px-6 py-4 border-t border-gray-50 items-center text-sm ${
                    item.is_self ? 'bg-amber-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="col-span-1 font-black text-gray-900 flex items-center gap-2">
                    {podium ? (
                      <CrownFilled className={item.rank === 1 ? 'text-amber-500' : item.rank === 2 ? 'text-gray-400' : 'text-amber-700'} />
                    ) : (
                      <span className="text-gray-400">#</span>
                    )}
                    {item.rank}
                  </div>
                  <div className="col-span-5 font-bold text-gray-900 flex items-center gap-2">
                    <span className={`size-9 rounded-full flex items-center justify-center text-xs font-black ${item.is_self ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {item.display_name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="leading-tight">{item.display_name}</p>
                      {item.is_self ? <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">You</p> : null}
                    </div>
                  </div>
                  <div className="col-span-2 text-right font-black text-gray-900 flex items-center justify-end gap-1">
                    <TrophyFilled className="text-amber-500" />
                    {item.average_score}%
                  </div>
                  <div className="col-span-2 text-right text-gray-600 font-semibold">{item.completed_sessions}</div>
                  <div className="col-span-2 text-right text-gray-500 text-xs">
                    {item.last_activity_at
                      ? new Date(item.last_activity_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—'}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
};

export default LeaderboardPage;
