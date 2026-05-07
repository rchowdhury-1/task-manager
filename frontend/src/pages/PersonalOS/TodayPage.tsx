import PersonalOSLayout from '../../components/PersonalOS/PersonalOSLayout';
import TodayView from '../../components/PersonalOS/TodayView';
import TaskDetailPanel from '../../components/PersonalOS/TaskDetailPanel';

export default function TodayPage() {
  return (
    <PersonalOSLayout>
      <TodayView />
      <TaskDetailPanel />
    </PersonalOSLayout>
  );
}
