import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useTaskStore } from '../../store/taskStore';
import { useSocketStore } from '../../store/socketStore';
import { Task } from '../../types';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { UserCursors } from '../Collaboration/UserCursor';
import { useBoard } from '../../hooks/useBoard';

interface BoardViewProps {
  boardId: string;
}

export function BoardView({ boardId }: BoardViewProps) {
  const { currentBoard, createTask, moveTask, fetchBoard, isLoadingBoard } = useTaskStore();
  const socket = useSocketStore((s) => s.socket);
  const { emitCursorMove } = useBoard(boardId);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    fetchBoard(boardId);
  }, [boardId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedTask(null);
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !selectedTask) {
        const firstCol = currentBoard?.columns?.[0];
        if (firstCol) {
          // trigger add form in first column - handled by Column component
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [currentBoard, selectedTask]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      emitCursorMove(e.clientX, e.clientY);
    },
    [emitCursorMove]
  );

  const handleAddTask = async (columnId: string, title: string) => {
    const task = await createTask({ columnId, boardId, title });
    if (task && socket) {
      socket.emit('task-create', { boardId, columnId, title });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = currentBoard?.tasks?.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !currentBoard) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    const task = currentBoard.tasks?.find((t) => t.id === taskId);
    if (!task) return;

    // Dropped over a column
    const targetColumn = currentBoard.columns?.find((c) => c.id === overId);
    if (targetColumn) {
      const columnTasks = (currentBoard.tasks || [])
        .filter((t) => t.column_id === targetColumn.id)
        .sort((a, b) => a.position - b.position);
      const newPosition = columnTasks.length;

      if (task.column_id !== targetColumn.id || task.position !== newPosition) {
        moveTask(taskId, targetColumn.id, newPosition);
        socket?.emit('task-move', { taskId, toColumnId: targetColumn.id, newPosition });
      }
      return;
    }

    // Dropped over another task
    const overTask = currentBoard.tasks?.find((t) => t.id === overId);
    if (!overTask) return;

    const toColumnId = overTask.column_id;
    const columnTasks = (currentBoard.tasks || [])
      .filter((t) => t.column_id === toColumnId)
      .sort((a, b) => a.position - b.position);

    const oldIndex = columnTasks.findIndex((t) => t.id === taskId);
    const newIndex = columnTasks.findIndex((t) => t.id === overId);

    if (oldIndex !== -1 && oldIndex !== newIndex) {
      const newPosition = newIndex;
      moveTask(taskId, toColumnId, newPosition);
      socket?.emit('task-move', { taskId, toColumnId, newPosition });
    } else if (task.column_id !== toColumnId) {
      const newPosition = newIndex >= 0 ? newIndex : columnTasks.length;
      moveTask(taskId, toColumnId, newPosition);
      socket?.emit('task-move', { taskId, toColumnId, newPosition });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handled by DragEnd for simplicity
  };

  if (isLoadingBoard) {
    return (
      <div className="h-full flex items-start gap-5 p-6 overflow-x-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-shrink-0 w-72 bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4 space-y-3">
            <div className="h-5 bg-slate-700 rounded animate-skeleton w-24" />
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-20 bg-slate-700/50 rounded-xl animate-skeleton" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!currentBoard) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-slate-400 font-medium">Board not found</p>
          <p className="text-slate-600 text-sm mt-1">Select or create a board from the sidebar</p>
        </div>
      </div>
    );
  }

  const sortedColumns = [...(currentBoard.columns || [])].sort((a, b) => a.position - b.position);

  return (
    <div
      className="h-full overflow-x-auto"
      onMouseMove={handleMouseMove}
    >
      <UserCursors />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="flex gap-5 p-6 h-full items-start">
          {sortedColumns.map((column) => {
            const columnTasks = (currentBoard.tasks || []).filter(
              (t) => t.column_id === column.id
            );
            return (
              <Column
                key={column.id}
                column={column}
                tasks={columnTasks}
                onTaskClick={(task) => setSelectedTask(task)}
                onAddTask={handleAddTask}
                activeTaskId={activeTask?.id}
              />
            );
          })}

          {/* Empty state */}
          {sortedColumns.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-slate-400">No columns yet</p>
              </div>
            </div>
          )}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="rotate-2 scale-105">
              <TaskCard task={activeTask} onClick={() => {}} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Task Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          members={currentBoard.members || []}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
