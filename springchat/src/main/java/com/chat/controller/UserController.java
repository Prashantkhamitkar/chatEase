package com.chat.controller;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.chat.model.User;
import com.chat.repository.UserRepository;
import com.chat.service.UserPresenceService;

@RestController
@RequestMapping("/api/users")
public class UserController {

	private final UserRepository userRepository;

	@Autowired
	private UserPresenceService presenceService;

	public UserController(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	@PostMapping("/login")
	public User login(@RequestBody Map<String, String> payload) {
		String username = payload.get("username");
		return userRepository.findByUsername(username).orElseGet(() -> userRepository.save(new User(null, username)));
	}

	@GetMapping
	public List<User> getAllUsers() {
		List<User> users = userRepository.findAll();
		if (presenceService != null) {
			for (User u : users) {
				u.setOnline(presenceService.isUserOnline(u.getUsername()));
			}
		}
		return users;
	}

	@GetMapping("/online")
	public Set<String> getOnlineUsers() {
		return presenceService != null ? presenceService.getOnlineUsers() : Set.of();
	}
}
