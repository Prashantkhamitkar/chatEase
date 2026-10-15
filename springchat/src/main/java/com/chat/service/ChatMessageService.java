package com.chat.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.chat.model.ChatMessage;
import com.chat.repository.MessageRepository;

@Service
@Transactional
public class ChatMessageService {

    @Autowired
    private MessageRepository messageRepository;

    public ChatMessage saveMessage(ChatMessage message) {
        return messageRepository.save(message);
    }

    public List<ChatMessage> getChatHistory(String user1, String user2) {
        return messageRepository.findChatHistory(user1, user2);
    }

    public List<ChatMessage> getUnreadMessages(String receiver) {
        return messageRepository.findByReceiverAndReadFalse(receiver);
    }

    public void markMessagesAsRead(String sender, String receiver) {
        messageRepository.markMessagesAsRead(sender, receiver);
    }

    public List<ChatMessage> findBySenderAndReceiver(String sender, String receiver) {
        return messageRepository.findChatHistory(sender, receiver);
    }

    // Get unread counts per sender
    public Map<String, Integer> getUnreadCountsPerSender(String receiver) {
        List<Object[]> results = messageRepository.findUnreadCountsPerSender(receiver);
        Map<String, Integer> unreadCounts = new HashMap<>();
        
        for (Object[] result : results) {
            String sender = (String) result[0];
            Long count = (Long) result[1];
            unreadCounts.put(sender, count.intValue());
        }
        
        return unreadCounts;
    }

    // Get total unread count for a user
    public int getTotalUnreadCount(String receiver) {
        return messageRepository.countByReceiverAndReadFalse(receiver);
    }

    // Get all users who have sent messages to the current user
    public List<String> getChatUsers(String username) {
        List<ChatMessage> receivedMessages = messageRepository.findByReceiver(username);
        Map<String, String> uniqueSenders = new HashMap<>();
        
        for (ChatMessage message : receivedMessages) {
            uniqueSenders.put(message.getSender(), message.getSender());
        }
        
        return List.copyOf(uniqueSenders.keySet());
    }

    // Get all users who have interacted with current user (both sent and received)
    public List<String> getAllChatUsers(String username) {
        // Get all messages where user is either sender or receiver
        List<ChatMessage> sentMessages = messageRepository.findByReceiver(username);
        List<ChatMessage> receivedMessages = messageRepository.findChatHistory(username, "%");
        
        Map<String, String> allUsers = new HashMap<>();
        
        // Add users who sent messages to current user
        for (ChatMessage message : sentMessages) {
            allUsers.put(message.getSender(), message.getSender());
        }
        
        // Add users who received messages from current user
        for (ChatMessage message : receivedMessages) {
            if (message.getSender().equals(username)) {
                allUsers.put(message.getReceiver(), message.getReceiver());
            } else {
                allUsers.put(message.getSender(), message.getSender());
            }
        }
        
        return List.copyOf(allUsers.keySet());
    }

    // Check if there are any unread messages from a specific sender
    public boolean hasUnreadMessagesFrom(String receiver, String sender) {
        List<ChatMessage> unreadMessages = messageRepository.findByReceiverAndReadFalse(receiver);
        return unreadMessages.stream()
                .anyMatch(msg -> msg.getSender().equals(sender));
    }

    // Get the count of unread messages from a specific sender
    public int getUnreadCountFromSender(String receiver, String sender) {
        List<ChatMessage> unreadMessages = messageRepository.findByReceiverAndReadFalse(receiver);
        return (int) unreadMessages.stream()
                .filter(msg -> msg.getSender().equals(sender))
                .count();
    }

    public java.util.Optional<ChatMessage> getMessageById(Long id) {
        return messageRepository.findById(id);
    }

    public ChatMessage deleteMessage(Long messageId, String username, boolean forEveryone, boolean deleteMediaOnly) {
        ChatMessage message = messageRepository.findById(messageId).orElse(null);
        if (message == null) return null;

        if (deleteMediaOnly) {
            // Delete physical media file from disk
            deletePhysicalMedia(message.getMediaUrl());
            message.setMediaUrl(null);
            message.setMediaName(null);
            message.setMediaSize(null);
            message.setMessageType("TEXT");
            return messageRepository.save(message);
        }

        if (forEveryone) {
            // Sender is authorized to delete for everyone
            deletePhysicalMedia(message.getMediaUrl());
            message.setDeletedForEveryone(true);
            message.setContent("This message was deleted");
            message.setMediaUrl(null);
            message.setMediaName(null);
            message.setMediaSize(null);
            message.setMessageType("TEXT");
            message.setReactions(null);
            return messageRepository.save(message);
        } else {
            // Delete for me
            if (username != null && username.equalsIgnoreCase(message.getSender())) {
                message.setDeletedForSender(true);
            }
            if (username != null && username.equalsIgnoreCase(message.getReceiver())) {
                message.setDeletedForReceiver(true);
            }
            return messageRepository.save(message);
        }
    }

    public ChatMessage addOrToggleReaction(Long messageId, String username, String emoji) {
        ChatMessage message = messageRepository.findById(messageId).orElse(null);
        if (message == null) return null;
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            Map<String, String> reactionsMap = new HashMap<>();
            if (message.getReactions() != null && !message.getReactions().isBlank()) {
                reactionsMap = mapper.readValue(message.getReactions(), new com.fasterxml.jackson.core.type.TypeReference<Map<String, String>>() {});
            }
            if (emoji == null || emoji.isBlank() || emoji.equals(reactionsMap.get(username))) {
                reactionsMap.remove(username);
            } else {
                reactionsMap.put(username, emoji);
            }
            message.setReactions(reactionsMap.isEmpty() ? null : mapper.writeValueAsString(reactionsMap));
            return messageRepository.save(message);
        } catch (Exception e) {
            System.err.println("Error updating reaction: " + e.getMessage());
            return message;
        }
    }

    private void deletePhysicalMedia(String mediaUrl) {
        if (mediaUrl == null || mediaUrl.isBlank()) return;
        try {
            String fileName = mediaUrl;
            int lastSlash = mediaUrl.lastIndexOf('/');
            if (lastSlash != -1) {
                fileName = mediaUrl.substring(lastSlash + 1);
            }
            java.nio.file.Path filePath = java.nio.file.Paths.get("uploads").resolve(fileName).normalize();
            java.nio.file.Files.deleteIfExists(filePath);
        } catch (Exception e) {
            System.err.println("Failed to delete media file: " + e.getMessage());
        }
    }
}