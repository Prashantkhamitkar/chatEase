package com.chat.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.chat.model.ChatMessage;

public interface MessageRepository extends JpaRepository<ChatMessage, Long> {
	List<ChatMessage> findByReceiver(String receiver);

	@Query("SELECT m FROM ChatMessage m WHERE "
			+ "((m.sender = :user1 AND m.receiver = :user2 AND m.deletedForSender = false) "
			+ " OR (m.sender = :user2 AND m.receiver = :user1 AND m.deletedForReceiver = false)) "
			+ "ORDER BY m.timestamp ASC")
	List<ChatMessage> findChatHistory(@Param("user1") String user1, @Param("user2") String user2);

	@Query("SELECT m FROM ChatMessage m WHERE m.receiver = :receiver AND m.read = false AND m.deletedForReceiver = false")
	List<ChatMessage> findByReceiverAndReadFalse(@Param("receiver") String receiver);

	@Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.receiver = :receiver AND m.read = false AND m.deletedForReceiver = false")
	int countByReceiverAndReadFalse(@Param("receiver") String receiver);

	// Get unread counts per sender for a specific receiver
	@Query("SELECT m.sender, COUNT(m) FROM ChatMessage m WHERE m.receiver = :receiver AND m.read = false AND m.deletedForReceiver = false GROUP BY m.sender")
	List<Object[]> findUnreadCountsPerSender(@Param("receiver") String receiver);


	@Modifying
	@Query("UPDATE ChatMessage m SET m.read = true WHERE m.sender = :sender AND m.receiver = :receiver AND m.read = false")
	void markMessagesAsRead(@Param("sender") String sender, @Param("receiver") String receiver);

}
