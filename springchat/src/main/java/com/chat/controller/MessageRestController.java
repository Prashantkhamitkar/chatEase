package com.chat.controller;

import com.chat.model.ChatMessage;
import com.chat.service.ChatMessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class MessageRestController {

    @Autowired
    private ChatMessageService chatMessageService;

    @Autowired
    private org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @GetMapping("/history/{user1}/{user2}")
    public List<ChatMessage> getChatHistory(@PathVariable String user1, @PathVariable String user2) {
        return chatMessageService.getChatHistory(user1, user2);
    }

    @GetMapping("/unread-counts/{username}")
    public ResponseEntity<Map<String, Integer>> getUnreadCounts(@PathVariable String username) {
        Map<String, Integer> unreadCounts = chatMessageService.getUnreadCountsPerSender(username);
        return ResponseEntity.ok(unreadCounts);
    }

    // Get total unread count for a user
    @GetMapping("/unread-total/{username}")
    public ResponseEntity<Map<String, Object>> getTotalUnreadCount(@PathVariable String username) {
        int totalUnread = chatMessageService.getTotalUnreadCount(username);
        Map<String, Object> response = new HashMap<>();
        response.put("totalUnread", totalUnread);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public List<ChatMessage> getMessages(
            @RequestParam String sender,
            @RequestParam String receiver) {

        return chatMessageService.findBySenderAndReceiver(sender, receiver);
    }

    @PostMapping("/mark-read")
    public ResponseEntity<Map<String, String>> markMessagesAsRead(
            @RequestParam String sender,
            @RequestParam String receiver) {
        chatMessageService.markMessagesAsRead(sender, receiver);

        // Broadcast read receipt so sender gets double blue mark
        try {
            Map<String, Object> readReceipt = new HashMap<>();
            readReceipt.put("type", "READ_RECEIPT");
            readReceipt.put("message", "Messages read by " + receiver);
            readReceipt.put("sender", sender);
            readReceipt.put("receiver", receiver);

            messagingTemplate.convertAndSendToUser(
                sender,
                "/queue/read-receipts",
                readReceipt
            );
        } catch (Exception ignored) {}

        Map<String, String> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Messages marked as read");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteMessage(
            @PathVariable Long id,
            @RequestParam(required = false) String username,
            @RequestParam(defaultValue = "false") boolean forEveryone,
            @RequestParam(defaultValue = "false") boolean deleteMediaOnly) {
        ChatMessage updated = chatMessageService.deleteMessage(id, username, forEveryone, deleteMediaOnly);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> deleteEvent = new HashMap<>();
        deleteEvent.put("type", "MESSAGE_DELETED");
        deleteEvent.put("messageId", id);
        deleteEvent.put("forEveryone", forEveryone);
        deleteEvent.put("deleteMediaOnly", deleteMediaOnly);
        deleteEvent.put("deletedBy", username);
        deleteEvent.put("updatedMessage", updated);

        try {
            messagingTemplate.convertAndSendToUser(updated.getReceiver(), "/queue/messages/delete", deleteEvent);
            messagingTemplate.convertAndSendToUser(updated.getSender(), "/queue/messages/delete", deleteEvent);
        } catch (Exception ignored) {}

        return ResponseEntity.ok(deleteEvent);
    }

    @PostMapping("/{id}/reaction")
    public ResponseEntity<Map<String, Object>> reactMessage(
            @PathVariable Long id,
            @RequestParam String username,
            @RequestParam(required = false) String emoji) {
        ChatMessage updated = chatMessageService.addOrToggleReaction(id, username, emoji);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> reactionEvent = new HashMap<>();
        reactionEvent.put("type", "MESSAGE_REACTION");
        reactionEvent.put("messageId", id);
        reactionEvent.put("reactions", updated.getReactions());

        try {
            messagingTemplate.convertAndSendToUser(updated.getReceiver(), "/queue/messages/reaction", reactionEvent);
            messagingTemplate.convertAndSendToUser(updated.getSender(), "/queue/messages/reaction", reactionEvent);
        } catch (Exception ignored) {}

        return ResponseEntity.ok(reactionEvent);
    }

    @GetMapping("/has-unread")
    public ResponseEntity<Map<String, Boolean>> hasUnreadFromSender(
            @RequestParam String receiver,
            @RequestParam String sender) {
        boolean hasUnread = chatMessageService.hasUnreadMessagesFrom(receiver, sender);
        Map<String, Boolean> response = new HashMap<>();
        response.put("hasUnread", hasUnread);
        return ResponseEntity.ok(response);
    }
}
