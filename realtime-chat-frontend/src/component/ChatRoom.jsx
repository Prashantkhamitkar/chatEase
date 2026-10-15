import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  connectSocket,
  disconnectSocket,
  markMessagesAsRead,
  sendPrivateMessage,
  sendTypingStatus,
  sendDeleteMessage,
  sendReaction,
} from "../websocket/stompClient";
import {
  fetchMessages,
  fetchUnreadCounts,
  fetchUsers,
  fetchOnlineUsers,
  setCurrentUser,
  setReceiver,
  clearChatState,
} from "../store/slices/chatSlice";
import { logout, logoutUser } from "../store/slices/authSlice";
import ChatSidebar from "./ChatSidebar";
import ChatWindow from "./ChatWindow";
import ChatInput from "./ChatInput";
import { motion, AnimatePresence } from "framer-motion";
import { FiMenu } from "react-icons/fi";

const ChatRoom = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { users, receiver, messages, unread, onlineUsers, typingStatus } = useSelector(
    (state) => state.chat
  );
  const { user } = useSelector((state) => state.auth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Connect socket and load initial data
  useEffect(() => {
    if (user?.username) {
      dispatch(setCurrentUser(user.username));
      connectSocket(user.username);
      dispatch(fetchUsers(user.username));
      dispatch(fetchOnlineUsers());
      dispatch(fetchUnreadCounts(user.username));
    }

    const handleBeforeUnload = () => {
      if (user?.username) {
        disconnectSocket(user.username);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (user?.username) {
        disconnectSocket(user.username);
      }
    };
  }, [dispatch, user?.username]);

  // When receiver changes, fetch history and mark messages as read
  useEffect(() => {
    if (receiver && user?.username) {
      dispatch(fetchMessages({ sender: user.username, receiver }));
      markMessagesAsRead(receiver, user.username);
    }
  }, [receiver, user?.username, dispatch]);

  // 🔥 Fix unread count & double mark: whenever new messages arrive from active receiver, immediately mark as read
  useEffect(() => {
    if (receiver && user?.username) {
      const hasUnread = messages.some(
        (m) =>
          m.sender?.toLowerCase() === receiver?.toLowerCase() &&
          m.receiver?.toLowerCase() === user.username?.toLowerCase() &&
          !m.read
      );
      if (hasUnread) {
        markMessagesAsRead(receiver, user.username);
      }
    }
  }, [messages, receiver, user?.username]);

  // 🔥 Listen for tab focus / visibilitychange so opponent gets double mark immediately when tab becomes visible
  useEffect(() => {
    const handleActiveFocus = () => {
      if (receiver && user?.username && !document.hidden) {
        markMessagesAsRead(receiver, user.username);
      }
    };
    window.addEventListener("focus", handleActiveFocus);
    document.addEventListener("visibilitychange", handleActiveFocus);
    return () => {
      window.removeEventListener("focus", handleActiveFocus);
      document.removeEventListener("visibilitychange", handleActiveFocus);
    };
  }, [receiver, user?.username]);

  const handleSend = (content, mediaData = null) => {
    if (receiver && (content?.trim() || mediaData)) {
      sendPrivateMessage(user.username, receiver, content, mediaData);
    }
  };

  const handleTyping = (isTyping) => {
    if (receiver && user?.username) {
      sendTypingStatus(user.username, receiver, isTyping);
    }
  };

  const handleDeleteMessage = (messageId, forEveryone, deleteMediaOnly) => {
    sendDeleteMessage(messageId, user?.username, forEveryone, deleteMediaOnly);
  };

  const handleReactMessage = (messageId, emoji) => {
    sendReaction(messageId, user?.username, emoji);
  };

  const handleReceiverChange = (r) => {
    // If we had a previous receiver, mark read to ensure no lingering unread counts in DB
    if (receiver && user?.username) {
      markMessagesAsRead(receiver, user.username);
    }
    dispatch(setReceiver(r));
    if (r && user?.username) {
      markMessagesAsRead(r, user.username);
    }
    setIsSidebarOpen(false); // auto close sidebar on mobile
  };

  const handleSignout = useCallback(() => {
    const username = user?.username;
    // 1. Send offline ping and disconnect socket
    if (username) {
      disconnectSocket(username);
    }
    // 2. Dispatch logout thunk to tell backend and clear cookies
    dispatch(logoutUser({ username }));
    // 3. Clear redux auth and chat states
    dispatch(logout());
    dispatch(clearChatState());
    // 4. Clear browser storage
    localStorage.removeItem("user");
    localStorage.removeItem("authenticated");
    // 5. Navigate to login
    navigate("/auth");
  }, [dispatch, navigate, user?.username]);

  const receiverUser = users.find((u) => u.username === receiver);
  const isReceiverOnline =
    (onlineUsers && onlineUsers.includes(receiver?.toLowerCase())) ||
    (onlineUsers && onlineUsers.includes(receiver)) ||
    Boolean(receiverUser?.online);
  const isReceiverTyping = Boolean(typingStatus && typingStatus[receiver]);

  return (
    <motion.div
      className="relative flex h-[90vh] font-sans bg-gradient-to-tr from-blue-100 via-pink-200 to-purple-200 overflow-hidden rounded-3xl shadow-inner"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Floating background bubbles */}
      <div className="absolute w-32 sm:w-40 h-32 sm:h-40 bg-purple-300 rounded-full opacity-20 top-10 left-6 animate-float"></div>
      <div className="absolute w-36 sm:w-48 h-36 sm:h-48 bg-pink-300 rounded-full opacity-20 bottom-16 right-10 animate-float animation-delay-5000"></div>
      <div className="absolute w-24 sm:w-32 h-24 sm:h-32 bg-blue-300 rounded-full opacity-20 top-1/3 left-1/2 animate-float animation-delay-10000"></div>

      {/* Mobile sidebar toggle */}
      <div className="absolute top-4 left-4 z-30 sm:hidden">
        <button
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          className="p-2 rounded-xl bg-white/80 backdrop-blur-md border border-white/40 shadow-lg hover:bg-white transition-all cursor-pointer"
        >
          <FiMenu className="text-gray-700 text-xl" />
        </button>
      </div>

      {/* Sidebar (Responsive) */}
      <motion.div
        className={`absolute sm:relative top-0 left-0 h-full w-64 sm:w-72 bg-white/80 backdrop-blur-md border-r border-white/40 shadow-2xl z-20 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        <ChatSidebar
          users={users}
          receiver={receiver}
          setReceiver={handleReceiverChange}
          user={user}
          unread={unread}
          onlineUsers={onlineUsers}
          typingStatus={typingStatus}
          onSignout={handleSignout}
        />
      </motion.div>

      {/* Chat Section */}
      <motion.div
        className="relative flex flex-col flex-1 bg-white/80 backdrop-blur-md border border-white/40 shadow-xl rounded-2xl sm:rounded-l-none overflow-hidden pt-12 sm:pt-0"
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        <AnimatePresence mode="popLayout">
          <ChatWindow
            key={receiver || "no-receiver"}
            user={user}
            receiver={receiver}
            receiverUser={receiverUser}
            messages={messages}
            isOnline={isReceiverOnline}
            isTyping={isReceiverTyping}
            onDeleteMessage={handleDeleteMessage}
            onReactMessage={handleReactMessage}
          />
        </AnimatePresence>
        {receiver && (
          <ChatInput onSend={handleSend} onTyping={handleTyping} />
        )}
      </motion.div>

      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-10 sm:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Floating Animation */}
      <style>
        {`
          @keyframes float {
            0% { transform: translate(0, 0); }
            50% { transform: translate(30px, -30px); }
            100% { transform: translate(0, 0); }
          }
          .animate-float {
            animation: float 25s ease-in-out infinite;
          }
          .animation-delay-5000 {
            animation-delay: 5s;
          }
          .animation-delay-10000 {
            animation-delay: 10s;
          }
        `}
      </style>
    </motion.div>
  );
};

export default ChatRoom;