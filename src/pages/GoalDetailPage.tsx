import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Edit, Trash2, Plus, Users, CheckCircle } from 'lucide-react';
import { useGoalsContext } from '../contexts/GoalsContext';
import { useSharedGoalsContext } from '../contexts/SharedGoalsContext';
import { useAreasContext } from '../contexts/AreasContext';
import { SharedReviewsProvider } from '../contexts/SharedReviewsContext';
import { Timestamp } from 'firebase/firestore';

const GoalDetailPage: React.FC = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { goals, loading: goalsLoading, deleteGoal } = useGoalsContext();
  const { sharedGoals, userGoals, loading: sharedLoading } = useSharedGoalsContext();
  const { areas } = useAreasContext();

  const goal = goals.find(g => g.id === goalId);
  const sharedGoal = sharedGoals.find(sg => sg.id === goalId);
  const userGoal = userGoals.find(ug => ug.parentGoalId === goalId);

  const isSharedGoal = !!sharedGoal;
  const displayGoal = isSharedGoal ? userGoal : goal;
  const area = areas.find(a => a.id === displayGoal?.areaId);

  const handleDelete = async () => {
    if (!goalId) return;
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        await deleteGoal(goalId);
        navigate('/goals');
      } catch (err) {
        console.error('Error deleting goal:', err);
      }
    }
  };

  if (goalsLoading || sharedLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!displayGoal) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center text-gray-500 py-12">
          Goal not found
        </div>
      </div>
    );
  }

  return (
    <SharedReviewsProvider goalId={goalId}>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/goals')}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{displayGoal.name}</h1>
            {area && (
              <p className="mt-1 text-gray-600">
                Area: {area.name}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/goals/${goalId}/edit`)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Edit goal"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              className="text-red-400 hover:text-red-600 transition-colors"
              aria-label="Delete goal"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Goal details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Goal Details</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Specific Action</h3>
                  <p className="mt-1 text-gray-600">{displayGoal.specificAction}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700">Measurable Metric</h3>
                  <p className="mt-1 text-gray-600">
                    {displayGoal.measurableMetric === 'custom' 
                      ? displayGoal.customMetric 
                      : displayGoal.measurableMetric.replace('_', ' ')}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700">Achievability</h3>
                  <p className="mt-1 text-gray-600">{displayGoal.achievabilityCheck}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700">Relevance</h3>
                  <p className="mt-1 text-gray-600">{displayGoal.relevance}</p>
                </div>

                {displayGoal.deadline && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Deadline: {displayGoal.deadline instanceof Timestamp 
                        ? displayGoal.deadline.toDate().toLocaleDateString()
                        : new Date(displayGoal.deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Milestones */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Milestones</h2>
                <button
                  onClick={() => {/* Add milestone handler */}}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Milestone
                </button>
              </div>

              <div className="space-y-4">
                {displayGoal.milestones.map((milestone, index) => (
                  <div 
                    key={index}
                    className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-800">{milestone.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {milestone.successCriteria}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        milestone.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : milestone.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {milestone.status.replace('_', ' ')}
                      </span>
                    </div>
                    {milestone.targetDate && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                        <Calendar className="w-4 h-4" />
                        {milestone.targetDate instanceof Timestamp 
                          ? milestone.targetDate.toDate().toLocaleDateString()
                          : new Date(milestone.targetDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column - Tasks and Routines */}
          <div className="space-y-6">
            {/* Tasks */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Tasks</h2>
                <button
                  onClick={() => {/* Add task handler */}}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Task
                </button>
              </div>

              <div className="space-y-3">
                {displayGoal.tasks.map((task, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle 
                        className={`w-5 h-5 ${
                          task.completed ? 'text-green-500' : 'text-gray-300'
                        }`} 
                      />
                      <div>
                        <p className="text-gray-800">{task.title}</p>
                        {task.dueDate && (
                          <p className="text-sm text-gray-500">
                            Due: {task.dueDate instanceof Timestamp 
                              ? task.dueDate.toDate().toLocaleDateString()
                              : new Date(task.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      task.priority === 'high' 
                        ? 'bg-red-100 text-red-800'
                        : task.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Routines */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Routines</h2>
                <button
                  onClick={() => {/* Add routine handler */}}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Routine
                </button>
              </div>

              <div className="space-y-3">
                {displayGoal.routines.map((routine, index) => (
                  <div 
                    key={index}
                    className="p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-800">{routine.title}</h3>
                        {routine.description && (
                          <p className="text-sm text-gray-600 mt-1">{routine.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <p>
                        {routine.targetCount} times per {routine.frequency}
                      </p>
                      {routine.endDate && (
                        <p className="mt-1">
                          Until: {routine.endDate instanceof Timestamp 
                            ? routine.endDate.toDate().toLocaleDateString()
                            : new Date(routine.endDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shared With (if applicable) */}
            {isSharedGoal && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-gray-600" />
                  <h2 className="text-xl font-semibold text-gray-800">Shared With</h2>
                </div>
                <div className="space-y-2">
                  {sharedGoal.sharedWith.map((userId, index) => (
                    <div key={index} className="flex items-center gap-2 text-gray-600">
                      {/* Here you would typically show user info like name/email */}
                      <span>{userId}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SharedReviewsProvider>
  );
};

export default GoalDetailPage; 