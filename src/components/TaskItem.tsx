import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { Task, SourceActivity } from '../types';

interface TaskItemProps {
  task: Task;
  activity: SourceActivity;
  onToggle: (taskId: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, activity, onToggle }) => {
  return (
    <div className="flex items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 mb-2">
      <button
        onClick={() => onToggle(task.id)}
        className="focus:outline-none"
        aria-label={`Mark ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`}
      >
        {task.completed ? (
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        ) : (
          <Circle className="w-6 h-6 text-gray-400" />
        )}
      </button>
      
      <div className="ml-3 flex-grow">
        <h3 className={`text-lg ${task.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
          {task.title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{activity.name}</span>
          <span className={`text-xs px-2 py-1 rounded ${
            task.priority === 'high' ? 'bg-red-100 text-red-800' :
            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {task.priority}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;