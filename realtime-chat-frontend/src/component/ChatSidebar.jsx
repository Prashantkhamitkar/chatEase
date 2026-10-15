import React, { useState } from "react";
import { motion } from "framer-motion";
import { FiLogOut } from "react-icons/fi";

const ChatSidebar = ({
  users,
  receiver,
  setReceiver,
  user,
  unread = {},
  onlineUsers = [],
  typingStatus = {},
  onSignout,
}) => {
  // Custom avatar component with fallback
  const UserAvatar = ({ userObj, size = "small" }) => {
    const [imageError, setImageError] = useState(false);

    const dimensions = size === "large" ? "w-10 h-10" : "w-8 h-8";
    const textSize = size === "large" ? "text-lg" : "text-sm";

    if (userObj?.profilePicture && !imageError) {
      return (
        <img
          src={userObj.profilePicture}
          alt={userObj.username}
          className={`${dimensions} rounded-full object-cover shadow-sm`}
          onError={() => setImageError(true)}
        />
      );
    }

    return (
      <div
        className={`${dimensions} rounded-full bg-purple-200 text-purple-700 font-semibold flex items-center justify-center shadow-sm ${textSize}`}
      >
        {userObj?.username ? userObj.username.charAt(0).toUpperCase() : "?"}
      </div>
    );
  };

  return (
    <motion.div
      className="
        flex flex-col h-full w-full
        bg-white/90 backdrop-blur-lg shadow-xl
        rounded-l-2xl sm:rounded-2xl
        border-r border-white/30
        p-4 sm:p-5
      "
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
    >
      {/* App Logo */}
      <h2 className="text-2xl font-bold text-purple-600 mb-4 text-center select-none">
        💬 ChatEase
      </h2>

      {/* Current User Card with Quick Sign Out */}
      <motion.div
        className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-purple-100 to-blue-100 shadow-md cursor-default mb-4"
        whileHover={{ scale: 1.01 }}
      >
        <div className="flex items-center gap-3 truncate flex-1 min-w-0">
          <div className="relative shrink-0">
            <UserAvatar userObj={user} size="large" />
            {/* Always online for self */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
          </div>
          <div className="flex flex-col truncate flex-1 min-w-0">
            <span className="font-semibold text-gray-800 truncate text-sm">
              {user?.fullName || user?.username}
            </span>
            <small className="text-emerald-600 text-xs font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Online
            </small>
          </div>
        </div>

        {/* Quick Signout button */}
        {onSignout && (
          <button
            onClick={onSignout}
            className="p-2 ml-1 text-gray-500 hover:text-red-600 hover:bg-white/70 rounded-xl transition-all cursor-pointer shrink-0"
            title="Sign Out"
          >
            <FiLogOut className="text-base" />
          </button>
        )}
      </motion.div>

      {/* Contacts List Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <h4 className="text-xs uppercase tracking-wider font-bold text-gray-400">
          Contacts ({users.length})
        </h4>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-transparent pr-1">
        {users.map((u) => {
          const isOnline =
            (onlineUsers && onlineUsers.includes(u.username.toLowerCase())) ||
            (onlineUsers && onlineUsers.includes(u.username)) ||
            Boolean(u.online);
          const isTyping = Boolean(typingStatus && typingStatus[u.username]);
          const isSelected = receiver === u.username;
          const unreadCount = unread[u.username] || 0;

          return (
            <motion.div
              key={u.id || u.username}
              onClick={() => setReceiver(u.username)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              layout
              className={`relative flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all duration-200
                ${
                  isSelected
                    ? "bg-gradient-to-r from-purple-200 to-blue-200 text-purple-900 shadow-inner"
                    : "hover:bg-purple-100/50 text-gray-700 bg-white/40"
                }`}
            >
              {/* Avatar with Online Badge */}
              <div className="relative shrink-0">
                <UserAvatar userObj={u} size="small" />
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                    isOnline ? "bg-emerald-500" : "bg-gray-400"
                  }`}
                ></div>
              </div>

              {/* User details */}
              <div className="flex flex-col flex-1 min-w-0">
                <span className="truncate font-medium text-sm text-gray-800">
                  {u.fullName || u.username}
                </span>

                {/* Status or Typing subtitle */}
                <div className="flex items-center text-xs">
                  {isTyping ? (
                    <span className="text-purple-600 font-semibold animate-pulse truncate text-[11px]">
                      typing...
                    </span>
                  ) : isOnline ? (
                    <span className="text-emerald-500 font-medium truncate text-[11px] flex items-center gap-1">
                      Online
                    </span>
                  ) : (
                    <span className="text-gray-400 truncate text-[11px]">
                      Offline
                    </span>
                  )}
                </div>
              </div>

              {/* Unread Badge */}
              {unreadCount > 0 && !isSelected && (
                <motion.span
                  className="bg-pink-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-md shrink-0"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {unreadCount}
                </motion.span>
              )}
            </motion.div>
          );
        })}

        {users.length === 0 && (
          <div className="text-center text-gray-400 text-xs py-8">
            No contacts available
          </div>
        )}
      </div>

      {/* Prominent Sign Out Button at Bottom */}
      {onSignout && (
        <div className="pt-3 border-t border-purple-100/80 mt-2">
          <motion.button
            onClick={onSignout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 transition-all cursor-pointer border border-red-200/60 shadow-xs"
          >
            <FiLogOut className="text-base" />
            <span>Sign Out</span>
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

export default ChatSidebar;