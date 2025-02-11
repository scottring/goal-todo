import React, { useState } from 'react';
import { collection, getDocs, deleteDoc, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';

const AdminPage: React.FC = () => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAllCollections = async () => {
    if (!window.confirm('Are you sure you want to delete all collections? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      // Collections to delete
      const collections = ['activities', 'areas', 'shared_goals', 'user_goals', 'tasks', 'routines', 'shared_reviews'];
      
      for (const collectionName of collections) {
        const q = query(collection(db, collectionName), limit(500));
        const querySnapshot = await getDocs(q);
        
        const deletePromises = querySnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        
        await Promise.all(deletePromises);
      }
      
      toast.success('All collections deleted successfully');
    } catch (error) {
      console.error('Error deleting collections:', error);
      toast.error('Failed to delete collections');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllUsers = async () => {
    if (!window.confirm('Are you sure you want to delete all users? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      // Note: This will only delete user documents from Firestore
      // To delete actual Firebase Auth users, you need to use Admin SDK on the backend
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      const deletePromises = querySnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
      await Promise.all(deletePromises);
      
      toast.success('All user documents deleted successfully');
      toast.success('Note: Firebase Auth users can only be deleted through Admin SDK');
    } catch (error) {
      console.error('Error deleting users:', error);
      toast.error('Failed to delete users');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
      
      <div className="space-y-6">
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Danger Zone</h2>
          
          <div className="space-y-4">
            <div className="p-4 border border-red-200 rounded-md">
              <h3 className="text-lg font-medium text-red-800 mb-2">Delete All Collections</h3>
              <p className="text-sm text-gray-600 mb-4">
                This will delete all documents from all collections. This action cannot be undone.
              </p>
              <button
                onClick={handleDeleteAllCollections}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete All Collections'}
              </button>
            </div>

            <div className="p-4 border border-red-200 rounded-md">
              <h3 className="text-lg font-medium text-red-800 mb-2">Delete All Users</h3>
              <p className="text-sm text-gray-600 mb-4">
                This will delete all user documents from Firestore. Note: Firebase Auth users can only be deleted through Admin SDK.
              </p>
              <button
                onClick={handleDeleteAllUsers}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete All Users'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage; 