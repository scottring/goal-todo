import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Trash2, Edit, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAreasContext } from '../contexts/AreasContext';
import { useGoalsContext } from '../contexts/GoalsContext';
import { useLocation } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import type { SourceActivity, RoutineWithoutSystemFields, BaseDocument } from '../types';

interface SmartGoalForm {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timebound: string;
  areaId: string;
  milestones: string[];
  routines?: {
    title: string;
    description?: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    targetCount: number;
    endDate?: string;
  }[];
}

const timestampToDateString = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return '';
  return new Date(timestamp.seconds * 1000).toISOString().split('T')[0];
};

const dateToTimestamp = (dateStr: string): Timestamp => {
  return Timestamp.fromDate(new Date(dateStr));
};

const GoalsPage: React.FC = () => {
  const location = useLocation();
  const { areas } = useAreasContext();
  const { goals, loading, createGoal, updateGoal, deleteGoal } = useGoalsContext();
  const [isAdding, setIsAdding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'wizard' | 'edit'>('wizard');
  const [smartGoal, setSmartGoal] = useState<SmartGoalForm>({
    specific: '',
    measurable: '',
    achievable: '',
    relevant: '',
    timebound: '',
    areaId: '',
    milestones: ['']
  });

  // Handle navigation state
  useEffect(() => {
    const state = location.state as { editingGoal?: SourceActivity; preselectedAreaId?: string } | null;
    
    if (state?.editingGoal) {
      handleEdit(state.editingGoal);
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    } else if (state?.preselectedAreaId && typeof state.preselectedAreaId === 'string') {
      const areaId: string = state.preselectedAreaId;
      setSmartGoal(prev => ({ ...prev, areaId }));
      setIsAdding(true);
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSubmit = async () => {
    if (!smartGoal.areaId) return;

    const description = `
Specific: ${smartGoal.specific}
Measurable: ${smartGoal.measurable}
Achievable: ${smartGoal.achievable}
Relevant: ${smartGoal.relevant}
    `.trim();

    const routines = smartGoal.routines?.map(routine => ({
      title: routine.title,
      description: routine.description || '',
      frequency: routine.frequency,
      targetCount: routine.targetCount,
      endDate: routine.endDate ? dateToTimestamp(routine.endDate) : undefined,
      completionDates: [] as Timestamp[],
      areaId: smartGoal.areaId,
      assignedTo: undefined
    } as RoutineWithoutSystemFields)) || [];

    const goalData = {
      name: smartGoal.specific,
      description,
      deadline: smartGoal.timebound ? dateToTimestamp(smartGoal.timebound) : undefined,
      areaId: smartGoal.areaId,
      milestones: smartGoal.milestones.filter(m => m.trim() !== ''),
      sharedWith: [] as string[],
      tasks: [] as [],
      routines
    } satisfies Omit<SourceActivity, keyof BaseDocument>;

    try {
      if (editingGoal) {
        await updateGoal(editingGoal, goalData);
      } else {
        await createGoal(goalData);
      }

      setSmartGoal({
        specific: '',
        measurable: '',
        achievable: '',
        relevant: '',
        timebound: '',
        areaId: '',
        milestones: [''],
        routines: []
      });
      setIsAdding(false);
      setCurrentStep(0);
      setEditingGoal(null);
      setEditMode('wizard');
    } catch (err) {
      console.error('Error saving goal:', err);
    }
  };

  const handleEdit = (goal: SourceActivity) => {
    const [, measurable, achievable, relevant] = goal.description?.split('\n') || [];
    
    setSmartGoal({
      specific: goal.name,
      measurable: measurable?.replace('Measurable: ', '') || '',
      achievable: achievable?.replace('Achievable: ', '') || '',
      relevant: relevant?.replace('Relevant: ', '') || '',
      timebound: timestampToDateString(goal.deadline),
      areaId: goal.areaId,
      milestones: goal.milestones || [''],
      routines: goal.routines?.map(routine => ({
        title: routine.title,
        description: routine.description || '',
        frequency: routine.frequency,
        targetCount: routine.targetCount,
        endDate: timestampToDateString(routine.endDate)
      })) || []
    });
    
    setEditingGoal(goal.id);
    setEditMode('edit');
    setIsAdding(true);
  };

  const handleDelete = async (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        await deleteGoal(goalId);
      } catch (err) {
        console.error('Error deleting goal:', err);
      }
    }
  };

  const renderAreaStep = () => (
    <div className="space-y-4">
      <select
        value={smartGoal.areaId}
        onChange={e => setSmartGoal(prev => ({ ...prev, areaId: e.target.value }))}
        className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
        required
      >
        <option value="">Select an area</option>
        {areas.map(area => (
          <option key={area.id} value={area.id}>{area.name}</option>
        ))}
      </select>
    </div>
  );

  const renderSpecificStep = () => (
    <div className="space-y-3">
      <textarea
        value={smartGoal.specific}
        onChange={e => setSmartGoal(prev => ({ ...prev, specific: e.target.value }))}
        className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
        placeholder="What exactly do you want to achieve?"
        rows={3}
        required
      />
      <p className="text-sm text-gray-500 italic">Example: I want to run a 5K race</p>
    </div>
  );

  const renderMeasurableStep = () => (
    <div className="space-y-3">
      <textarea
        value={smartGoal.measurable}
        onChange={e => setSmartGoal(prev => ({ ...prev, measurable: e.target.value }))}
        className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
        placeholder="How will you track progress?"
        rows={3}
        required
      />
      <p className="text-sm text-gray-500 italic">Example: Complete 5K in under 30 minutes</p>
    </div>
  );

  const renderAchievableStep = () => (
    <div className="space-y-3">
      <textarea
        value={smartGoal.achievable}
        onChange={e => setSmartGoal(prev => ({ ...prev, achievable: e.target.value }))}
        className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
        placeholder="What resources do you need?"
        rows={3}
        required
      />
      <p className="text-sm text-gray-500 italic">Example: I have running shoes and access to a park</p>
    </div>
  );

  const renderRelevantStep = () => (
    <div className="space-y-3">
      <textarea
        value={smartGoal.relevant}
        onChange={e => setSmartGoal(prev => ({ ...prev, relevant: e.target.value }))}
        className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
        placeholder="Why does this matter to you?"
        rows={3}
        required
      />
      <p className="text-sm text-gray-500 italic">Example: Improve health and energy levels</p>
    </div>
  );

  const renderTimeboundStep = () => (
    <div className="space-y-3">
      <input
        type="date"
        value={smartGoal.timebound}
        onChange={e => setSmartGoal(prev => ({ ...prev, timebound: e.target.value }))}
        className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
        required
      />
      <p className="text-sm text-gray-500 italic">Example: 10 weeks from today</p>
    </div>
  );

  const renderMilestonesStep = () => (
    <div className="space-y-3">
      {smartGoal.milestones.map((milestone, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            value={milestone}
            onChange={e => {
              const newMilestones = [...smartGoal.milestones];
              newMilestones[index] = e.target.value;
              setSmartGoal(prev => ({ ...prev, milestones: newMilestones }));
            }}
            className="flex-1 p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
            placeholder={`Milestone ${index + 1}`}
          />
          {index > 0 && (
            <button
              type="button"
              onClick={() => {
                const newMilestones = smartGoal.milestones.filter((_, i) => i !== index);
                setSmartGoal(prev => ({ ...prev, milestones: newMilestones }));
              }}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => setSmartGoal(prev => ({
          ...prev,
          milestones: [...prev.milestones, '']
        }))}
        className="text-blue-600 hover:text-blue-700 font-medium"
      >
        + Add Milestone
      </button>
    </div>
  );

  const renderRoutinesStep = () => (
    <div className="space-y-3">
      {smartGoal.routines?.map((routine, index) => (
        <div key={index} className="border rounded-md p-4 space-y-4">
          <div className="flex justify-between">
            <h4 className="font-medium">Habit/Routine {index + 1}</h4>
            <button
              type="button"
              onClick={() => {
                const newRoutines = smartGoal.routines?.filter((_, i) => i !== index) || [];
                setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
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
                value={routine.title}
                onChange={e => {
                  const newRoutines = [...(smartGoal.routines || [])];
                  newRoutines[index] = { ...routine, title: e.target.value };
                  setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
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
                value={routine.description || ''}
                onChange={e => {
                  const newRoutines = [...(smartGoal.routines || [])];
                  newRoutines[index] = { ...routine, description: e.target.value };
                  setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
                }}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency
              </label>
              <select
                value={routine.frequency}
                onChange={e => {
                  const newRoutines = [...(smartGoal.routines || [])];
                  newRoutines[index] = { ...routine, frequency: e.target.value as RoutineWithoutSystemFields['frequency'] };
                  setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
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
                Target Count (times per {routine.frequency})
              </label>
              <input
                type="number"
                min="1"
                value={routine.targetCount}
                onChange={e => {
                  const newRoutines = [...(smartGoal.routines || [])];
                  newRoutines[index] = { ...routine, targetCount: parseInt(e.target.value) };
                  setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
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
                value={routine.endDate || ''}
                onChange={e => {
                  const newRoutines = [...(smartGoal.routines || [])];
                  newRoutines[index] = { ...routine, endDate: e.target.value };
                  setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
                }}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setSmartGoal(prev => ({
          ...prev,
          routines: [...(prev.routines || []), {
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
  );

  const renderReviewStep = () => (
    <div className="space-y-6 bg-gray-50 p-6 rounded-lg">
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Specific</h3>
        <p className="text-gray-900">{smartGoal.specific}</p>
      </div>
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Measurable</h3>
        <p className="text-gray-900">{smartGoal.measurable}</p>
      </div>
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Achievable</h3>
        <p className="text-gray-900">{smartGoal.achievable}</p>
      </div>
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Relevant</h3>
        <p className="text-gray-900">{smartGoal.relevant}</p>
      </div>
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Time-bound</h3>
        <p className="text-gray-900">{smartGoal.timebound}</p>
      </div>
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Milestones</h3>
        <ul className="list-disc list-inside text-gray-900 space-y-1">
          {smartGoal.milestones.filter(m => m.trim() !== '').map((milestone, index) => (
            <li key={index}>{milestone}</li>
          ))}
        </ul>
      </div>
    </div>
  );

  const steps = [
    {
      title: "What area is this goal for?",
      subtitle: "Choose the life area this goal belongs to",
      component: renderAreaStep
    },
    {
      title: "What do you want to achieve?",
      subtitle: "Be specific about what you want to accomplish",
      component: renderSpecificStep
    },
    {
      title: "How will you measure success?",
      subtitle: "Define concrete numbers or milestones",
      component: renderMeasurableStep
    },
    {
      title: "Is it achievable?",
      subtitle: "Consider your resources and constraints",
      component: renderAchievableStep
    },
    {
      title: "Why is this important?",
      subtitle: "Connect this goal to your bigger picture",
      component: renderRelevantStep
    },
    {
      title: "When will you achieve this?",
      subtitle: "Set a realistic deadline",
      component: renderTimeboundStep
    },
    {
      title: "Break it down",
      subtitle: "List the key milestones to reach your goal",
      component: renderMilestonesStep
    },
    {
      title: "Add Habits & Routines",
      subtitle: "Create recurring actions to support your goal",
      component: renderRoutinesStep
    },
    {
      title: "Review Your SMART Goal",
      subtitle: "Make sure everything looks right",
      component: renderReviewStep
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Goals</h1>
          <p className="mt-1 text-sm text-gray-600">
            Set and track your SMART goals
          </p>
        </div>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditMode('wizard');
            setCurrentStep(0);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => (
          <div
            key={goal.id}
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
            style={{ 
              borderLeft: `4px solid ${
                areas.find(a => a.id === goal.areaId)?.color || '#000000'
              }` 
            }}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">{goal.name}</h3>
                {goal.description && (
                  <div className="mt-3 space-y-2">
                    {goal.description.split('\n').map((line, index) => (
                      <p key={index} className="text-gray-600 text-sm">
                        {line}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(goal)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Edit goal"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(goal.id)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                  aria-label="Delete goal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {goal.deadline && (
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-3">
                <Calendar className="w-4 h-4" />
                {goal.deadline.toDate().toLocaleDateString()}
              </div>
            )}
            {goal.milestones && goal.milestones.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Milestones:</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {goal.milestones.map((milestone, index) => (
                    <li key={index}>{milestone}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {editMode === 'wizard' ? steps[currentStep].title : 'Edit Goal'}
                </h2>
                {editMode === 'wizard' && steps[currentStep].subtitle && (
                  <p className="text-gray-600 mt-1">{steps[currentStep].subtitle}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setCurrentStep(0);
                  setEditingGoal(null);
                  setEditMode('wizard');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-8">
              {steps[currentStep].component()}
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className={`flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-700 ${
                  currentStep === 0 ? 'invisible' : ''
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
              <div className="flex gap-1">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentStep ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (currentStep === steps.length - 1) {
                    handleSubmit();
                  } else {
                    setCurrentStep(prev => prev + 1);
                  }
                }}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {currentStep === steps.length - 1 ? (
                  'Create Goal'
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GoalsPage;