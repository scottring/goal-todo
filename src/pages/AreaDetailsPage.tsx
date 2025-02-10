import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { useAreasContext } from '../contexts/AreasContext';
import { useGoalsContext } from '../contexts/GoalsContext';

const AreaDetailsPage: React.FC = () => {
  const { areaId } = useParams<{ areaId: string }>();
  const navigate = useNavigate();
  const { areas, loading: areasLoading } = useAreasContext();
  const { goals, loading: goalsLoading, deleteGoal } = useGoalsContext();

  const area = areas.find(a => a.id === areaId);
  const areaGoals = goals.filter(goal => goal.areaId === areaId);

  const handleDelete = async (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        await deleteGoal(goalId);
      } catch (err) {
        console.error('Error deleting goal:', err);
      }
    }
  };

  if (areasLoading || goalsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!area) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center text-gray-500 py-12">
          Area not found
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/areas')}
          className="text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{area.name}</h1>
          {area.description && (
            <p className="mt-1 text-gray-600">{area.description}</p>
          )}
        </div>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Goals in this Area</h2>
          <button
            onClick={() => navigate('/goals', { state: { preselectedAreaId: area.id } })}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Goal
          </button>
        </div>

        {areaGoals.length === 0 ? (
          <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-lg">
            No goals in this area yet
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {areaGoals.map((goal) => (
              <div
                key={goal.id}
                className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                style={{ borderLeft: `4px solid ${area.color || '#000000'}` }}
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
                      onClick={() => navigate('/goals', { state: { editingGoal: goal } })}
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
                    {new Date(goal.deadline).toLocaleDateString()}
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
        )}
      </div>
    </div>
  );
};

export default AreaDetailsPage; 