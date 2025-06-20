import React, { useState, useEffect } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, EyeIcon, EyeOffIcon, Check, AlertTriangle } from 'lucide-react';

interface ChatSettingsProps {
  onClose?: () => void;
}

const ChatSettings: React.FC<ChatSettingsProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { apiKey, setApiKey, clearApiKey, isReady } = useChat();
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [validKey, setValidKey] = useState<boolean | null>(null);

  // Update key state when apiKey changes
  useEffect(() => {
    if (apiKey) {
      setKey(apiKey);
    }
  }, [apiKey]);

  const testApiKey = async (keyToTest: string) => {
    if (!keyToTest.trim()) return;
    
    setTestingKey(true);
    setValidKey(null);
    
    try {
      // Simple validation - OpenAI keys typically start with 'sk-'
      if (!keyToTest.startsWith('sk-')) {
        setValidKey(false);
        setError('API key should start with "sk-"');
        setTestingKey(false);
        return;
      }
      
      // Note: In a production app, you would make a test request to OpenAI here
      // For demo purposes, we'll accept any key that starts with 'sk-'
      setValidKey(true);
      setError(null);
    } catch (err) {
      setValidKey(false);
      setError('Invalid API key');
    } finally {
      setTestingKey(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('You need to be logged in to save settings');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      if (key.trim()) {
        // For now, we'll save any key that starts with sk-
        if (key.trim().startsWith('sk-')) {
          console.log('Saving API key...');
          await setApiKey(key.trim());
          toast.success('API key saved successfully!');
          console.log('API key saved!');

          // Add a small delay before closing
          setTimeout(() => {
            if (onClose) onClose();
          }, 500);
        } else {
          setError('API key should start with "sk-"');
          setSaving(false);
        }
      } else {
        console.log('Clearing API key...');
        await clearApiKey();
        toast.success('API key cleared.');

        // Add a small delay before closing
        setTimeout(() => {
          if (onClose) onClose();
        }, 500);
      }
    } catch (err) {
      console.error('Error saving API key:', err);
      const errorMessage = (err as Error).message || 'Failed to save API key';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-medium mb-4">AI Assistant Settings</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
            OpenAI API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              id="apiKey"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className={`w-full p-2 pr-20 border rounded-md text-sm ${
                validKey === false ? 'border-red-500' : validKey === true ? 'border-green-500' : ''
              }`}
              placeholder="sk-..."
              disabled={saving}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
              {testingKey && <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />}
              {validKey === true && <Check className="w-4 h-4 text-green-500" />}
              {validKey === false && <AlertTriangle className="w-4 h-4 text-red-500" />}
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-gray-500 p-1 hover:text-gray-700"
                tabIndex={-1}
              >
                {showKey ? (
                  <EyeOffIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Your API key is stored securely in your user settings.
          </p>
          {validKey === false && error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => testApiKey(key)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={saving || testingKey || !key.trim()}
          >
            {testingKey ? 'Testing...' : 'Test Key'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-gray-600 text-sm hover:text-gray-700"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || testingKey}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      <div className="mt-6">
        <h3 className="text-sm font-medium mb-2">How to get an OpenAI API Key:</h3>
        <ol className="text-xs text-gray-600 list-decimal pl-4 space-y-1">
          <li>Go to <a href="https://platform.openai.com/signup" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">platform.openai.com</a> and create an account</li>
          <li>Navigate to the API Keys section</li>
          <li>Click "Create new secret key"</li>
          <li>Copy the key and paste it here</li>
        </ol>
      </div>
    </div>
  );
};

export default ChatSettings;