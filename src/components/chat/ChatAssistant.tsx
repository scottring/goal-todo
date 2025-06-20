import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGoals } from '../../hooks/useGoals';
import { useAreas } from '../../hooks/useAreas';
import { useChat } from '../../contexts/ChatContext';
import ChatInterface from './ChatInterface';
import ChatSettings from './ChatSettings';
import { convertAIResultToEntity } from '../../utils/aiParser';
import { Timestamp } from 'firebase/firestore';
import { SourceActivity, Task } from '../../types';
import { Cog, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ChatAssistant: React.FC = () => {
  const { user } = useAuth();
  const { apiKey, isReady } = useChat();
  const { addGoal } = useGoals();
  const { areas } = useAreas();
  const [showSettings, setShowSettings] = useState(false);

  const handleEntityCreated = async (entityType: string, data: any) => {
    if (!user) {
      toast.error("You need to be logged in to create items");
      return;
    }

    try {
      // Get the default area ID (first area or empty string)
      const defaultAreaId = areas && areas.length > 0 ? areas[0].id : '';
      
      // Convert AI result to app entity
      const { type, entityData } = convertAIResultToEntity(
        { type: entityType as 'goal' | 'task' | 'milestone' | 'unknown', data, confidence: 0.8 },
        user.uid,
        defaultAreaId
      );
      
      switch (type) {
        case 'goal': {
          // Add timestamps
          const now = new Date();
          const timestamp: Timestamp = {
            seconds: Math.floor(now.getTime() / 1000),
            nanoseconds: 0
          };
          
          const goalData: Partial<SourceActivity> = {
            ...entityData as Partial<SourceActivity>,
            createdAt: timestamp,
            updatedAt: timestamp
          };
          
          // Add the goal
          await addGoal(goalData as SourceActivity);
          toast.success(`Goal "${goalData.name}" created!`);
          break;
        }
        case 'task': {
          // For now we'll assume task creation is handled through goals
          // This will need to be expanded based on your app's structure
          toast.success(`Task parsed! You can add it to a specific goal.`);
          break;
        }
        case 'milestone': {
          // Similar to tasks
          toast.success(`Milestone parsed! You can add it to a specific goal.`);
          break;
        }
        default:
          toast.error("Couldn't determine what to create from your input.");
      }
    } catch (error) {
      console.error('Error creating entity from chat:', error);
      toast.error(`Failed to create from chat: ${(error as Error).message}`);
    }
  };

  return (
    <>
      {showSettings ? (
        <div className="fixed bottom-20 right-4 z-50 w-80 sm:w-96">
          <div className="relative">
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
            <ChatSettings onClose={() => setShowSettings(false)} />
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowSettings(true)}
          className="fixed bottom-20 right-4 z-50 bg-white text-gray-700 p-2 rounded-full shadow-lg hover:bg-gray-100"
          title="Chat Settings"
        >
          <Cog className="w-5 h-5" />
        </button>
      )}

      <ChatInterface 
        apiKey={apiKey || undefined} 
        onEntityCreated={handleEntityCreated} 
      />
    </>
  );
};

export default ChatAssistant;