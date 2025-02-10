import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { SourceActivity } from '../types';

interface ActivityFormProps {
  onSubmit: (activity: Omit<SourceActivity, 'id'>) => void;
}

const ActivityForm: React.FC<ActivityFormProps> = ({ onSubmit }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    deadline: '',
    milestones: ['']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      description: formData.description,
      deadline: formData.deadline ? new Date(formData.deadline) : undefined,
      milestones: formData.milestones.filter(m => m.trim() !== '')
    });
    setFormData({ name: '', description: '', deadline: '', milestones: [''] });
    setIsOpen(false);
  };

  const addMilestone = () => {
    setFormData(prev => ({
      ...prev,
      milestones: [...prev.milestones, '']
    }));
  };

  const updateMilestone = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map((m, i) => i === index ? value : m)
    }));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
      >
        <PlusCircle className="w-5 h-5" />
        Add New SMART Goal
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4">New SMART Goal</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Goal Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full p-2 border rounded-md"
            placeholder="e.g., Fitness: Run 5K in 10 weeks"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (SMART details)
          </label>
          <textarea
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full p-2 border rounded-md"
            placeholder="Specific, Measurable, Achievable, Relevant, Time-bound details"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Deadline
          </label>
          <input
            type="date"
            value={formData.deadline}
            onChange={e => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Milestones
          </label>
          {formData.milestones.map((milestone, index) => (
            <input
              key={index}
              type="text"
              value={milestone}
              onChange={e => updateMilestone(index, e.target.value)}
              className="w-full p-2 border rounded-md mb-2"
              placeholder={`Milestone ${index + 1}`}
            />
          ))}
          <button
            type="button"
            onClick={addMilestone}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            + Add Another Milestone
          </button>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create SMART Goal
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-4 py-2 text-gray-600 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ActivityForm;