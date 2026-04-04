package ru.funkids.newsfeedservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ru.funkids.newsfeedservice.dto.response.PageResponse;
import ru.funkids.newsfeedservice.dto.response.PostResponse;
import ru.funkids.newsfeedservice.service.FeedService;

import java.util.UUID;

@RestController
@RequestMapping("/api/feed")
@RequiredArgsConstructor
@Slf4j
public class FeedController {

    private final FeedService feedService;

    @GetMapping("/my-feed")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PageResponse<PostResponse>> getMyFeed(
            @RequestParam(defaultValue = "all") String filter,
            @RequestParam(required = false) UUID campId,
            @PageableDefault(size = 20) Pageable pageable) {

        return ResponseEntity.ok(feedService.getMyFeed(filter, campId, pageable));
    }

    @GetMapping("/camps/{campId}/archive")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR', 'PARENT')")
    public ResponseEntity<PageResponse<PostResponse>> getCampArchive(
            @PathVariable UUID campId,
            @PageableDefault(size = 30) Pageable pageable) {

        return ResponseEntity.ok(feedService.getCampArchive(campId, pageable));
    }

    @GetMapping("/camps/{campId}/feed")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PageResponse<PostResponse>> getCampFeed(
            @PathVariable UUID campId,
            @PageableDefault(size = 20) Pageable pageable) {

        return ResponseEntity.ok(feedService.getCampFeed(campId, pageable));
    }

    @GetMapping("/camps/{campId}/moderation/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'COUNSELOR')")
    public ResponseEntity<PageResponse<PostResponse>> getPendingModerationFeed(
            @PathVariable UUID campId,
            @PageableDefault(size = 20) Pageable pageable) {

        return ResponseEntity.ok(feedService.getPendingModerationFeed(campId, pageable));
    }
}
