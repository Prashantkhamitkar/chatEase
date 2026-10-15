import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Picker from "emoji-picker-react";
import { FiSend, FiSmile, FiPaperclip, FiX, FiFile, FiImage, FiLoader } from "react-icons/fi";
import axiosInstance from "../api/axiosInstance";

const ChatInput = ({ onSend, onTyping }) => {
  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const pickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup file preview object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [filePreview]);

  // Handle typing indicator
  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessage(val);

    if (onTyping) {
      onTyping(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1500);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }

    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
    // Reset file input so user can pick the same file again if desired
    e.target.value = "";
  };

  const removeSelectedFile = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setSelectedFile(null);
    setFilePreview(null);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleSend = async () => {
    if (isUploading) return;
    const trimmed = message.trim();
    if (!trimmed && !selectedFile) return;

    // Immediately stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (onTyping) {
      onTyping(false);
    }

    try {
      let mediaData = null;
      if (selectedFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await axiosInstance.post("/api/media/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        mediaData = uploadRes.data;
      }

      onSend(trimmed, mediaData);

      // Reset input state
      setMessage("");
      removeSelectedFile();
    } catch (error) {
      console.error("Failed to send media/message:", error);
      alert(
        error.response?.data?.error ||
          "Failed to upload media. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
  };

  return (
    <div className="relative flex flex-col bg-white/70 backdrop-blur-md border-t border-white/40 shadow-inner rounded-b-2xl">
      {/* File Preview Attachment Bar */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-purple-50/90 border-b border-purple-100"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {filePreview ? (
                <img
                  src={filePreview}
                  alt="Preview"
                  className="w-12 h-12 object-cover rounded-xl border border-purple-200 shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-purple-200 text-purple-700 flex items-center justify-center text-xl shadow-sm">
                  {selectedFile.type.startsWith("image/") ? <FiImage /> : <FiFile />}
                </div>
              )}
              <div className="flex flex-col truncate">
                <span className="text-xs sm:text-sm font-semibold text-gray-800 truncate max-w-[200px] sm:max-w-xs">
                  {selectedFile.name}
                </span>
                <span className="text-xs text-purple-600 font-medium">
                  {formatFileSize(selectedFile.size)}
                </span>
              </div>
            </div>

            <button
              onClick={removeSelectedFile}
              disabled={isUploading}
              className="p-1.5 rounded-full hover:bg-purple-200/70 text-gray-500 hover:text-gray-800 transition-colors"
              title="Remove attachment"
            >
              <FiX className="text-lg" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
        />

        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center justify-center w-9 sm:w-10 h-9 sm:h-10 text-lg text-gray-600 bg-gray-100 rounded-full hover:bg-purple-100 hover:text-purple-600 transition-all cursor-pointer"
          title="Attach media or document"
        >
          <FiPaperclip />
        </button>

        {/* Message Input */}
        <motion.input
          value={message}
          onChange={handleInputChange}
          placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          whileFocus={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          disabled={isUploading}
          className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 bg-white/80 outline-none text-gray-700 text-sm sm:text-base focus:ring-2 focus:ring-purple-300 focus:border-purple-300 transition-all placeholder-gray-400"
        />

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmoji((prev) => !prev)}
          disabled={isUploading}
          className="flex items-center justify-center w-9 sm:w-10 h-9 sm:h-10 text-lg sm:text-xl text-gray-600 bg-gray-100 rounded-full hover:bg-purple-100 hover:text-purple-600 transition-all cursor-pointer"
          title="Add emoji"
        >
          <FiSmile />
        </button>

        {/* Send Button */}
        <motion.button
          type="button"
          onClick={handleSend}
          disabled={isUploading || (!message.trim() && !selectedFile)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className={`flex items-center justify-center w-9 sm:w-10 h-9 sm:h-10 text-lg text-white rounded-full shadow-md transition-all ${
            isUploading || (!message.trim() && !selectedFile)
              ? "bg-purple-300 cursor-not-allowed opacity-70"
              : "bg-gradient-to-tr from-purple-500 to-blue-400 hover:from-purple-600 hover:to-blue-500 cursor-pointer"
          }`}
          title="Send"
        >
          {isUploading ? (
            <FiLoader className="animate-spin text-base" />
          ) : (
            <FiSend className="ml-0.5" />
          )}
        </motion.button>

        {/* Emoji Picker */}
        {showEmoji && (
          <div
            ref={pickerRef}
            className="absolute bottom-16 right-4 sm:right-6 z-50 shadow-2xl rounded-2xl overflow-hidden"
          >
            <Picker onEmojiClick={handleEmojiClick} theme="light" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInput;
