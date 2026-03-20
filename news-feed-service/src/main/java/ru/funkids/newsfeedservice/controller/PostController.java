package ru.funkids.newsfeedservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ru.funkids.newsfeedservice.dto.request.CreatePostRequest;
import ru.funkids.newsfeedservice.dto.request.UpdatePostRequest;
import ru.funkids.newsfeedservice.dto.response.PostResponse;
import ru.funkids.newsfeedservice.service.PostService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/feed/posts")
@RequiredArgsConstructor
@Slf4j
public class PostController {

    private final PostService postService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('COUNSELOR', 'ADMIN')")
    public ResponseEntity<PostResponse> createPost(
            @RequestPart("post") @Valid CreatePostRequest request,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @RequestPart(value = "videos", required = false) List<MultipartFile> videos) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(postService.createPost(request, images, videos));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PostResponse> getPost(@PathVariable UUID id) {
        return ResponseEntity.ok(postService.getPost(id));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('COUNSELOR', 'ADMIN')")
    public ResponseEntity<PostResponse> updatePost(
            @PathVariable UUID id,
            @RequestPart("post") @Valid UpdatePostRequest request,
            @RequestPart(value = "newImages", required = false) List<MultipartFile> newImages,
            @RequestPart(value = "newVideos", required = false) List<MultipartFile> newVideos) {

        return ResponseEntity.ok(postService.updatePost(id, request, newImages, newVideos));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('COUNSELOR', 'ADMIN')")
    public ResponseEntity<Void> deletePost(@PathVariable UUID id) {
        postService.deletePost(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/pin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PostResponse> togglePin(
            @PathVariable UUID id,
            @RequestParam boolean pin) {
        return ResponseEntity.ok(postService.togglePin(id, pin));
    }
}