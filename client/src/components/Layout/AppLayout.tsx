import { useState, ReactNode } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { Board } from '../../types';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { ActivityFeed } from '../Collaboration/ActivityFeed';

interface AppLayoutProps {
  children: ReactNode;
  currentBoardId?: string;
}

export function AppLayout({ children, currentBoardId }: AppLayoutProps) {
  const [showActivity, setShowActivity] = useState(false);
  const { setCurrentBoard, boards } = useTaskStore();

  const handleBoardSelect = (board: Board) => {
    setCurrentBoard(board);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar
        onBoardSelect={handleBoardSelect}
        selectedBoardId={currentBoardId}
      />

      <div className="ml-64 flex flex-col min-h-screen">
        <Navbar
          onToggleActivity={() => setShowActivity((v) => !v)}
          showActivity={showActivity}
        />

        <main className="flex-1 mt-14 flex overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {children}
          </div>

          {showActivity && (
            <ActivityFeed
              boardId={currentBoardId}
              onClose={() => setShowActivity(false)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
