import React, { useState } from 'react';
import {
  BookOutlined,
  MailOutlined,
  QuestionCircleFilled,
  SafetyCertificateFilled,
  SecurityScanOutlined,
} from '@ant-design/icons';
import { Collapse } from 'antd';

const HelpPage: React.FC = () => {
  const [activeKey, setActiveKey] = useState<string | string[]>(['1']);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Support</p>
        <h2 className="text-4xl font-bold tracking-tighter text-gray-900 leading-none mb-3">Help &amp; FAQ</h2>
        <p className="text-gray-500 font-medium max-w-180">
          Quick answers to the things students ask most. For anything else,
          email the team and someone will get back to you.
        </p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-gray-100 p-6">
          <SecurityScanOutlined className="text-2xl text-emerald-500 mb-3" />
          <h3 className="text-base font-black text-gray-900 mb-1">Integrity policy</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Read what the proctoring layer monitors before you start a test.
          </p>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 p-6">
          <BookOutlined className="text-2xl text-blue-500 mb-3" />
          <h3 className="text-base font-black text-gray-900 mb-1">Test fundamentals</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            How adaptive difficulty, per-attempt shuffling, and the server
            timer work.
          </p>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 p-6">
          <SafetyCertificateFilled className="text-2xl text-amber-500 mb-3" />
          <h3 className="text-base font-black text-gray-900 mb-1">Certificates</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Where graded certificates come from and how to share them.
          </p>
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-gray-100 p-2 shadow-sm">
        <Collapse
          accordion
          ghost
          activeKey={activeKey}
          onChange={(key) => setActiveKey(key)}
          items={[
            {
              key: '1',
              label: <span className="font-black text-gray-900">Why is the test in fullscreen?</span>,
              children: (
                <p className="text-sm text-gray-600 leading-relaxed">
                  Fullscreen makes it harder to accidentally tab-switch into
                  another window and helps you focus. Exiting fullscreen is
                  logged as an integrity event but doesn't auto-cancel the
                  test — multiple violations in a single session will.
                </p>
              ),
            },
            {
              key: '2',
              label: <span className="font-black text-gray-900">What counts as an integrity violation?</span>,
              children: (
                <ul className="text-sm text-gray-600 leading-relaxed list-disc pl-6 space-y-1">
                  <li>Switching browser tabs, minimizing, or losing focus.</li>
                  <li>Trying to copy / cut / paste / right-click / drag.</li>
                  <li>Opening developer tools or trying common shortcuts (F12, Ctrl+Shift+I, Ctrl+U, PrintScreen).</li>
                  <li>Going offline mid-session or attaching an external display.</li>
                </ul>
              ),
            },
            {
              key: '3',
              label: <span className="font-black text-gray-900">Does the test adapt to me?</span>,
              children: (
                <p className="text-sm text-gray-600 leading-relaxed">
                  Yes. Each session has its own randomized question order. As
                  you answer, your "ability estimate" moves up on correct
                  answers and down on incorrect ones, and the next question
                  chosen has the difficulty closest to that estimate. That's
                  why copying answers from a friend doesn't work — you won't
                  see the same questions.
                </p>
              ),
            },
            {
              key: '4',
              label: <span className="font-black text-gray-900">Can I retake an assessment?</span>,
              children: (
                <p className="text-sm text-gray-600 leading-relaxed">
                  Retakes are admin-controlled per assessment. Refreshing the
                  page does not give you a fresh question pool — the server
                  remembers your original order. If you need a retake, ask
                  the admin who assigned the test.
                </p>
              ),
            },
            {
              key: '5',
              label: <span className="font-black text-gray-900">What is the timer counting?</span>,
              children: (
                <p className="text-sm text-gray-600 leading-relaxed">
                  The countdown is computed on the server, not your browser.
                  Editing local storage / cookies / system clock does
                  nothing. When the server says time is up, the session is
                  finalized regardless of which question you're on.
                </p>
              ),
            },
            {
              key: '6',
              label: <span className="font-black text-gray-900">Why is my integrity score low?</span>,
              children: (
                <p className="text-sm text-gray-600 leading-relaxed">
                  Your integrity score starts at 100 and goes down with each
                  logged event. High-severity events (devtools, fullscreen
                  exit, long away-from-tab) cost more. A score below ~60
                  triggers an automatic flag for human review — your
                  submission is still scored, but the admin sees the flag.
                </p>
              ),
            },
          ]}
        />
      </section>

      <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="bg-gray-100 rounded-2xl size-12 flex items-center justify-center text-gray-700">
            <QuestionCircleFilled className="text-2xl" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 mb-1">Still stuck?</h3>
            <p className="text-sm text-gray-500">Reach the team if your test broke, the timer froze, or anything looks wrong.</p>
          </div>
        </div>
        <a
          href="mailto:support@talentflow.uz?subject=Talent%20Flow%20support%20request"
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-[13px] bg-black text-white hover:bg-gray-800 cursor-pointer"
        >
          <MailOutlined /> Email support
        </a>
      </section>
    </div>
  );
};

export default HelpPage;
