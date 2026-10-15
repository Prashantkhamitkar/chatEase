package com.chat.model;

import java.time.LocalDateTime;
import jakarta.persistence.*;

@Entity
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String sender;
    private String receiver;
    
    @Column(length = 2000)
    private String content;

    private LocalDateTime timestamp;
    
    @Column(name = "is_read")
    private boolean read = false;

    private String messageType = "TEXT"; // TEXT, IMAGE, VIDEO, AUDIO, DOCUMENT

    @Column(length = 1000)
    private String mediaUrl;

    private String mediaName;

    private Long mediaSize;

    @Column(name = "deleted_for_everyone")
    private boolean deletedForEveryone = false;

    @Column(name = "deleted_for_sender")
    private boolean deletedForSender = false;

    @Column(name = "deleted_for_receiver")
    private boolean deletedForReceiver = false;

    @Column(length = 1000)
    private String reactions;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
        if (messageType == null || messageType.isBlank()) {
            messageType = "TEXT";
        }
    }

    public ChatMessage() {}

    public ChatMessage(Long id, String sender, String content, String receiver, LocalDateTime timestamp, boolean read) {
        this.id = id;
        this.sender = sender;
        this.content = content;
        this.receiver = receiver;
        this.timestamp = timestamp;
        this.read = read;
        this.messageType = "TEXT";
    }

    public ChatMessage(Long id, String sender, String content, String receiver, LocalDateTime timestamp, boolean read,
                       String messageType, String mediaUrl, String mediaName, Long mediaSize) {
        this.id = id;
        this.sender = sender;
        this.content = content;
        this.receiver = receiver;
        this.timestamp = timestamp;
        this.read = read;
        this.messageType = messageType != null ? messageType : "TEXT";
        this.mediaUrl = mediaUrl;
        this.mediaName = mediaName;
        this.mediaSize = mediaSize;
    }

    // ✅ Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }

    public String getReceiver() { return receiver; }
    public void setReceiver(String receiver) { this.receiver = receiver; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }

    public String getMessageType() { return messageType; }
    public void setMessageType(String messageType) { this.messageType = messageType; }

    public String getMediaUrl() { return mediaUrl; }
    public void setMediaUrl(String mediaUrl) { this.mediaUrl = mediaUrl; }

    public String getMediaName() { return mediaName; }
    public void setMediaName(String mediaName) { this.mediaName = mediaName; }

    public Long getMediaSize() { return mediaSize; }
    public void setMediaSize(Long mediaSize) { this.mediaSize = mediaSize; }

    public boolean isDeletedForEveryone() { return deletedForEveryone; }
    public void setDeletedForEveryone(boolean deletedForEveryone) { this.deletedForEveryone = deletedForEveryone; }

    public boolean isDeletedForSender() { return deletedForSender; }
    public void setDeletedForSender(boolean deletedForSender) { this.deletedForSender = deletedForSender; }

    public boolean isDeletedForReceiver() { return deletedForReceiver; }
    public void setDeletedForReceiver(boolean deletedForReceiver) { this.deletedForReceiver = deletedForReceiver; }

    public String getReactions() { return reactions; }
    public void setReactions(String reactions) { this.reactions = reactions; }
}
