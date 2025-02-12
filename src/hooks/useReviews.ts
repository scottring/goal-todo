import { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useFirestore } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';
import type { 
  UserGoal, 
  Milestone, 
  Routine, 
  ReviewStatus,
  ReviewFrequency,
  MilestoneReview,
  HabitReview
} from '../types';

interface ReviewItem {
  type: 'goal' | 'milestone' | 'habit';
  id: string;
  name: string;
  parentGoalId?: string;
  parentGoalName?: string;
  nextReviewDate: Timestamp;
  lastReviewDate?: Timestamp;
  frequency: ReviewFrequency;
  status?: ReviewStatus;
}

export const useReviews = () => {
  const [upcomingReviews, setUpcomingReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { currentUser } = useAuth();
  const { updateDocument } = useFirestore();

  const calculateNextReviewDate = (
    frequency: ReviewFrequency,
    lastReviewDate: Timestamp = Timestamp.now()
  ): Timestamp => {
    const date = lastReviewDate.toDate();
    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    return Timestamp.fromDate(date);
  };

  const submitReview = async (
    item: ReviewItem,
    reviewData: {
      reflection: string;
      progress: number;
      challenges: string;
      nextSteps: string;
    }
  ) => {
    if (!currentUser) return;

    const now = Timestamp.now();
    const nextReviewDate = calculateNextReviewDate(item.frequency, now);
    
    const newReview = {
      date: now,
      ...reviewData
    };

    const reviewStatus: ReviewStatus = {
      lastReviewDate: now,
      nextReviewDate,
      completedReviews: item.status?.completedReviews 
        ? [...item.status.completedReviews, newReview]
        : [newReview]
    };

    try {
      switch (item.type) {
        case 'goal':
          await updateDocument('user_goals', item.id, {
            'timeTracking.reviewStatus': reviewStatus,
            'timeTracking.nextReviewDate': nextReviewDate
          });
          break;

        case 'milestone':
          if (!item.parentGoalId) throw new Error('Parent goal ID required for milestone review');
          if (!item.id) throw new Error('Milestone ID is required for review');
          await updateDocument('user_goals', item.parentGoalId, {
            [`milestones.${item.id}.review.reviewStatus`]: reviewStatus
          });
          break;

        case 'habit':
          if (!item.parentGoalId) throw new Error('Parent goal ID required for habit review');
          await updateDocument('user_goals', item.parentGoalId, {
            routines: {
              [item.id]: {
                review: {
                  reviewStatus
                }
              }
            }
          });
          break;
      }

      await fetchUpcomingReviews();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const fetchUpcomingReviews = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const reviews: ReviewItem[] = [];
      
      // Get all user goals and their components that need review
      const goals = await useFirestore().getCollection<UserGoal>('user_goals', []);
      
      goals.forEach(goal => {
        // Add goal reviews
        if (goal.timeTracking.type === 'recurring_review' && goal.timeTracking.reviewCycle) {
          reviews.push({
            type: 'goal',
            id: goal.id,
            name: goal.name,
            nextReviewDate: goal.timeTracking.nextReviewDate || Timestamp.now(),
            lastReviewDate: goal.timeTracking.reviewStatus?.lastReviewDate,
            frequency: goal.timeTracking.reviewCycle as ReviewFrequency,
            status: goal.timeTracking.reviewStatus
          });
        }

        // Add milestone reviews
        goal.milestones.forEach(milestone => {
          if (milestone.review?.needsReview && milestone.review.reviewFrequency) {
            reviews.push({
              type: 'milestone',
              id: milestone.id,
              name: milestone.name,
              parentGoalId: goal.id,
              parentGoalName: goal.name,
              nextReviewDate: milestone.review.reviewStatus?.nextReviewDate || Timestamp.now(),
              lastReviewDate: milestone.review.reviewStatus?.lastReviewDate,
              frequency: milestone.review.reviewFrequency,
              status: milestone.review.reviewStatus
            });
          }
        });

        // Add habit/routine reviews
        goal.routines.forEach(routine => {
          if ('id' in routine && routine.review?.reviewStatus) {
            reviews.push({
              type: 'habit',
              id: routine.id,
              name: routine.title,
              parentGoalId: goal.id,
              parentGoalName: goal.name,
              nextReviewDate: routine.review.reviewStatus.nextReviewDate,
              lastReviewDate: routine.review.reviewStatus.lastReviewDate,
              frequency: routine.review.reflectionFrequency,
              status: routine.review.reviewStatus
            });
          }
        });
      });

      // Sort by next review date
      reviews.sort((a, b) => a.nextReviewDate.seconds - b.nextReviewDate.seconds);
      
      setUpcomingReviews(reviews);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchUpcomingReviews();
    }
  }, [currentUser]);

  return {
    upcomingReviews,
    loading,
    error,
    submitReview,
    refreshReviews: fetchUpcomingReviews
  };
};
