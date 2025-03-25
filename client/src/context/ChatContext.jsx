import React, { createContext, useContext, useState, useEffect } from 'react';
import chatSocketService from '../services/chatSocketService';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load user's chat rooms on mount
    loadChatRooms();

    // Set up socket event listeners
    const socket = chatSocketService.socket;

    socket.on('chatHistory', ({ roomId, messages }) => {
      if (roomId === activeRoom) {
        setMessages(messages);
      }
    });

    socket.on('newMessage', (message) => {
      if (message.roomId === activeRoom) {
        setMessages(prev => [...prev, message]);
      }
    });

    socket.on('newPrivateChat', (data) => {
      loadChatRooms(); // Reload chat rooms to include new private chat
    });

    return () => {
      socket.off('chatHistory');
      socket.off('newMessage');
      socket.off('newPrivateChat');
    };
  }, [activeRoom]);

  const loadChatRooms = async () => {
    try {
      setLoading(true);
      const rooms = await chatSocketService.getUserChatRooms();
      setChatRooms(rooms);
    } catch (error) {
      setError('Failed to load chat rooms');
      console.error('Error loading chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (roomId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Leave current room if any
      if (activeRoom) {
        chatSocketService.leaveChatRoom(activeRoom);
      }

      // Join new room
      chatSocketService.joinChatRoom(roomId);
      setActiveRoom(roomId);

      // Load messages for the room
      const roomMessages = await chatSocketService.getChatRoomMessages(roomId);
      setMessages(roomMessages);
    } catch (error) {
      setError('Failed to join chat room');
      console.error('Error joining chat room:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = (message) => {
    if (!activeRoom) {
      setError('No active chat room');
      return;
    }

    try {
      chatSocketService.sendMessage(activeRoom, message);
    } catch (error) {
      setError('Failed to send message');
      console.error('Error sending message:', error);
    }
  };

  const startPrivateChat = async (targetUserId) => {
    try {
      setLoading(true);
      setError(null);
      chatSocketService.startPrivateChat(targetUserId);
    } catch (error) {
      setError('Failed to start private chat');
      console.error('Error starting private chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    activeRoom,
    messages,
    chatRooms,
    loading,
    error,
    joinRoom,
    sendMessage,
    startPrivateChat,
    loadChatRooms
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}; 