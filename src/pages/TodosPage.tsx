import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAreasContext } from '../contexts/AreasContext';

const TodosPage: React.FC = () => {
  const { loading } = useAreasContext();

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
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your daily tasks and to-dos
          </p>
        </div>
      </div>

      <div className="text-center text-gray-500 py-12">
        Coming soon! Task management features are under development.
      </div>
    </div>
  );
};

export default TodosPage;