import React, { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SelectSingleEventHandler } from "react-day-picker";

interface LongTermGoalReviewProps {
  goalId: string;
  goalName: string;
  description?: string;
  lastReviewDate?: Timestamp;
  nextReviewDate?: Timestamp;
  onUpdateReview: (goalId: string, madeProgress: boolean, adjustments?: string, nextReviewDate?: Date) => Promise<void>;
}

const getNextReviewDate = (currentDate: Date = new Date()): Date => {
  const nextDate = new Date(currentDate);
  nextDate.setDate(nextDate.getDate() + 7);
  return nextDate;
};

export const LongTermGoalReview: React.FC<LongTermGoalReviewProps> = ({
  goalId,
  goalName,
  description,
  lastReviewDate,
  nextReviewDate,
  onUpdateReview
}) => {
  const initialReviewDate = nextReviewDate ? new Date(nextReviewDate.seconds * 1000) : getNextReviewDate();
  const [selectedDate, setSelectedDate] = useState<Date>(initialReviewDate);
  const [madeProgress, setMadeProgress] = useState(false);
  const [adjustments, setAdjustments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'Not reviewed yet';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await onUpdateReview(goalId, madeProgress, adjustments, selectedDate);
      setAdjustments('');
      setMadeProgress(false);
    } catch (error) {
      console.error('Error updating review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateSelect: SelectSingleEventHandler = (date) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{goalName}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Last Review: {formatDate(lastReviewDate)}
          </p>
          <p className="text-sm text-muted-foreground">
            Next Review: {formatDate(nextReviewDate)}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="progress"
              checked={madeProgress}
              onCheckedChange={setMadeProgress}
              disabled={isSubmitting}
            />
            <Label htmlFor="progress">Made progress since last review</Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adjustments">Adjustments or Notes</Label>
          <Textarea
            id="adjustments"
            value={adjustments}
            onChange={(e) => setAdjustments(e.target.value)}
            placeholder="Any adjustments needed or notes about progress..."
            disabled={isSubmitting}
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Next Review Date</Label>
          <div className="rounded-md border">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={isSubmitting}
              initialFocus
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={cn(
            "w-full",
            isSubmitting && "opacity-50 cursor-not-allowed"
          )}
        >
          {isSubmitting ? "Updating..." : "Update Review"}
        </Button>
      </CardFooter>
    </Card>
  );
}; 