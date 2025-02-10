import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Calendar } from 'lucide-react';
import { useAreasContext } from '../contexts/AreasContext';
import { useGoalsContext } from '../contexts/GoalsContext';
import { Timestamp } from 'firebase/firestore';
import type { SourceActivity, RoutineWithoutSystemFields } from '../types';

interface HabitFormData {
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  targetCount: number;
  endDate?: string;
}

const EditGoalPage: React.FC = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { areas } = useAreasContext();
  const { goals, loading, updateGoal } = useGoalsContext();

  const goal = goals.find(g => g.id === goalId);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    areaId: '',
    deadline: '',
    milestones: [''],
    habits: [] as HabitFormData[],
    sharedWith: [] as string[]
  });

  useEffect(() => {
    if (goal) {
      let deadlineStr = '';
      if (goal.deadline) {
        deadlineStr = new Date(goal.deadline.seconds * 1000).toISOString().split('T')[0];
      }

      // Extract SMART components from description
      const [specific, measurable, achievable, relevant] = goal.description?.split('\n') || [];

      setFormData({
        name: goal.name,
        description: [
          `Specific: ${specific?.replace('Specific: ', '') || ''}`,
          `Measurable: ${measurable?.replace('Measurable: ', '') || ''}`,
          `Achievable: ${achievable?.replace('Achievable: ', '') || ''}`,
          `Relevant: ${relevant?.replace('Relevant: ', '') || ''}`
        ].join('\n'),
        areaId: goal.areaId,
        deadline: deadlineStr,
        milestones: goal.milestones?.length ? goal.milestones : [''],
        habits: goal.routines?.map(routine => ({
          title: routine.title,
          description: routine.description,
          frequency: routine.frequency,
          targetCount: routine.targetCount,
          endDate: routine.endDate ? new Date(routine.endDate.seconds * 1000).toISOString().split('T')[0] : undefined
        })) || [],
        sharedWith: goal.sharedWith || []
      });
    }
  }, [goal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalId) return;

    try {
      const updatedGoal: Partial<SourceActivity> = {
        name: formData.name,
        description: formData.description,
        deadline: formData.deadline ? Timestamp.fromDate(new Date(formData.deadline)) : undefined,
        areaId: formData.areaId,
        milestones: formData.milestones.filter(m => m.trim() !== ''),
        routines: formData.habits.map(habit => ({
          title: habit.title,
          description: habit.description,
          frequency: habit.frequency,
          targetCount: habit.targetCount,
          endDate: habit.endDate ? Timestamp.fromDate(new Date(habit.endDate)) : undefined,
          completionDates: [],
          areaId: formData.areaId,
          assignedTo: undefined
        } satisfies RoutineWithoutSystemFields)),
        sharedWith: formData.sharedWith
      };

      await updateGoal(goalId, updatedGoal);
      navigate(-1);
    } catch (err) {
      console.error('Error updating goal:', err);
    }
  };

  if (loading || !goal) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Goal</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-6 bg-white p-6 rounded-lg shadow">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area
            </label>
            <select
              value={formData.areaId}
              onChange={e => setFormData(prev => ({ ...prev, areaId: e.target.value }))}
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="">Select an area</option>
              {areas.map(area => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goal Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (SMART Format)
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-2 border rounded-md"
              rows={6}
              required
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Milestones
            </label>
            <div className="space-y-2">
              {formData.milestones.map((milestone, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={milestone}
                    onChange={e => {
                      const newMilestones = [...formData.milestones];
                      newMilestones[index] = e.target.value;
                      setFormData(prev => ({ ...prev, milestones: newMilestones }));
                    }}
                    className="flex-1 p-2 border rounded-md"
                    placeholder={`Milestone ${index + 1}`}
                  />
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newMilestones = formData.milestones.filter((_, i) => i !== index);
                        setFormData(prev => ({ ...prev, milestones: newMilestones }));
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  milestones: [...prev.milestones, '']
                }))}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add Milestone
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Habits & Routines
            </label>
            <div className="space-y-4">
              {formData.habits.map((habit, index) => (
                <div key={index} className="border rounded-md p-4 space-y-4">
                  <div className="flex justify-between">
                    <h4 className="font-medium">Habit/Routine {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const newHabits = formData.habits.filter((_, i) => i !== index);
                        setFormData(prev => ({ ...prev, habits: newHabits }));
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={habit.title}
                        onChange={e => {
                          const newHabits = [...formData.habits];
                          newHabits[index] = { ...habit, title: e.target.value };
                          setFormData(prev => ({ ...prev, habits: newHabits }));
                        }}
                        className="w-full p-2 border rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={habit.description || ''}
                        onChange={e => {
                          const newHabits = [...formData.habits];
                          newHabits[index] = { ...habit, description: e.target.value };
                          setFormData(prev => ({ ...prev, habits: newHabits }));
                        }}
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Frequency
                      </label>
                      <select
                        value={habit.frequency}
                        onChange={e => {
                          const newHabits = [...formData.habits];
                          newHabits[index] = { ...habit, frequency: e.target.value as HabitFormData['frequency'] };
                          setFormData(prev => ({ ...prev, habits: newHabits }));
                        }}
                        className="w-full p-2 border rounded-md"
                        required
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target Count (times per {habit.frequency})
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={habit.targetCount}
                        onChange={e => {
                          const newHabits = [...formData.habits];
                          newHabits[index] = { ...habit, targetCount: parseInt(e.target.value) };
                          setFormData(prev => ({ ...prev, habits: newHabits }));
                        }}
                        className="w-full p-2 border rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date (optional)
                      </label>
                      <input
                        type="date"
                        value={habit.endDate || ''}
                        onChange={e => {
                          const newHabits = [...formData.habits];
                          newHabits[index] = { ...habit, endDate: e.target.value };
                          setFormData(prev => ({ ...prev, habits: newHabits }));
                        }}
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  habits: [...prev.habits, {
                    title: '',
                    description: '',
                    frequency: 'daily',
                    targetCount: 1
                  }]
                }))}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add Habit/Routine
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-gray-600 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditGoalPage; 