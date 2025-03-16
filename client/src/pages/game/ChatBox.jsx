import { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

const ChatWindow = ({ chatId, username = "You", onBack }) => {
  const [messages, setMessages] = useState([
    { sender: "Sagar", message: "Hello! How are you?" },
    { sender: "You", message: "I'm good! What about you?" },
    { sender: chatId, message: "This is a test message!" }
  ]); // Dummy Messages

  const [message, setMessage] = useState("");

  useEffect(() => {
    socket.on("receiveGlobalMessage", (data) => {
      if (chatId === "global") {
        setMessages((prev) => [...prev, data]);
      }
    });

    socket.on("receivePrivateMessage", (data) => {
      if (data.sender === chatId || data.receiver === chatId) {
        setMessages((prev) => [...prev, data]);
      }
    });

    return () => {
      socket.off("receiveGlobalMessage");
      socket.off("receivePrivateMessage");
    };
  }, [chatId]);

  const sendMessage = () => {
    if (!message.trim()) return;

    const newMessage = { sender: username, message };

    if (chatId === "global") {
      socket.emit("sendGlobalMessage", newMessage);
    } else {
      socket.emit("sendPrivateMessage", newMessage);
    }

    setMessages((prev) => [...prev, newMessage]);
    setMessage("");
  };

  return (
    <div className="flex flex-col h-screen  bg-gray-900 text-white">
      {/* Header with Back Button and Sender Name */}
      <div className="p-3 bg-gray-800 text-lg font-bold flex justify-between items-center">
        <button onClick={onBack} className="bg-gray-700 text-white px-3 py-1 rounded">
          ← Back
        </button>
        <span className="text-white">{chatId === "global" ? "Group Chat" : chatId}</span>
      </div>

      {/* Messages */}
      <div className="flex-grow p-4 overflow-auto flex flex-col">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-2 rounded-lg w-fit max-w-xs mb-2 ${
              msg.sender === username
                ? "bg-blue-500 text-white self-end" // Outgoing message (rightmost)
                : "bg-gray-700 self-start" // Incoming message (leftmost)
            }`}
          >
            {msg.message}
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div className="p-2 bg-gray-800 flex">
        <input
          type="text"
          className="flex-grow p-2 rounded-lg bg-gray-900 text-white"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button onClick={sendMessage} className="ml-2 bg-blue-500 text-white p-2 rounded-lg">
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
