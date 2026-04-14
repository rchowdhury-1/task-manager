import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column as ColumnType, Task } from '../../types';
import { TaskCard } from './TaskCard';
import { AddTaskForm } from './AddTaskForm';

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: string, title: string) => void;
  activeTaskId?: string | null;
}

export function Column({ column, tasks, onTaskClick, onAddTask, activeTaskId }: ColumnProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const sortedTasks = [...tasks].sort((a, b) => a.position - b.position);

  return (
    <div className="flex-shrink-0 w-72 flex flex-col bg-slate-800/50 rounded-2xl border border-slate-700/50">
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: column.color }}
          />
          <span className="text-slate-200 font-semibold text-sm">{column.name}</span>
          <span className="ml-1 text-[11px] text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded-full font-medium">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="text-slate-500 hover:text-slate-300 hover:bg-slate-700 p-1 rounded-lg transition-colors"
          title="Add task"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Tasks */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-3 space-y-2.5 min-h-24 transition-colors rounded-b-2xl ${
          isOver ? 'bg-indigo-500/5' : ''
        }`}
      >
        <SortableContext items={sortedTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {sortedTasks.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-8 transition-colors ${isOver ? 'opacity-50' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center mb-2">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-600 text-xs">No tasks yet</p>
            </div>
          ) : (
            sortedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                isDragging={activeTaskId === task.id}
              />
            ))
          )}
        </SortableContext>

        {showAddForm && (
          <AddTaskForm
            onAdd={(title) => {
              onAddTask(column.id, title);
              setShowAddForm(false);
            }}
            onCancel={() => setShowAddForm(false)}
          />
        )}
      </div>

      {/* Add task button */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 mx-3 mb-3 px-3 py-2 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-xl text-sm transition-colors border border-transparent hover:border-slate-600/50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add task
        </button>
      )}
    </div>
  );
}
