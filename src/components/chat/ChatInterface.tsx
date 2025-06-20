import React, { useState, useRef, useEffect } from 'react';
import { SendHorizonal, X, ChevronUp, ChevronDown } from 'lucide-react';
import { getAIService, ParsedResult } from '../../services/AIService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  parsedResult?: ParsedResult;
}

interface ChatInterfaceProps {
  onEntityCreated?: (entityType: string, data: any) => void;
  apiKey?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onEntityCreated, apiKey }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize AI service when apiKey is provided
  useEffect(() => {
    if (apiKey) {
      try {
        const aiService = getAIService({ apiKey });
        setIsInitialized(aiService.isReady());
      } catch (error) {
        console.error("Error initializing AI service:", error);
        setIsInitialized(false);
      }
    } else {
      setIsInitialized(false);
    }

    // Add initial welcome message regardless of API key
    if (messages.length === 0) {
      setMessages([
        {
          id: Date.now().toString(),
          text: "Hi there! I'm your Goal Assistant. You can tell me about your goals and tasks in natural language, and I'll help you add them to your planner. Try something like 'I want to learn Spanish by the end of the year' or 'I need to finish the project report by Friday'.",
          sender: 'assistant',
          timestamp: new Date()
        }
      ]);

      // If no API key, add a follow-up message
      if (!apiKey) {
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              text: "Before we get started, you'll need to add your OpenAI API key in the settings. Click the gear icon above to set it up.",
              sender: 'assistant',
              timestamp: new Date()
            }
          ]);
        }, 1000);
      }
    }
  }, [apiKey, messages.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputText.trim() || !isInitialized) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    try {
      const aiService = getAIService();
      const parsedResult = await aiService.processInput(inputText);
      
      // Add assistant response
      let responseText = '';
      
      switch (parsedResult.type) {
        case 'goal':
          responseText = `I've added your goal: "${parsedResult.data.title}"`;
          break;
        case 'task':
          responseText = `I've added your task: "${parsedResult.data.title}"`;
          break;
        case 'milestone':
          responseText = `I've added your milestone: "${parsedResult.data.title}"`;
          break;
        default:
          responseText = "I'm not sure what you want to create. Could you clarify if this is a goal, task, or milestone?";
      }
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        text: responseText,
        sender: 'assistant',
        timestamp: new Date(),
        parsedResult
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Notify parent component about the created entity
      if (parsedResult.type !== 'unknown' && onEntityCreated) {
        onEntityCreated(parsedResult.type, parsedResult.data);
      }
    } catch (error) {
      // Handle error
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: `Sorry, there was an error processing your request. ${(error as Error).message}`,
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={toggleExpanded}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <ChevronUp className="w-5 h-5" />
          <span>Chat with Goal Assistant</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-xl w-80 sm:w-96 flex flex-col max-h-[500px] border border-gray-200">
      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b">
        <h3 className="font-medium">Goal Assistant</h3>
        <div className="flex gap-2">
          <button onClick={toggleExpanded} className="text-gray-500 hover:text-gray-700">
            <ChevronDown className="w-5 h-5" />
          </button>
          <button onClick={() => setIsExpanded(false)} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-gray-100 text-gray-800 rounded-tl-none'
              }`}
            >
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg text-gray-800 rounded-tl-none max-w-[85%]">
              <p className="text-sm">Thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={isInitialized ? "Describe your goal or task..." : "API key required..."}
            className="flex-1 p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!isInitialized || isLoading}
          />
          <button
            type="submit"
            disabled={!isInitialized || isLoading || !inputText.trim()}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300"
          >
            <SendHorizonal className="w-4 h-4" />
          </button>
        </div>
        {!isInitialized && (
          <p className="text-xs text-red-500 mt-1">
            Please provide an OpenAI API key in settings (gear icon) to use the AI assistant.
          </p>
        )}
      </form>
    </div>
  );
};

export default ChatInterface;