package ru.funkids.newsfeedservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.newsfeedservice.config.RedisConfig;
import ru.funkids.newsfeedservice.entity.Like;
import ru.funkids.newsfeedservice.entity.Post;
import ru.funkids.newsfeedservice.exception.BadRequestException;
import ru.funkids.newsfeedservice.exception.ResourceNotFoundException;
import ru.funkids.newsfeedservice.repository.LikeRepository;
import ru.funkids.newsfeedservice.repository.PostRepository;
import ru.funkids.newsfeedservice.security.SecurityUtils;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class LikeService {

    private final LikeRepository likeRepository;
    private final PostRepository postRepository;

    @CacheEvict(value = {RedisConfig.CacheNames.FEED, RedisConfig.CacheNames.POST}, allEntries = true)
    public void likePost(UUID postId) {
        UUID   currentUserId = SecurityUtils.getCurrentUserId();
        String userRole      = SecurityUtils.getCurrentUserRole();

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + postId));

        if (likeRepository.existsByPostIdAndUserId(postId, currentUserId)) {
            throw new BadRequestException("You have already liked this post");
        }

        likeRepository.save(Like.builder()
                .post(post)
                .userId(currentUserId)
                .userRole(userRole)
                .build());

        log.info("Post {} liked by userId={}", postId, currentUserId);
    }

    @CacheEvict(value = {RedisConfig.CacheNames.FEED, RedisConfig.CacheNames.POST}, allEntries = true)
    public void unlikePost(UUID postId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();

        if (!likeRepository.existsByPostIdAndUserId(postId, currentUserId)) {
            throw new BadRequestException("You have not liked this post");
        }

        likeRepository.deleteByPostIdAndUserId(postId, currentUserId);
        log.info("Post {} unliked by userId={}", postId, currentUserId);
    }

    @Transactional(readOnly = true)
    public long getLikesCount(UUID postId) {
        return likeRepository.countByPostId(postId);
    }
}