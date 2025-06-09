import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useFirestoreContext } from '../contexts/FirestoreContext';
import { InboxItem, InboxItemType, InboxItemPriority, InboxItemStatus, ConversionTarget } from '../types/index';
import { getPrefixedCollection } from '../utils/environment';

export const useInbox = () => {
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { getCollection } = useFirestoreContext();

  useEffect(() => {
    if (!currentUser) {
      console.log('No current user, clearing inbox items');
      setInboxItems([]);
      setLoading(false);
      return;
    }

    console.log('Setting up inbox listener for user:', currentUser.uid);
    console.log('User email:', currentUser.email);
    
    // Try using the same method that works for goals
    const fetchInboxItems = async () => {
      try {
        console.log('Fetching inbox items using FirestoreContext...');
        const items = await getCollection<InboxItem>('inbox', [
          where('ownerId', '==', currentUser.uid)
        ]);
        console.log('Inbox items fetched successfully:', items.length);
        setInboxItems(items);
        setError(null);
      } catch (fetchError) {
        console.error('Error fetching inbox items with FirestoreContext:', fetchError);
        setError(`Failed to load inbox items: ${fetchError.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInboxItems();
      
  }, [currentUser]);

  const addInboxItem = async (data: {
    title: string;
    content?: string;
    type?: InboxItemType;
    priority?: InboxItemPriority;
    tags?: string[];
  }) => {
    if (!currentUser) throw new Error('User not authenticated');

    try {
      const newItem = {
        ...data,
        ownerId: currentUser.uid,
        type: data.type || InboxItemType.GENERAL,
        priority: data.priority || InboxItemPriority.MEDIUM,
        status: InboxItemStatus.CAPTURED,
        tags: data.tags || [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        processedAt: null,
        convertedTo: null,
        convertedToId: null
      };

      const inboxRef = collection(db, getPrefixedCollection('inbox'));
      await addDoc(inboxRef, newItem);
    } catch (err) {
      console.error('Error adding inbox item:', err);
      throw new Error('Failed to add inbox item');
    }
  };

  const updateInboxItem = async (id: string, updates: Partial<InboxItem>) => {
    if (!currentUser) throw new Error('User not authenticated');

    try {
      const itemRef = doc(db, getPrefixedCollection('inbox'), id);
      await updateDoc(itemRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error('Error updating inbox item:', err);
      throw new Error('Failed to update inbox item');
    }
  };

  const deleteInboxItem = async (id: string) => {
    if (!currentUser) throw new Error('User not authenticated');

    try {
      const itemRef = doc(db, getPrefixedCollection('inbox'), id);
      await deleteDoc(itemRef);
    } catch (err) {
      console.error('Error deleting inbox item:', err);
      throw new Error('Failed to delete inbox item');
    }
  };

  const processInboxItem = async (id: string, target: ConversionTarget) => {
    if (!currentUser) throw new Error('User not authenticated');

    try {
      const itemRef = doc(db, getPrefixedCollection('inbox'), id);
      await updateDoc(itemRef, {
        status: InboxItemStatus.PROCESSED,
        processedAt: Timestamp.now(),
        convertedTo: target.type,
        convertedToId: target.id,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error('Error processing inbox item:', err);
      throw new Error('Failed to process inbox item');
    }
  };

  const archiveInboxItem = async (id: string) => {
    await updateInboxItem(id, { status: InboxItemStatus.ARCHIVED });
  };

  const captureQuickIdea = async (title: string, content?: string) => {
    return addInboxItem({
      title,
      content,
      type: InboxItemType.GENERAL,
      priority: InboxItemPriority.MEDIUM
    });
  };

  // Filter helpers
  const getCapturedItems = () => inboxItems.filter(item => item.status === InboxItemStatus.CAPTURED);
  const getProcessedItems = () => inboxItems.filter(item => item.status === InboxItemStatus.PROCESSED);
  const getArchivedItems = () => inboxItems.filter(item => item.status === InboxItemStatus.ARCHIVED);
  const getItemsByPriority = (priority: InboxItemPriority) => inboxItems.filter(item => item.priority === priority);
  const getItemsByType = (type: InboxItemType) => inboxItems.filter(item => item.type === type);

  return {
    inboxItems,
    loading,
    error,
    addInboxItem,
    updateInboxItem,
    deleteInboxItem,
    processInboxItem,
    archiveInboxItem,
    captureQuickIdea,
    getCapturedItems,
    getProcessedItems,
    getArchivedItems,
    getItemsByPriority,
    getItemsByType
  };
};