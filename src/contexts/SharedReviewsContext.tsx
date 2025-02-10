import { createContext, useContext, ReactNode } from 'react';
import { useSharedReviews } from '../hooks/useSharedReviews';
import type { SharedWeeklyReview } from '../types';

interface SharedReviewsContextType {
  reviews: SharedWeeklyReview[];
  loading: boolean;
  error: Error | null;
  createReview: (data: {
    goalId: string;
    date: Date;
    participants: string[];
  }) => Promise<void>;
  updateReview: (reviewId: string, data: Partial<SharedWeeklyReview>) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  addUserReflection: (
    reviewId: string,
    reflection: SharedWeeklyReview['userReflections'][string]
  ) => Promise<void>;
  updateSharedDiscussion: (
    reviewId: string,
    discussion: SharedWeeklyReview['sharedDiscussion']
  ) => Promise<void>;
  addActionItem: (
    reviewId: string,
    actionItem: Omit<SharedWeeklyReview['actionItems'][0], 'id'>
  ) => Promise<void>;
  updateActionItem: (
    reviewId: string,
    actionItemId: string,
    updates: Partial<SharedWeeklyReview['actionItems'][0]>
  ) => Promise<void>;
  refreshReviews: () => Promise<void>;
}

const SharedReviewsContext = createContext<SharedReviewsContextType | undefined>(undefined);

interface SharedReviewsProviderProps {
  children: ReactNode;
  goalId?: string;
}

export function SharedReviewsProvider({ children, goalId }: SharedReviewsProviderProps) {
  const {
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
    refreshReviews
  } = useSharedReviews(goalId);

  return (
    <SharedReviewsContext.Provider
      value={{
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
        refreshReviews
      }}
    >
      {children}
    </SharedReviewsContext.Provider>
  );
}

export function useSharedReviewsContext() {
  const context = useContext(SharedReviewsContext);
  if (context === undefined) {
    throw new Error('useSharedReviewsContext must be used within a SharedReviewsProvider');
  }
  return context;
} 