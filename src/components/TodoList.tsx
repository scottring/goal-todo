import React from 'react';
import TaskItem from './TaskItem';
import { Task, SourceActivity } from '../types';

interface TodoListProps {
  tasks: Task[];
  activities: SourceActivity[];
  onToggleTask: (taskId: string) => void;
}

const TodoList: React.FC<TodoListProps> = ({ tasks, activities, onToggleTask }) => {
  const getActivityForTask = (activityId: string) => {
    return activities.find(activity => activity.id === activityId)!;
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          activity={getActivityForTask(task.activityId)}
          onToggle={onToggleTask}
        />
      ))}
    </div>
  );
};

export default TodoList;