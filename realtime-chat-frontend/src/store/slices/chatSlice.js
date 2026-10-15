import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axiosInstance";

export const fetchUsers = createAsyncThunk(
  "chat/fetchUsers",
  async (currentUser) => {
    const res = await axiosInstance.get("/api/users");
    return res.data.filter((u) => u.username !== currentUser);
  }
);

export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async ({ sender, receiver }) => {
    const res = await axiosInstance.get(
      `/api/messages?sender=${encodeURIComponent(sender)}&receiver=${encodeURIComponent(receiver)}`
    );
    return res.data;
  }
);

export const fetchUnreadCounts = createAsyncThunk(
  "chat/fetchUnreadCounts",
  async (username) => {
    const res = await axiosInstance.get(
      `/api/messages/unread-counts/${encodeURIComponent(username)}`
    );
    return res.data;
  }
);

export const fetchOnlineUsers = createAsyncThunk(
  "chat/fetchOnlineUsers",
  async () => {
    const res = await axiosInstance.get("/api/users/online");
    return res.data;
  }
);

export const markMessagesAsRead = createAsyncThunk(
  "chat/markMessagesAsRead",
  async ({ sender, receiver }) => {
    await axiosInstance.post(
      `/api/messages/mark-read?sender=${encodeURIComponent(sender)}&receiver=${encodeURIComponent(receiver)}`
    );
    return { sender, receiver };
  }
);

export const deleteMessageApi = createAsyncThunk(
  "chat/deleteMessageApi",
  async ({ messageId, username, forEveryone, deleteMediaOnly }) => {
    const res = await axiosInstance.delete(
      `/api/messages/${messageId}?username=${encodeURIComponent(username || "")}&forEveryone=${Boolean(forEveryone)}&deleteMediaOnly=${Boolean(deleteMediaOnly)}`
    );
    return res.data;
  }
);

export const reactMessageApi = createAsyncThunk(
  "chat/reactMessageApi",
  async ({ messageId, username, emoji }) => {
    const res = await axiosInstance.post(
      `/api/messages/${messageId}/reaction?username=${encodeURIComponent(username)}&emoji=${encodeURIComponent(emoji || "")}`
    );
    return res.data;
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    users: [],
    messages: [],
    receiver: "",
    status: "idle",
    unread: {}, // Format: { "username": count }
    currentUser: "",
    onlineUsers: [], // Array of online usernames
    typingStatus: {}, // Format: { "username": true }
  },
  reducers: {
    addMessage: (state, action) => {
      const newMessage = action.payload;
      if (!newMessage) return;

      // 🔥 FIX DUPLICATE MESSAGES: Check if message already exists by ID
      if (newMessage.id) {
        const existsById = state.messages.some((m) => m.id === newMessage.id);
        if (existsById) return;
      } else {
        // Fallback duplicate check for optimistic / in-flight messages
        const existsByContent = state.messages.some(
          (m) =>
            m.sender === newMessage.sender &&
            m.receiver === newMessage.receiver &&
            m.content === newMessage.content &&
            m.mediaUrl === newMessage.mediaUrl &&
            Math.abs(new Date(m.timestamp || 0) - new Date(newMessage.timestamp || 0)) < 1500
        );
        if (existsByContent) return;
      }

      // Add message to messages array
      state.messages.push(newMessage);

      // If message is received by current user:
      if (newMessage.receiver?.toLowerCase() === state.currentUser?.toLowerCase()) {
        if (newMessage.sender?.toLowerCase() === state.receiver?.toLowerCase()) {
          // Message received from current open chat -> immediately marked read
          state.unread[newMessage.sender] = 0;
          newMessage.read = true;
        } else {
          // Message received from a different contact -> increment unread count
          state.unread[newMessage.sender] = (state.unread[newMessage.sender] || 0) + 1;
        }
      }
    },

    markMessagesReadInStore: (state, action) => {
      const { sender, receiver } = action.payload || {};
      if (!sender || !receiver) return;
      state.messages.forEach((msg) => {
        if (
          (msg.sender?.toLowerCase() === sender?.toLowerCase() &&
           msg.receiver?.toLowerCase() === receiver?.toLowerCase()) ||
          (msg.sender?.toLowerCase() === receiver?.toLowerCase() &&
           msg.receiver?.toLowerCase() === sender?.toLowerCase())
        ) {
          msg.read = true;
        }
      });
    },

    deleteMessageInStore: (state, action) => {
      const { messageId, forEveryone, deleteMediaOnly, deletedBy } = action.payload || {};
      const msgIndex = state.messages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      if (forEveryone) {
        if (deleteMediaOnly) {
          state.messages[msgIndex].mediaUrl = null;
          state.messages[msgIndex].mediaName = null;
          state.messages[msgIndex].mediaSize = null;
          state.messages[msgIndex].messageType = "TEXT";
        } else {
          state.messages[msgIndex].deletedForEveryone = true;
          state.messages[msgIndex].content = "This message was deleted";
          state.messages[msgIndex].mediaUrl = null;
          state.messages[msgIndex].mediaName = null;
          state.messages[msgIndex].mediaSize = null;
          state.messages[msgIndex].messageType = "TEXT";
          state.messages[msgIndex].reactions = null;
        }
      } else {
        // Delete for me
        const currentUsername = state.currentUser;
        if (deletedBy?.toLowerCase() === currentUsername?.toLowerCase()) {
          state.messages.splice(msgIndex, 1);
        }
      }
    },

    updateMessageReactionInStore: (state, action) => {
      const { messageId, reactions } = action.payload || {};
      const msg = state.messages.find((m) => m.id === messageId);
      if (msg) {
        msg.reactions = reactions;
      }
    },

    setReceiver: (state, action) => {
      const newReceiver = action.payload;
      // Reset unread count when selecting a receiver
      if (newReceiver) {
        state.unread[newReceiver] = 0;
      }
      state.receiver = newReceiver;
    },

    setCurrentUser: (state, action) => {
      state.currentUser = action.payload;
    },

    setUnreadCounts: (state, action) => {
      const counts = { ...(action.payload || {}) };
      if (state.receiver) {
        counts[state.receiver] = 0;
      }
      state.unread = counts;
    },

    clearChatState: (state) => {
      state.users = [];
      state.messages = [];
      state.receiver = "";
      state.unread = {};
      state.currentUser = "";
      state.onlineUsers = [];
      state.typingStatus = {};
    },

    setOnlineUsers: (state, action) => {
      if (Array.isArray(action.payload)) {
        state.onlineUsers = action.payload;
      } else if (action.payload && typeof action.payload === "object") {
        state.onlineUsers = Object.keys(action.payload);
      } else {
        state.onlineUsers = [];
      }
    },

    setTypingStatus: (state, action) => {
      const { sender, typing } = action.payload || {};
      if (!sender) return;
      if (typing) {
        state.typingStatus[sender] = true;
      } else {
        delete state.typingStatus[sender];
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.users = action.payload;
        // Merge any server-marked online users
        const onlineFromUsers = action.payload
          .filter((u) => u.online)
          .map((u) => u.username);
        const set = new Set([...state.onlineUsers, ...onlineFromUsers]);
        state.onlineUsers = Array.from(set);
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messages = action.payload || [];
      })
      .addCase(fetchUnreadCounts.fulfilled, (state, action) => {
        state.unread = action.payload || {};
      })
      .addCase(fetchOnlineUsers.fulfilled, (state, action) => {
        if (Array.isArray(action.payload)) {
          state.onlineUsers = action.payload;
        } else if (action.payload && typeof action.payload === "object") {
          state.onlineUsers = Object.keys(action.payload);
        } else {
          state.onlineUsers = [];
        }
      })
      .addCase(markMessagesAsRead.fulfilled, (state, action) => {
        const { sender, receiver } = action.payload || {};
        if (sender && receiver) {
          state.messages.forEach((msg) => {
            if (
              (msg.sender?.toLowerCase() === sender?.toLowerCase() &&
               msg.receiver?.toLowerCase() === receiver?.toLowerCase()) ||
              (msg.sender?.toLowerCase() === receiver?.toLowerCase() &&
               msg.receiver?.toLowerCase() === sender?.toLowerCase())
            ) {
              msg.read = true;
            }
          });
        }
      })
      .addCase(deleteMessageApi.fulfilled, (state, action) => {
        const payload = action.payload;
        if (payload?.type === "MESSAGE_DELETED") {
          const { messageId, forEveryone, deleteMediaOnly, deletedBy } = payload;
          const msgIndex = state.messages.findIndex((m) => m.id === messageId);
          if (msgIndex !== -1) {
            if (forEveryone) {
              if (deleteMediaOnly) {
                state.messages[msgIndex].mediaUrl = null;
                state.messages[msgIndex].mediaName = null;
                state.messages[msgIndex].mediaSize = null;
                state.messages[msgIndex].messageType = "TEXT";
              } else {
                state.messages[msgIndex].deletedForEveryone = true;
                state.messages[msgIndex].content = "This message was deleted";
                state.messages[msgIndex].mediaUrl = null;
                state.messages[msgIndex].mediaName = null;
                state.messages[msgIndex].mediaSize = null;
                state.messages[msgIndex].messageType = "TEXT";
                state.messages[msgIndex].reactions = null;
              }
            } else if (deletedBy?.toLowerCase() === state.currentUser?.toLowerCase()) {
              state.messages.splice(msgIndex, 1);
            }
          }
        }
      })
      .addCase(reactMessageApi.fulfilled, (state, action) => {
        const payload = action.payload;
        if (payload?.type === "MESSAGE_REACTION") {
          const { messageId, reactions } = payload;
          const msg = state.messages.find((m) => m.id === messageId);
          if (msg) {
            msg.reactions = reactions;
          }
        }
      });
  },
});

export const {
  addMessage,
  markMessagesReadInStore,
  deleteMessageInStore,
  updateMessageReactionInStore,
  setReceiver,
  setCurrentUser,
  setUnreadCounts,
  setOnlineUsers,
  setTypingStatus,
  clearChatState,
} = chatSlice.actions;

export default chatSlice.reducer;
