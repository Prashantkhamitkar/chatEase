import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiDownload,
  FiFileText,
  FiImage,
  FiX,
  FiTrash2,
  FiCopy,
  FiCheck,
  FiSearch,
  FiSlash,
  FiMoreVertical,
} from "react-icons/fi";
import { IoCheckmark, IoCheckmarkDone } from "react-icons/io5";

const QUICK_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

const ChatWindow = ({
  user,
  receiver,
  receiverUser,
  messages,
  isOnline = false,
  isTyping = false,
  onDeleteMessage,
  onReactMessage,
}) => {
  const messagesEndRef = useRef(null);
  const [modalImage, setModalImage] = useState(null);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [deleteTargetMessage, setDeleteTargetMessage] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);

  // Filter messages between current user and active receiver
  const filteredMessages = useMemo(() => {
    return messages.filter(
      (msg) =>
        (msg.sender?.toLowerCase() === user.username?.toLowerCase() &&
          msg.receiver?.toLowerCase() === receiver?.toLowerCase()) ||
        (msg.sender?.toLowerCase() === receiver?.toLowerCase() &&
          msg.receiver?.toLowerCase() === user.username?.toLowerCase())
    );
  }, [messages, user.username, receiver]);

  // Search match count
  const searchMatchesCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const q = searchQuery.toLowerCase();
    return filteredMessages.filter((m) =>
      m.content && !m.deletedForEveryone && m.content.toLowerCase().includes(q)
    ).length;
  }, [filteredMessages, searchQuery]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    return () => clearTimeout(timeout);
  }, [filteredMessages.length, isTyping]);

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const getFullMediaUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:9090";
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const handleCopyText = (msgId, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => {
      setCopiedMsgId(null);
    }, 2000);
  };

  const parseReactions = (reactionsStr) => {
    if (!reactionsStr) return {};
    try {
      return JSON.parse(reactionsStr);
    } catch {
      return {};
    }
  };

  // Group reactions: { "❤️": { count: 2, users: ["a", "b"] } }
  const getGroupedReactions = (reactionsStr) => {
    const map = parseReactions(reactionsStr);
    const grouped = {};
    Object.entries(map).forEach(([uname, emoji]) => {
      if (!grouped[emoji]) {
        grouped[emoji] = { count: 0, users: [] };
      }
      grouped[emoji].count += 1;
      grouped[emoji].users.push(uname);
    });
    return grouped;
  };

  const renderHighlightedContent = (content, query) => {
    if (!query || !query.trim()) return content;
    const parts = content.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 text-gray-900 rounded px-0.5 font-medium">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white/60 backdrop-blur-md rounded-t-2xl">
      {/* Active Chat Header */}
      {receiver && (
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-white/80 border-b border-gray-100/80 shadow-sm z-10">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative">
              {receiverUser?.profilePicture ? (
                <img
                  src={receiverUser.profilePicture}
                  alt={receiver}
                  className="w-10 h-10 rounded-full object-cover shadow-sm border border-purple-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-400 to-blue-400 text-white font-semibold flex items-center justify-center shadow-sm text-base">
                  {receiver.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Online Dot */}
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                  isOnline ? "bg-emerald-500" : "bg-gray-400"
                }`}
              ></div>
            </div>

            {/* User Info */}
            <div className="flex flex-col">
              <span className="font-semibold text-gray-800 text-sm sm:text-base leading-tight">
                {receiverUser?.fullName || receiver}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isTyping ? (
                  <span className="text-purple-600 font-semibold text-xs animate-pulse flex items-center gap-1">
                    typing...
                  </span>
                ) : isOnline ? (
                  <span className="text-emerald-500 font-medium text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    Online
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">Offline</span>
                )}
              </div>
            </div>
          </div>

          {/* Header Controls: In-Chat Search Toggle */}
          <div className="flex items-center gap-2">
            {searchOpen ? (
              <div className="flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm border border-gray-200">
                <FiSearch className="text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search in chat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent outline-none text-xs sm:text-sm text-gray-700 w-28 sm:w-44"
                  autoFocus
                />
                {searchQuery && (
                  <span className="text-[10px] text-gray-400 font-medium mr-1.5">
                    {searchMatchesCount} found
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchOpen(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <FiX className="text-sm" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
                title="Search messages"
              >
                <FiSearch className="text-lg" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 gap-3.5 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-transparent">
        {receiver ? (
          <>
            <AnimatePresence initial={false}>
              {filteredMessages.map((msg, idx) => {
                const isSentByMe =
                  msg.sender?.toLowerCase() === user.username?.toLowerCase();
                const mediaUrl = getFullMediaUrl(msg.mediaUrl);
                const isImage =
                  msg.messageType === "IMAGE" ||
                  (msg.mediaName &&
                    msg.mediaName.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i));
                const isVideo =
                  msg.messageType === "VIDEO" ||
                  (msg.mediaName && msg.mediaName.match(/\.(mp4|webm|ogg)$/i));
                const isAudio =
                  msg.messageType === "AUDIO" ||
                  (msg.mediaName && msg.mediaName.match(/\.(mp3|wav|ogg|m4a)$/i));

                const isDeleted = Boolean(msg.deletedForEveryone);
                const groupedReactions = getGroupedReactions(msg.reactions);
                const hasReactions = Object.keys(groupedReactions).length > 0;
                const isMenuOpen = activeMenuMsgId === msg.id;

                return (
                  <motion.div
                    key={msg.id || idx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 220, damping: 22 }}
                    className={`group relative max-w-[85%] sm:max-w-[70%] px-3.5 py-2.5 rounded-2xl text-sm sm:text-base shadow-sm break-words flex flex-col ${
                      isSentByMe
                        ? "self-end bg-gradient-to-tr from-blue-300 to-purple-300 text-gray-800 rounded-br-none"
                        : "self-start bg-white/95 border border-gray-200/80 text-gray-700 rounded-bl-none"
                    } ${isDeleted ? "opacity-75 italic" : ""}`}
                  >
                    {/* Hover Action Bar: Emoji Reactions, Copy, Delete */}
                    {!isDeleted && (
                      <div
                        className={`absolute -top-4 ${
                          isSentByMe ? "right-2" : "left-2"
                        } opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20 flex items-center gap-0.5 px-2 py-1 bg-white/95 border border-gray-200 rounded-full shadow-lg backdrop-blur-md`}
                      >
                        {/* Quick Reactions */}
                        <div className="flex items-center gap-0.5 pr-1 border-r border-gray-200">
                          {QUICK_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() =>
                                onReactMessage && onReactMessage(msg.id, emoji)
                              }
                              className="text-xs sm:text-sm hover:scale-130 transition-transform p-0.5 active:scale-95"
                              title={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>

                        {/* Copy Text */}
                        {msg.content && (
                          <button
                            onClick={() => handleCopyText(msg.id, msg.content)}
                            className="p-1 hover:text-purple-600 text-gray-500 rounded-full hover:bg-gray-100 transition-colors"
                            title="Copy message"
                          >
                            {copiedMsgId === msg.id ? (
                              <FiCheck className="text-xs text-emerald-600" />
                            ) : (
                              <FiCopy className="text-xs" />
                            )}
                          </button>
                        )}

                        {/* Delete Trigger */}
                        <button
                          onClick={() => setDeleteTargetMessage(msg)}
                          className="p-1 hover:text-red-500 text-gray-500 rounded-full hover:bg-red-50 transition-colors"
                          title="Delete message"
                        >
                          <FiTrash2 className="text-xs" />
                        </button>
                      </div>
                    )}

                    {/* Deleted Message Notice */}
                    {isDeleted ? (
                      <div className="flex items-center gap-2 text-gray-500 text-xs sm:text-sm py-1 select-none">
                        <FiSlash className="text-sm text-gray-400 shrink-0" />
                        <span>This message was deleted</span>
                      </div>
                    ) : (
                      <>
                        {/* Media Render */}
                        {msg.mediaUrl && (
                          <div className="mb-2 overflow-hidden rounded-xl">
                            {isImage ? (
                              <div
                                onClick={() => setModalImage(mediaUrl)}
                                className="cursor-pointer group/img relative overflow-hidden rounded-xl max-h-72 bg-black/5"
                              >
                                <img
                                  src={mediaUrl}
                                  alt={msg.mediaName || "Shared media"}
                                  className="w-full h-auto max-h-72 object-cover rounded-xl transition-transform duration-200 group-hover/img:scale-102"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs sm:text-sm font-medium">
                                  Click to enlarge
                                </div>
                              </div>
                            ) : isVideo ? (
                              <video
                                controls
                                src={mediaUrl}
                                className="w-full max-h-72 rounded-xl bg-black"
                              />
                            ) : isAudio ? (
                              <div className="flex flex-col gap-1 w-full bg-white/70 p-2 rounded-xl border border-gray-200/80">
                                <span className="text-[11px] font-semibold text-gray-600 truncate">
                                  🎵 {msg.mediaName || "Voice / Audio note"}
                                </span>
                                <audio controls src={mediaUrl} className="w-full h-8" />
                              </div>
                            ) : (
                              /* Document / Generic File attachment */
                              <a
                                href={mediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={msg.mediaName}
                                className="flex items-center gap-3 p-3 bg-white/80 border border-gray-200 rounded-xl hover:bg-white transition-all shadow-sm group"
                              >
                                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-xl shrink-0 group-hover:bg-purple-200 transition-colors">
                                  <FiFileText />
                                </div>
                                <div className="flex flex-col truncate min-w-0 flex-1">
                                  <span className="font-semibold text-gray-800 text-xs sm:text-sm truncate">
                                    {msg.mediaName || "Attachment"}
                                  </span>
                                  {msg.mediaSize && (
                                    <span className="text-gray-500 text-xs">
                                      {formatFileSize(msg.mediaSize)}
                                    </span>
                                  )}
                                </div>
                                <div className="p-2 rounded-full text-purple-600 hover:bg-purple-50">
                                  <FiDownload className="text-lg" />
                                </div>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Text Content */}
                        {msg.content && (
                          <span className="whitespace-pre-wrap leading-relaxed">
                            {renderHighlightedContent(msg.content, searchQuery)}
                          </span>
                        )}
                      </>
                    )}

                    {/* Footer Info: Time & Double Mark Status */}
                    <div
                      className={`flex items-center gap-1.5 self-end mt-1 text-[10px] sm:text-xs ${
                        isSentByMe ? "text-purple-900/70" : "text-gray-400"
                      }`}
                    >
                      {formatTime(msg.timestamp)}

                      {/* 🔥 FIX DOUBLE MARK: Sent (single tick) -> Delivered (double tick grey) -> Read (double tick sky blue) */}
                      {isSentByMe && !isDeleted && (
                        <span className="inline-flex items-center ml-0.5">
                          {msg.read ? (
                            <IoCheckmarkDone
                              className="text-sky-500 text-sm font-bold stroke-[3]"
                              title="Read by opponent"
                            />
                          ) : isOnline ? (
                            <IoCheckmarkDone
                              className="text-gray-500 text-sm"
                              title="Delivered"
                            />
                          ) : (
                            <IoCheckmark
                              className="text-gray-400 text-sm"
                              title="Sent"
                            />
                          )}
                        </span>
                      )}
                    </div>

                    {/* Reactions Pill Display */}
                    {!isDeleted && hasReactions && (
                      <div
                        className={`flex flex-wrap gap-1 mt-1.5 ${
                          isSentByMe ? "justify-end" : "justify-start"
                        }`}
                      >
                        {Object.entries(groupedReactions).map(([emoji, data]) => {
                          const reactedByMe = data.users.some(
                            (u) =>
                              u.toLowerCase() === user.username.toLowerCase()
                          );
                          return (
                            <button
                              key={emoji}
                              onClick={() =>
                                onReactMessage && onReactMessage(msg.id, emoji)
                              }
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border shadow-xs transition-all hover:scale-105 ${
                                reactedByMe
                                  ? "bg-purple-100 border-purple-300 text-purple-800 font-semibold"
                                  : "bg-white/90 border-gray-200 text-gray-700"
                              }`}
                              title={`Reacted by: ${data.users.join(", ")}`}
                            >
                              <span>{emoji}</span>
                              <span className="text-[10px]">{data.count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* WhatsApp-Style Typing Bubble */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="self-start flex items-center gap-2 px-4 py-2.5 bg-white/90 backdrop-blur-md border border-gray-200/80 rounded-2xl rounded-bl-none shadow-sm"
              >
                <span className="text-xs text-gray-500 font-medium">
                  {receiver} is typing
                </span>
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></span>
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-gray-400 text-center">
            <h3 className="text-lg font-medium">Select a contact to start chatting 💬</h3>
            <p className="text-sm mt-1">Your messages will appear here</p>
          </div>
        )}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTargetMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-sm shadow-2xl border border-gray-100 flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-xl shrink-0">
                  <FiTrash2 />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-base">
                    Delete Message
                  </h3>
                  <p className="text-xs text-gray-500">
                    Choose how you want to delete this message.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                {/* Delete For Everyone (Only sender can delete for everyone) */}
                {deleteTargetMessage.sender?.toLowerCase() ===
                  user.username?.toLowerCase() &&
                  !deleteTargetMessage.deletedForEveryone && (
                    <button
                      onClick={() => {
                        onDeleteMessage &&
                          onDeleteMessage(deleteTargetMessage.id, true, false);
                        setDeleteTargetMessage(null);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      <FiTrash2 className="text-base" />
                      Delete for Everyone
                    </button>
                  )}

                {/* Delete Media Only (If message has attached media) */}
                {deleteTargetMessage.mediaUrl &&
                  !deleteTargetMessage.deletedForEveryone && (
                    <button
                      onClick={() => {
                        onDeleteMessage &&
                          onDeleteMessage(deleteTargetMessage.id, true, true);
                        setDeleteTargetMessage(null);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <FiImage className="text-base" />
                      Delete Media Only
                    </button>
                  )}

                {/* Delete For Me */}
                <button
                  onClick={() => {
                    onDeleteMessage &&
                      onDeleteMessage(deleteTargetMessage.id, false, false);
                    setDeleteTargetMessage(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Delete for Me
                </button>

                {/* Cancel */}
                <button
                  onClick={() => setDeleteTargetMessage(null)}
                  className="w-full py-2 px-4 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors mt-1"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal for enlarged images */}
      <AnimatePresence>
        {modalImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalImage(null)}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img
                src={modalImage}
                alt="Enlarged view"
                className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
              <button
                onClick={() => setModalImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <FiX className="text-xl" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatWindow;
