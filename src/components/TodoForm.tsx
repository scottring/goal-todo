import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { SourceActivity } from '../types';

interface TodoFormProps {
  activities: SourceActivity[];
  onSubmit: (data: { title: string; activityId: string }) => void;
}

const TodoForm: React.FC<TodoFormProps> = ({ activities, onSubmit }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      activityId: selectedActivityId
    });
    setTitle('');
    setSelectedActivityId('');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm"
      >
        <Plus className="w-4 h-4" />
        Add Todo
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow-sm mb-4">
      <div className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full p-2 border rounded-md text-sm"
          placeholder="What needs to be done?"
          required
        />
        <select
          value={selectedActivityId}
          onChange={e => setSelectedActivityId(e.target.value)}
          className="w-full p-2 border rounded-md text-sm text-gray-700"
          required
        >
          <option value="">Select a goal</option>
          {activities.map(activity => (
            <option key={activity.id} value={activity.id}>
              {activity.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Add Todo
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-3 py-1 text-gray-600 text-sm hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default TodoForm;