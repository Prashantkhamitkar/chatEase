package com.chat.controller;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/media")
public class MediaController {

    private final Path uploadDir = Paths.get("uploads").toAbsolutePath().normalize();

    public MediaController() {
        try {
            Files.createDirectories(uploadDir);
        } catch (IOException e) {
            throw new RuntimeException("Could not create uploads directory", e);
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "File cannot be empty");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            String originalFileName = file.getOriginalFilename();
            if (originalFileName == null || originalFileName.isBlank()) {
                originalFileName = "file_" + System.currentTimeMillis();
            }

            // Sanitize filename and create unique stored name
            String safeFileName = originalFileName.replaceAll("[^a-zA-Z0-9._-]", "_");
            String storedFileName = UUID.randomUUID().toString() + "_" + safeFileName;
            Path targetPath = uploadDir.resolve(storedFileName);

            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            String fileType = determineMessageType(originalFileName, file.getContentType());

            Map<String, Object> response = new HashMap<>();
            response.put("url", "/api/media/download/" + storedFileName);
            response.put("fileName", originalFileName);
            response.put("fileType", fileType);
            response.put("size", file.getSize());

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to store file: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    @GetMapping("/download/{fileName:.+}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String fileName) {
        try {
            Path filePath = uploadDir.resolve(fileName).normalize();
            if (!filePath.startsWith(uploadDir)) {
                return ResponseEntity.badRequest().build();
            }

            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }

            String contentType = null;
            try {
                contentType = Files.probeContentType(filePath);
            } catch (IOException ignored) {}

            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    private String determineMessageType(String fileName, String mimeType) {
        if (mimeType != null) {
            if (mimeType.startsWith("image/")) return "IMAGE";
            if (mimeType.startsWith("video/")) return "VIDEO";
            if (mimeType.startsWith("audio/")) return "AUDIO";
        }

        String lower = fileName.toLowerCase();
        if (lower.matches(".*\\.(jpg|jpeg|png|gif|webp|bmp|svg)$")) return "IMAGE";
        if (lower.matches(".*\\.(mp4|webm|ogg|mov|mkv|avi)$")) return "VIDEO";
        if (lower.matches(".*\\.(mp3|wav|ogg|m4a|aac|flac)$")) return "AUDIO";

        return "DOCUMENT";
    }
}
