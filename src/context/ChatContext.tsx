"use client";
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ChatMessage } from '@/libs/agine/helper';

interface ChatContextType {
  chatMessages: ChatMessage[];
  chatInput: string;
  chatLoading: boolean;
  setChatMessages: (messages: ChatMessage[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  setChatInput: (input: string) => void;
  setChatLoading: (loading: boolean) => void;
  clearChatHistory: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const addChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
  }, []);

  const clearChatHistory = useCallback(() => {
    setChatMessages([]);
  }, []);

  const value = {
    chatMessages,
    chatInput,
    chatLoading,
    setChatMessages,
    addChatMessage,
    setChatInput,
    setChatLoading,
    clearChatHistory,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
};