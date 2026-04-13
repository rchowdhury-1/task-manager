import { Link } from 'react-router-dom';

const features = [
  {
    icon: '⚡',
    title: 'Real-Time Collaboration',
    desc: 'Every card move, update, and comment syncs instantly across all users via WebSockets.',
  },
  {
    icon: '🎯',
    title: 'Drag & Drop Kanban',
    desc: 'Smooth, intuitive drag-and-drop built with @dnd-kit for the best developer experience.',
  },
  {
    icon: '🔐',
    title: 'Secure Authentication',
    desc: 'JWT with refresh tokens, httpOnly cookies, and automatic token rotation.',
  },
  {
    icon: '📊',
    title: 'Priority Management',
    desc: 'Assign priorities, due dates, and team members to keep work organized.',
  },
  {
    icon: '🗂️',
    title: 'Multi-Workspace',
    desc: 'Organize projects into workspaces with role-based access control.',
  },
  {
    icon: '💬',
    title: 'Live Comments',
    desc: 'Discuss cards with real-time comments that appear instantly for all collaborators.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen animated-gradient">
      {/* Navbar */}
      <nav className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-black" style={{ background: 'var(--primary)' }}>T</div>
          <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>TaskFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-sm rounded-lg border transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 text-sm rounded-lg font-medium transition-colors hover:bg-emerald-600"
            style={{ background: 'var(--primary)', color: '#000' }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 border"
          style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: 'var(--primary)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Real-time collaboration — no refresh needed
        </div>

        <h1 className="text-5xl sm:text-7xl font-black mb-6 leading-tight">
          <span style={{ color: 'var(--text)' }}>Manage tasks</span>
          <br />
          <span style={{ background: 'linear-gradient(135deg, #10b981, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            in real time
          </span>
        </h1>

        <p className="text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          A blazing-fast kanban board where every drag, drop, and comment instantly appears
          for every teammate — no page refresh, no delays.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 glow"
            style={{ background: 'var(--primary)', color: '#000' }}
          >
            Start for free →
          </Link>
          <Link
            to="/login"
            className="px-8 py-4 rounded-xl font-medium text-lg border transition-all hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Demo preview */}
      <div className="max-w-5xl mx-auto px-6 mb-24">
        <div
          className="rounded-2xl border overflow-hidden shadow-2xl float"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
            <div className="flex-1 mx-4 rounded-md text-xs text-center py-1" style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>
              taskflow.app/board/my-project
            </div>
          </div>
          <div className="p-6">
            <div className="flex gap-4 overflow-x-auto pb-2">
              {['Backlog', 'In Progress', 'Review', 'Done'].map((col, ci) => (
                <div key={col} className="flex-shrink-0 w-56">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{col}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                    >
                      {[3,2,1,2][ci]}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: [3,2,1,2][ci] }).map((_, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg border text-xs"
                        style={{
                          background: 'var(--surface-2)',
                          borderColor: 'var(--border)',
                          color: 'var(--text)',
                        }}
                      >
                        <div className="font-medium mb-1">
                          {['Design new dashboard', 'Fix auth bug', 'API integration', 'Write tests', 'Deploy to prod', 'Update docs', 'Code review', 'QA testing'][ci * 2 + i]}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="px-1.5 py-0.5 rounded text-xs"
                            style={{
                              background: ['rgba(239,68,68,0.1)', 'rgba(249,115,22,0.1)', 'rgba(234,179,8,0.1)', 'rgba(16,185,129,0.1)'][i % 4],
                              color: ['#ef4444', '#f97316', '#eab308', '#10b981'][i % 4],
                            }}
                          >
                            {['urgent', 'high', 'medium', 'low'][i % 4]}
                          </span>
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: ['#10b981', '#f97316', '#3b82f6', '#8b5cf6'][i % 4], color: '#fff' }}
                          >
                            {['A', 'B', 'C', 'D'][i % 4]}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-black text-center mb-3" style={{ color: 'var(--text)' }}>Everything you need</h2>
        <p className="text-center mb-12" style={{ color: 'var(--text-muted)' }}>Built for teams who move fast and need to stay in sync</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-xl border hover:border-emerald-500/40 transition-all"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-bold mb-2" style={{ color: 'var(--text)' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="border-t py-20 text-center" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-4xl font-black mb-4" style={{ color: 'var(--text)' }}>Ready to ship faster?</h2>
        <p className="mb-8" style={{ color: 'var(--text-muted)' }}>Join teams using TaskFlow to collaborate in real time.</p>
        <Link
          to="/register"
          className="inline-flex items-center px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 glow"
          style={{ background: 'var(--primary)', color: '#000' }}
        >
          Create free account →
        </Link>
      </div>

      <footer className="border-t py-8 text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>© 2025 TaskFlow. Built with React, Socket.io & PostgreSQL.</p>
      </footer>
    </div>
  );
}
