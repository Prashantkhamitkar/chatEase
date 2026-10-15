package com.chat.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.chat.model.User;

public interface UserRepository extends JpaRepository<User, Long> {
	   Optional<User> findByUsername(String username);
	    Optional<User> findByEmail(String email);
	    Optional<User> findByProviderId(String providerId);
	    boolean existsByUsername(String username);
	    boolean existsByEmail(String email);
}
