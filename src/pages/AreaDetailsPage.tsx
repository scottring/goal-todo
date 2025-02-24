import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Plus, Edit, Trash2 } from 'lucide-react';
import { useAreas } from '../hooks/useAreas';
import { useGoalsContext } from '../contexts/GoalsContext';
import { Area, Task } from '../types';
import { timestampToDate } from '../utils/date';
import ErrorBoundary from '../components/ErrorBoundary';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const AreaDetailsPage: React.FC = () => {
  const { areaId } = useParams<{ areaId: string }>();
  const navigate = useNavigate();
  const { getAreaById, loading: areasLoading } = useAreas();
  const { goals, loading: goalsLoading, deleteGoal } = useGoalsContext();
  const [area, setArea] = useState<Area | null>(null);

  useEffect(() => {
    if (areaId) {
      getAreaById(areaId)
        .then(area => {
          if (area) {
            setArea(area);
          } else {
            console.error("Area not found");
            setArea(null);
          }
        })
        .catch(error => console.error("Error fetching area:", error));
    }
  }, [areaId, getAreaById]);

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
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!area) {
    return (
      <div className="container py-6">
        <Alert variant="destructive">
          <AlertDescription>Area not found</AlertDescription>
        </Alert>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => navigate('/areas')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Areas
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/areas')}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to areas</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{area.name}</h1>
            <p className="text-muted-foreground">{area.description}</p>
          </div>
        </div>
        <Button onClick={() => navigate(`/goals/new?areaId=${area.id}`)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Goal
        </Button>
      </div>

      <Separator className="my-6" />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {areaGoals.map(goal => (
          <Card key={goal.id} className="relative overflow-hidden">
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{ backgroundColor: area.color }}
            />
            <CardHeader>
              <CardTitle>{goal.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {goal.specificAction || 'No description'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {goal.timeTracking.type === 'fixed_deadline' ? 'Fixed Deadline' : 'Recurring Review'}
                  </Badge>
                  {goal.timeTracking.deadline && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {timestampToDate(goal.timeTracking.deadline).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate(`/goals/${goal.id}/edit`)}
                  >
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit goal</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(goal.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete goal</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/goals/${goal.id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {areaGoals.length === 0 && (
        <div className="mt-6 text-center">
          <p className="text-muted-foreground">No goals in this area yet</p>
          <Button
            className="mt-4"
            onClick={() => navigate(`/goals/new?areaId=${area.id}`)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Goal
          </Button>
        </div>
      )}
    </div>
  );
};

export default AreaDetailsPage;
