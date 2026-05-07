import PersonalOSLayout from '../../components/PersonalOS/PersonalOSLayout';
import WeekView from '../../components/PersonalOS/WeekView';
import TaskDetailPanel from '../../components/PersonalOS/TaskDetailPanel';

export default function PersonalOSPage() {
  return (
    <PersonalOSLayout>
      <WeekView />
      <TaskDetailPanel />
    </PersonalOSLayout>
  );
}
