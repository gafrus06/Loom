package ru.funkids.newsfeedservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import ru.funkids.newsfeedservice.client.CampServiceClient;
import ru.funkids.newsfeedservice.client.FileStorageClient;
import ru.funkids.newsfeedservice.client.UserServiceClient;
import ru.funkids.newsfeedservice.config.RedisConfig;
import ru.funkids.newsfeedservice.dto.client.*;
import ru.funkids.newsfeedservice.dto.client.DownloadUrlsRequest;
import java.util.Objects;
import ru.funkids.newsfeedservice.dto.request.CreatePostRequest;
import ru.funkids.newsfeedservice.dto.request.UpdatePostRequest;
import ru.funkids.newsfeedservice.dto.response.PageResponse;
import ru.funkids.newsfeedservice.dto.response.PostResponse;
import ru.funkids.newsfeedservice.entity.Post;
import ru.funkids.newsfeedservice.entity.PostMedia;
import ru.funkids.newsfeedservice.exception.ForbiddenException;
import ru.funkids.newsfeedservice.exception.ResourceNotFoundException;
import ru.funkids.newsfeedservice.mapper.PostMapper;
import ru.funkids.newsfeedservice.repository.LikeRepository;
import ru.funkids.newsfeedservice.repository.PostRepository;
import ru.funkids.newsfeedservice.service.VideoUtils;
import ru.funkids.newsfeedservice.security.SecurityUtils;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PostService {

    private final PostRepository    postRepository;
    private final LikeRepository    likeRepository;
    private final CampServiceClient campServiceClient;
    private final UserServiceClient userServiceClient;
    private final FileStorageClient fileStorageClient;
    private final PostMapper        postMapper;

    // ─── СОЗДАНИЕ ────────────────────────────────────────────────────────────

    @CacheEvict(value = {RedisConfig.CacheNames.FEED, RedisConfig.CacheNames.POST}, allEntries = true)
    public PostResponse createPost(CreatePostRequest request, List<MultipartFile> images, List<MultipartFile> videos) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        String userRole    = SecurityUtils.getCurrentUserRole();

        if (!isAdminOrCounselor(userRole)) {
            throw new ForbiddenException("Only counselors and admins can create posts");
        }

        // Проверяем существование лагеря через Eureka (по имени сервиса, не IP)
        try {
            campServiceClient.getCamp(request.getCampId());
        } catch (Exception e) {
            throw new ResourceNotFoundException("Camp not found: " + request.getCampId());
        }

        Post post = postMapper.toEntity(request);
        post.setAuthorId(currentUserId);
        Post savedPost = postRepository.save(post);

        if (images != null && !images.isEmpty()) {
            attachMedia(savedPost, images, "IMAGE");
        }
        if (videos != null && !videos.isEmpty()) {
            attachMedia(savedPost, videos, "VIDEO");
        }

        Post finalPost = postRepository.save(savedPost);
        log.info("Post created id={} by userId={}", finalPost.getId(), currentUserId);

        return buildSinglePostResponse(finalPost, currentUserId);
    }

    // ─── ОБНОВЛЕНИЕ ──────────────────────────────────────────────────────────

    @CacheEvict(value = {RedisConfig.CacheNames.FEED, RedisConfig.CacheNames.POST}, allEntries = true)
    public PostResponse updatePost(UUID postId, UpdatePostRequest request, List<MultipartFile> newImages, List<MultipartFile> newVideos) {
        UUID   currentUserId = SecurityUtils.getCurrentUserId();
        String userRole      = SecurityUtils.getCurrentUserRole();

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + postId));

        if (!post.getAuthorId().equals(currentUserId) && !isAdmin(userRole)) {
            throw new ForbiddenException("You can only edit your own posts");
        }

        postMapper.updateEntity(post, request);

        if (request.getMediaIdsToDelete() != null && !request.getMediaIdsToDelete().isEmpty()) {
            post.getMedia().removeIf(m -> request.getMediaIdsToDelete().contains(m.getId()));
        }

        if (newImages != null && !newImages.isEmpty()) {
            attachMedia(post, newImages, "IMAGE");
        }
        if (newVideos != null && !newVideos.isEmpty()) {
            attachMedia(post, newVideos, "VIDEO");
        }

        Post updated = postRepository.save(post);
        log.info("Post updated id={}", postId);

        return buildSinglePostResponse(updated, currentUserId);
    }

    // ─── УДАЛЕНИЕ ────────────────────────────────────────────────────────────

    @CacheEvict(value = {RedisConfig.CacheNames.FEED, RedisConfig.CacheNames.POST}, allEntries = true)
    public void deletePost(UUID postId) {
        UUID   currentUserId = SecurityUtils.getCurrentUserId();
        String userRole      = SecurityUtils.getCurrentUserRole();

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + postId));

        if (!post.getAuthorId().equals(currentUserId) && !isAdmin(userRole)) {
            throw new ForbiddenException("You can only delete your own posts");
        }

        likeRepository.deleteByPostId(postId);
        postRepository.delete(post);
        log.info("Post deleted id={}", postId);
    }

    // ─── ЧТЕНИЕ ОДНОГО ПОСТА ─────────────────────────────────────────────────

    @Cacheable(value = RedisConfig.CacheNames.POST, key = "#postId")
    @Transactional(readOnly = true)
    public PostResponse getPost(UUID postId) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();

        // EntityGraph — media загружается одним JOIN, не N+1
        Post post = postRepository.findWithMediaById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + postId));

        return buildSinglePostResponse(post, currentUserId);
    }

    // ─── ЗАКРЕПЛЕНИЕ ─────────────────────────────────────────────────────────

    @CacheEvict(value = {RedisConfig.CacheNames.FEED, RedisConfig.CacheNames.POST}, allEntries = true)
    public PostResponse togglePin(UUID postId, boolean pin) {
        if (!isAdmin(SecurityUtils.getCurrentUserRole())) {
            throw new ForbiddenException("Only admins can pin posts");
        }

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + postId));

        post.setPinned(pin);
        post.setPinnedOrder(pin ? (int) System.currentTimeMillis() : null);
        Post updated = postRepository.save(post);

        return buildSinglePostResponse(updated, SecurityUtils.getCurrentUserId());
    }

    // ─── BATCH-ПОСТРОЕНИЕ СТРАНИЦЫ ОТВЕТОВ (без N+1) ────────────────────────

    /**
     * Принимает страницу постов и строит PageResponse<PostResponse> за
     * константное число запросов независимо от размера страницы.
     *
     * Запросы:
     *  1. Уже выполненный SELECT posts (+ media через @BatchSize)
     *  2. SELECT likes count   WHERE post_id IN (...)   — один запрос
     *  3. SELECT liked_post_ids WHERE post_id IN (...)  — один запрос
     *  4. Feign: getUsers      для уникальных authorId  — один запрос (или N по авторам, но авторов мало)
     *  5. Feign: getCamps      для уникальных campId    — один запрос
     *  6. Feign: getDetachments для уникальных detachmentId — один запрос
     *
     * Итого: O(1) запросов к БД + O(уникальные_сущности) Feign-запросов.
     */
    @Transactional(readOnly = true)
    public PageResponse<PostResponse> buildPageResponse(Page<Post> posts, UUID currentUserId) {
        if (posts.isEmpty()) {
            return new PageResponse<>(posts.map(p -> null)); // пустая страница
        }

        List<Post> content = posts.getContent();
        Set<UUID> postIds = content.stream().map(Post::getId).collect(Collectors.toSet());

        // 1. Batch-счётчики лайков
        Map<UUID, Long> likesCountMap = likeRepository.countMapByPostIds(postIds);

        // 2. Batch: какие посты лайкнул текущий пользователь
        Set<UUID> likedByUser = currentUserId != null
                ? likeRepository.findLikedPostIds(postIds, currentUserId)
                : Set.of();

        // 3. Уникальные authorId → один или несколько Feign-вызовов (мало уникальных авторов)
        Set<UUID> authorIds = content.stream().map(Post::getAuthorId).collect(Collectors.toSet());
        Map<UUID, UserProfileDto> authorMap = loadAuthors(authorIds);

        // 4. Уникальные campId
        Set<UUID> campIds = content.stream().map(Post::getCampId).collect(Collectors.toSet());
        Map<UUID, CampDto> campMap = loadCamps(campIds);

        // 5. Уникальные detachmentId (только не-null)
        Set<UUID> detachmentIds = content.stream()
                .map(Post::getDetachmentId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<UUID, DetachmentDto> detachmentMap = loadDetachments(detachmentIds);

        Page<PostResponse> responsePage = posts.map(post ->
                postMapper.toResponse(post, authorMap, campMap, detachmentMap, likesCountMap, likedByUser));

        return new PageResponse<>(responsePage);
    }

    // ─── ЗАГРУЗКА ВНЕШНИХ ДАННЫХ ЧЕРЕЗ EUREKA/FEIGN ───────────────────────────

    private Map<UUID, UserProfileDto> loadAuthors(Set<UUID> authorIds) {
        Map<UUID, UserProfileDto> result = new HashMap<>();
        for (UUID id : authorIds) {
            try {
                result.put(id, userServiceClient.getUserProfile(id));
            } catch (Exception e) {
                log.warn("Failed to load author id={}: {}", id, e.getMessage());
            }
        }
        // Подгружаем presigned URL аватарок одним batch-запросом к file-storage-service.
        // Собираем только ненулевые avatarFileId, запрашиваем все URL за раз.
        Set<UUID> avatarFileIds = result.values().stream()
                .map(UserProfileDto::getAvatarFileId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (!avatarFileIds.isEmpty()) {
            try {
                DownloadUrlsRequest req = new DownloadUrlsRequest();
                req.setFileIds(new java.util.ArrayList<>(avatarFileIds));
                Map<UUID, String> avatarUrls = fileStorageClient.getDownloadUrls(req).getUrls();
                result.values().forEach(profile -> {
                    if (profile.getAvatarFileId() != null) {
                        String url = avatarUrls.get(profile.getAvatarFileId());
                        if (url != null) profile.setAvatarUrl(url);
                    }
                });
            } catch (Exception e) {
                log.warn("Failed to load avatar URLs: {}", e.getMessage());
            }
        }
        return result;
    }

    private Map<UUID, CampDto> loadCamps(Set<UUID> campIds) {
        Map<UUID, CampDto> result = new HashMap<>();
        for (UUID id : campIds) {
            try {
                result.put(id, campServiceClient.getCamp(id));
            } catch (Exception e) {
                log.warn("Failed to load camp id={}: {}", id, e.getMessage());
            }
        }
        return result;
    }

    private Map<UUID, DetachmentDto> loadDetachments(Set<UUID> detachmentIds) {
        Map<UUID, DetachmentDto> result = new HashMap<>();
        for (UUID id : detachmentIds) {
            try {
                result.put(id, campServiceClient.getDetachment(id));
            } catch (Exception e) {
                log.warn("Failed to load detachment id={}: {}", id, e.getMessage());
            }
        }
        return result;
    }

    // ─── ВСПОМОГАТЕЛЬНЫЙ МЕТОД ДЛЯ ОДНОГО ПОСТА ─────────────────────────────

    private PostResponse buildSinglePostResponse(Post post, UUID currentUserId) {
        Set<UUID> postIds = Set.of(post.getId());

        Map<UUID, Long> likesCountMap = likeRepository.countMapByPostIds(postIds);
        Set<UUID> likedByUser = currentUserId != null
                ? likeRepository.findLikedPostIds(postIds, currentUserId)
                : Set.of();

        Map<UUID, UserProfileDto> authorMap    = loadAuthors(Set.of(post.getAuthorId()));
        Map<UUID, CampDto>        campMap      = loadCamps(Set.of(post.getCampId()));
        Map<UUID, DetachmentDto>  detachMap    = post.getDetachmentId() != null
                ? loadDetachments(Set.of(post.getDetachmentId())) : Map.of();

        return postMapper.toResponse(post, authorMap, campMap, detachMap, likesCountMap, likedByUser);
    }

    // ─── ЗАГРУЗКА МЕДИА В S3 ─────────────────────────────────────────────────

    private void attachMedia(Post post, List<MultipartFile> files, String mediaType) {
        AtomicInteger order = new AtomicInteger(post.getMedia().size());
        for (MultipartFile file : files) {
            try {
                UploadUrlResponse uploadResp = fileStorageClient.generateUploadUrl(
                        "news-feed", "post",
                        file.getOriginalFilename(), file.getContentType());

                uploadFileToUrl(uploadResp.getUploadUrl(), file, uploadResp.getMethod());

                fileStorageClient.confirmUpload(uploadResp.getFileId(), post.getId().toString());

                // Для видео определяем длительность до загрузки в S3
                Long durationSec = "VIDEO".equals(mediaType)
                        ? VideoUtils.getDurationSeconds(file)
                        : null;

                post.addMedia(PostMedia.builder()
                        .mediaType(mediaType)
                        .sortOrder(order.getAndIncrement())
                        .fileId(uploadResp.getFileId())
                        .durationSec(durationSec)
                        .build());

            } catch (Exception e) {
                log.error("Failed to upload {} {}: {}", mediaType, file.getOriginalFilename(), e.getMessage(), e);
                throw new RuntimeException("Failed to upload " + mediaType + ": " + e.getMessage(), e);
            }
        }
    }

    private void uploadFileToUrl(String uploadUrl, MultipartFile file, String method) throws IOException {
        URL url = new URL(uploadUrl);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        try {
            conn.setDoOutput(true);
            conn.setRequestMethod(method != null ? method : "PUT");
            conn.setRequestProperty("Content-Type", file.getContentType());
            conn.setInstanceFollowRedirects(false);
            conn.setUseCaches(false);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(file.getBytes());
            }

            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) {
                String body = readStream(conn.getErrorStream());
                throw new RuntimeException("S3 upload failed [" + code + "]: " + body);
            }
        } finally {
            conn.disconnect();
        }
    }

    private String readStream(InputStream stream) {
        if (stream == null) return "no body";
        try { return new String(stream.readAllBytes(), StandardCharsets.UTF_8); }
        catch (IOException e) { return "unreadable"; }
    }

    // ─── ХЕЛПЕРЫ РОЛЕЙ ───────────────────────────────────────────────────────

    private boolean isAdmin(String role) {
        return "ADMIN".equals(role) || "ROLE_ADMIN".equals(role);
    }

    private boolean isAdminOrCounselor(String role) {
        return isAdmin(role) || "COUNSELOR".equals(role) || "ROLE_COUNSELOR".equals(role);
    }
}