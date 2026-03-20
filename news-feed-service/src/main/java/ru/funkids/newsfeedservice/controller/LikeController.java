package ru.funkids.newsfeedservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ru.funkids.newsfeedservice.service.LikeService;

import java.util.UUID;

@RestController
@RequestMapping("/api/feed/posts/{postId}/likes")
@RequiredArgsConstructor
public class LikeController {

    private final LikeService likeService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> like(@PathVariable UUID postId) {
        likeService.likePost(postId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> unlike(@PathVariable UUID postId) {
        likeService.unlikePost(postId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/count")
    public ResponseEntity<Long> getLikesCount(@PathVariable UUID postId) {
        return ResponseEntity.ok(likeService.getLikesCount(postId));
    }
}