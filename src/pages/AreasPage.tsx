import React, { useState } from 'react';
import { useAreasContext } from '../contexts/AreasContext';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Area } from '../types';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";

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
        sharedWith: [],
        permissions: {}
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
    if (!editingAreaId || !formData.name.trim()) return;

    try {
      await updateArea(editingAreaId, {
        name: formData.name.trim(),
        description: formData.description,
        color: formData.color
      });
      setIsEditing(false);
      setEditingAreaId(null);
      setFormData({ name: '', description: '', color: '#000000' });
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

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Areas</h1>
          <p className="text-muted-foreground">
            Organize your goals and tasks into different areas of focus
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Area
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Area</DialogTitle>
              <DialogDescription>
                Add a new area to organize your goals and tasks
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateArea}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter area name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter area description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!formData.name.trim()}>
                  Create Area
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error.toString()}</AlertDescription>
        </Alert>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {areas.map((area) => (
          <Card
            key={area.id}
            className="relative overflow-hidden"
            style={{
              borderColor: area.color,
              borderWidth: '2px'
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{ backgroundColor: area.color }}
            />
            <CardHeader>
              <CardTitle>{area.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {area.description || 'No description'}
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleEdit(area)}
                >
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit area</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDelete(area.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete area</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/areas/${area.id}`)}
                >
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Area</DialogTitle>
            <DialogDescription>
              Update the area's details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter area name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter area description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-color">Color</Label>
                <Input
                  id="edit-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsEditing(false);
                setEditingAreaId(null);
                setFormData({ name: '', description: '', color: '#000000' });
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={!formData.name.trim()}>
                Update Area
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}