import React, { useState } from 'react';
import { useReviews } from '../../hooks/useReviews';
import { Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface ReviewFormData {
  reflection: string;
  progress: number;
  challenges: string;
  nextSteps: string;
}

const initialReviewFormData: ReviewFormData = {
  reflection: '',
  progress: 0,
  challenges: '',
  nextSteps: ''
};

export default function WeeklyPlanning() {
  const { upcomingReviews, loading, error, submitReview } = useReviews();
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewFormData>(initialReviewFormData);

  const handleSubmitReview = async (reviewId: string) => {
    const review = upcomingReviews.find(r => r.id === reviewId);
    if (!review) return;

    try {
      await submitReview(review, reviewForm);
      setSelectedReviewId(null);
      setReviewForm(initialReviewFormData);
    } catch (err) {
      console.error('Error submitting review:', err);
    }
  };

  const renderReviewForm = () => {
    const review = upcomingReviews.find(r => r.id === selectedReviewId);
    if (!review) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Review: {review.name}
            </h3>
            {review.parentGoalName && (
              <p className="text-sm text-gray-600">
                Part of goal: {review.parentGoalName}
              </p>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reflection
              </label>
              <textarea
                value={reviewForm.reflection}
                onChange={e => setReviewForm(prev => ({ ...prev, reflection: e.target.value }))}
                className="w-full p-2 border rounded-md"
                rows={3}
                placeholder="What worked well? What didn't?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Progress (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={reviewForm.progress}
                onChange={e => setReviewForm(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Challenges
              </label>
              <textarea
                value={reviewForm.challenges}
                onChange={e => setReviewForm(prev => ({ ...prev, challenges: e.target.value }))}
                className="w-full p-2 border rounded-md"
                rows={3}
                placeholder="What obstacles did you face?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Next Steps
              </label>
              <textarea
                value={reviewForm.nextSteps}
                onChange={e => setReviewForm(prev => ({ ...prev, nextSteps: e.target.value }))}
                className="w-full p-2 border rounded-md"
                rows={3}
                placeholder="What actions will you take next?"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => {
                setSelectedReviewId(null);
                setReviewForm(initialReviewFormData);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmitReview(review.id)}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={!reviewForm.reflection.trim() || reviewForm.progress < 0}
            >
              Submit Review
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading reviews: {error.message}
            </h3>
          </div>
        </div>
      </div>
    );
  }

  const now = Timestamp.now();
  const dueReviews = upcomingReviews.filter(r => r.nextReviewDate.seconds <= now.seconds);
  const upcomingReviewsList = upcomingReviews.filter(r => r.nextReviewDate.seconds > now.seconds);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Due Reviews */}
      {dueReviews.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Reviews Due
          </h2>
          <div className="space-y-4">
            {dueReviews.map(review => (
              <div
                key={review.id}
                className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border-l-4 border-yellow-500"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{review.name}</h3>
                    {review.parentGoalName && (
                      <p className="text-sm text-gray-600">
                        Part of goal: {review.parentGoalName}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>Review frequency: {review.frequency}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedReviewId(review.id)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Start Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Reviews */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Upcoming Reviews
        </h2>
        <div className="space-y-4">
          {upcomingReviewsList.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No upcoming reviews scheduled
            </p>
          ) : (
            upcomingReviewsList.map(review => (
              <div
                key={review.id}
                className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{review.name}</h3>
                    {review.parentGoalName && (
                      <p className="text-sm text-gray-600">
                        Part of goal: {review.parentGoalName}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Next review: {review.nextReviewDate.toDate().toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Frequency: {review.frequency}</span>
                      </div>
                    </div>
                  </div>
                  {review.status?.lastReviewDate && (
                    <div className="flex items-center text-sm text-green-600">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Last reviewed: {review.status.lastReviewDate.toDate().toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedReviewId && renderReviewForm()}
    </div>
  );
} 