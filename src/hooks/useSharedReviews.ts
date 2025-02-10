import { useState, useEffect } from 'react';
import { where, Timestamp } from 'firebase/firestore';
import { useFirestore } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';
import type { SharedWeeklyReview } from '../types';

interface CreateSharedReviewData {
  goalId: string;
  date: Date;
  participants: string[];
}

export const useSharedReviews = (goalId?: string) => {
  const [reviews, setReviews] = useState<SharedWeeklyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const { getCollection, addDocument, updateDocument, deleteDocument } = useFirestore();

  const fetchReviews = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const constraints = [
        where('participants', 'array-contains', user.uid)
      ];
      
      if (goalId) {
        constraints.push(where('goalId', '==', goalId));
      }

      const fetchedReviews = await getCollection<SharedWeeklyReview>('shared_reviews', constraints);
      setReviews(fetchedReviews);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching shared reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchReviews();
    }
  }, [user, goalId]);

  const createReview = async (data: CreateSharedReviewData) => {
    if (!user) return;

    try {
      const reviewData: Omit<SharedWeeklyReview, 'id'> = {
        ...data,
        ownerId: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        date: Timestamp.fromDate(data.date),
        status: 'scheduled',
        userReflections: {},
        sharedDiscussion: {
          synergies: '',
          obstacles: '',
          adjustments: '',
          supportNeeded: '',
          celebrations: ''
        },
        actionItems: []
      };

      await addDocument<SharedWeeklyReview>('shared_reviews', reviewData);
      await fetchReviews();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateReview = async (reviewId: string, data: Partial<SharedWeeklyReview>) => {
    try {
      await updateDocument<SharedWeeklyReview>('shared_reviews', reviewId, data);
      await fetchReviews();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      await deleteDocument('shared_reviews', reviewId);
      await fetchReviews();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const addUserReflection = async (
    reviewId: string,
    reflection: SharedWeeklyReview['userReflections'][string]
  ) => {
    if (!user) return;

    try {
      await updateDocument<SharedWeeklyReview>('shared_reviews', reviewId, {
        [`userReflections.${user.uid}`]: reflection,
        updatedAt: Timestamp.now()
      });
      await fetchReviews();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateSharedDiscussion = async (
    reviewId: string,
    discussion: SharedWeeklyReview['sharedDiscussion']
  ) => {
    try {
      await updateDocument<SharedWeeklyReview>('shared_reviews', reviewId, {
        sharedDiscussion: discussion,
        updatedAt: Timestamp.now()
      });
      await fetchReviews();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const addActionItem = async (
    reviewId: string,
    actionItem: Omit<SharedWeeklyReview['actionItems'][0], 'id'>
  ) => {
    try {
      const review = reviews.find(r => r.id === reviewId);
      if (!review) throw new Error('Review not found');

      const newActionItem = {
        ...actionItem,
        id: Math.random().toString(36).substr(2, 9)
      };

      await updateDocument<SharedWeeklyReview>('shared_reviews', reviewId, {
        actionItems: [...review.actionItems, newActionItem],
        updatedAt: Timestamp.now()
      });
      await fetchReviews();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateActionItem = async (
    reviewId: string,
    actionItemId: string,
    updates: Partial<SharedWeeklyReview['actionItems'][0]>
  ) => {
    try {
      const review = reviews.find(r => r.id === reviewId);
      if (!review) throw new Error('Review not found');

      const updatedActionItems = review.actionItems.map(item =>
        item.id === actionItemId ? { ...item, ...updates } : item
      );

      await updateDocument<SharedWeeklyReview>('shared_reviews', reviewId, {
        actionItems: updatedActionItems,
        updatedAt: Timestamp.now()
      });
      await fetchReviews();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    reviews,
    loading,
    error,
    createReview,
    updateReview,
    deleteReview,
    addUserReflection,
    updateSharedDiscussion,
    addActionItem,
    updateActionItem,
    refreshReviews: fetchReviews
  };
}; 