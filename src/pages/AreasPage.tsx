import React, { useState } from 'react';
import { useAreasContext } from '../contexts/AreasContext';
import { Plus, Loader2, Pencil, X, Trash2 } from 'lucide-react';
import type { Area } from '../types';
import { useNavigate } from 'react-router-dom';

export default function AreasPage() {
  const { areas, loading, error, createArea, updateArea, deleteArea } = useAreasContext();
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#000000'
  });
  const navigate = useNavigate();

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsCreating(true);
      await createArea({
        name: formData.name.trim(),
        description: formData.description,
        color: formData.color,
        sharedWith: []
      });
      setFormData({ name: '', description: '', color: '#000000' });
      setIsCreating(false);
    } catch (err) {
      console.error('Error creating area:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (area: Area) => {
    setFormData({
      name: area.name,
      description: area.description || '',
      color: area.color || '#000000'
    });
    setEditingAreaId(area.id);
    setIsEditing(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAreaId) return;

    try {
      await updateArea(editingAreaId, {
        name: formData.name.trim(),
        description: formData.description,
        color: formData.color
      });
      setFormData({ name: '', description: '', color: '#000000' });
      setIsEditing(false);
      setEditingAreaId(null);
    } catch (err) {
      console.error('Error updating area:', err);
    }
  };

  const handleDelete = async (areaId: string) => {
    if (window.confirm('Are you sure you want to delete this area?')) {
      try {
        await deleteArea(areaId);
      } catch (err) {
        console.error('Error deleting area:', err);
      }
    }
  };

  const renderForm = (onSubmit: (e: React.FormEvent) => void, title: string, submitText: string) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              setIsEditing(false);
              setEditingAreaId(null);
              setFormData({ name: '', description: '', color: '#000000' });
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
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
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-2 border rounded-md"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <input
              type="color"
              value={formData.color}
              onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
              className="w-full p-1 border rounded"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              setIsEditing(false);
              setEditingAreaId(null);
              setFormData({ name: '', description: '', color: '#000000' });
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {submitText}
          </button>
        </div>
      </form>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error loading areas: {error.message}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Areas</h1>
          <p className="mt-1 text-sm text-gray-600">
            Organize your tasks and activities into different areas of focus
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Area
        </button>
      </div>

      {isCreating && renderForm(handleCreateArea, 'Add New Area', 'Create Area')}
      {isEditing && renderForm(handleUpdate, 'Edit Area', 'Update Area')}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {areas.map((area) => (
          <div
            key={area.id}
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
            style={{ borderLeft: `4px solid ${area.color || '#000000'}` }}
            onClick={() => navigate(`/areas/${area.id}`)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">{area.name}</h3>
                {area.description && (
                  <p className="text-gray-600 mt-2">{area.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(area);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Edit area"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(area.id);
                  }}
                  className="text-red-400 hover:text-red-600 transition-colors"
                  aria-label="Delete area"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}