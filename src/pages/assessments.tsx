import React, { useState } from 'react';
import { Input, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import AssessmentCard from '../components/assessments/assessmentCard';
import { useAssessments } from '../hooks/useCandidatePortal';
import type { PortalAssessment, PortalStatus } from '../types/portal';

const PAGE_SIZE = 6;
const tabs: { key: PortalStatus | 'all' | 'drafts'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'drafts', label: 'Drafts' },
];

const AssessmentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PortalStatus | 'all' | 'drafts'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [sort, setSort] = useState('newest');
  const navigate = useNavigate();
  const { data, isLoading, isPlaceholderData, isError } = useAssessments(activeTab, currentPage, search, difficulty, sort);

  const handleAction = (item: PortalAssessment) => {
    if (item.status === 'completed' && item.session_id) {
      navigate(`/reports/${item.session_id}`);
      return;
    }
    if ((item.status === 'active' || item.status === 'draft') && item.practice_id) {
      navigate(`/test/${item.practice_id}`);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-bold tracking-tighter text-gray-900 leading-none mb-3">My Assessments</h2>
          <p className="text-gray-500 font-medium">Assigned tests, drafts, and completed reports.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            allowClear
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder="Search assessments"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            className="h-11 min-w-70 rounded-xl!"
          />
          <Select
            value={difficulty}
            onChange={(value) => {
              setDifficulty(value);
              setCurrentPage(1);
            }}
            className="h-11 min-w-40"
            options={[
              { value: 'all', label: 'All difficulty' },
              { value: 'easy', label: 'Easy' },
              { value: 'med', label: 'Medium' },
              { value: 'hard', label: 'Hard' },
            ]}
          />
          <Select
            value={sort}
            onChange={setSort}
            className="h-11 min-w-40"
            options={[
              { value: 'newest', label: 'Newest' },
              { value: 'oldest', label: 'Oldest' },
              { value: 'deadline', label: 'Deadline' },
              { value: 'score', label: 'Score' },
            ]}
          />
        </div>
      </div>

      <nav className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {tabs.map((tab) => {
          const count = data?.counts?.[tab.key] ?? 0;

          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setCurrentPage(1);
              }}
              className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all capitalize cursor-pointer ${
                activeTab === tab.key ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'
              }`}
            >
              {tab.label}
              {count > 0 && <span className="ml-2 text-[10px] text-gray-400">{count}</span>}
            </button>
          );
        })}
      </nav>

      <div className={`grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 min-h-87.5 transition-opacity duration-200 ${isPlaceholderData ? 'opacity-50' : 'opacity-100'}`}>
        {isLoading ? (
          Array.from({ length: PAGE_SIZE }).map((_, index) => (
            <div key={index} className="bg-white rounded-3xl border border-gray-100 p-6 h-82 animate-pulse">
              <div className="h-4 w-24 bg-gray-100 rounded mb-8" />
              <div className="h-6 w-3/4 bg-gray-100 rounded mb-4" />
              <div className="h-4 w-full bg-gray-100 rounded mb-2" />
              <div className="h-4 w-2/3 bg-gray-100 rounded" />
            </div>
          ))
        ) : isError ? (
          <div className="col-span-full bg-white rounded-3xl border border-rose-100 text-center text-rose-500 py-20">
            Failed to load assessments.
          </div>
        ) : data?.items.length ? (
          data.items.map((item) => (
            <AssessmentCard
              key={item.assignment_id}
              item={item}
              onAction={handleAction}
            />
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl bg-white">
            No assessments found in this view.
          </div>
        )}
      </div>

      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-8 mt-12">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Showing <span className="text-black">{((currentPage - 1) * PAGE_SIZE) + 1}</span> to <span className="text-black">{Math.min(currentPage * PAGE_SIZE, data.total)}</span> of {data.total}
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
              className="px-4 py-2 text-xs font-bold border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-all cursor-pointer"
            >
              Previous
            </button>
            <button
              disabled={currentPage >= data.total_pages || isPlaceholderData}
              onClick={() => setCurrentPage((page) => page + 1)}
              className="px-4 py-2 text-xs font-bold border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-all cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentsPage;
