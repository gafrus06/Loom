package ru.funkids.newsfeedservice.mapper;

import org.springframework.stereotype.Component;
import ru.funkids.newsfeedservice.dto.client.CampDto;
import ru.funkids.newsfeedservice.dto.client.DetachmentDto;
import ru.funkids.newsfeedservice.dto.client.UserProfileDto;
import ru.funkids.newsfeedservice.dto.request.CreatePostRequest;
import ru.funkids.newsfeedservice.dto.request.UpdatePostRequest;
import ru.funkids.newsfeedservice.dto.response.PostResponse;
import ru.funkids.newsfeedservice.entity.Post;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
public class PostMapper {

    public Post toEntity(CreatePostRequest request) {
        if (request == null) return null;
        return Post.builder()
                .campId(request.getCampId())
                .detachmentId(request.getDetachmentId())
                .title(request.getTitle())
                .content(request.getContent())
                .pinned(request.isPinned())
                .build();
    }

    public void updateEntity(Post post, UpdatePostRequest request) {
        if (request == null || post == null) return;
        if (request.getTitle()    != null) post.setTitle(request.getTitle());
        if (request.getContent()  != null) post.setContent(request.getContent());
        if (request.getIsPinned() != null) {
            post.setPinned(request.getIsPinned());
            post.setPinnedOrder(request.getIsPinned() ? (int) System.currentTimeMillis() : null);
        }
    }

    /**
     * Конвертирует один Post в PostResponse, используя данные,
     * уже загруженные batch-запросами (authorMap, campMap, detachmentMap,
     * likesCountMap, likedByUserIds).
     *
     * Вызывать этот метод в цикле по списку постов БЕЗОПАСНО — никаких
     * дополнительных запросов в БД или Feign-вызовов внутри нет.
     */
    public PostResponse toResponse(
            Post post,
            Map<UUID, UserProfileDto> authorMap,
            Map<UUID, CampDto> campMap,
            Map<UUID, DetachmentDto> detachmentMap,
            Map<UUID, Long> likesCountMap,
            Set<UUID> likedByUserIds
    ) {
        UserProfileDto author = authorMap.getOrDefault(post.getAuthorId(), fallbackAuthor(post.getAuthorId()));
        CampDto camp          = campMap.getOrDefault(post.getCampId(),     fallbackCamp(post.getCampId()));

        PostResponse.DetachmentInfo detachmentInfo = null;
        if (post.getDetachmentId() != null) {
            DetachmentDto d = detachmentMap.get(post.getDetachmentId());
            if (d != null) {
                detachmentInfo = PostResponse.DetachmentInfo.builder()
                        .id(d.getId()).name(d.getName()).ageGroup(d.getAgeGroup())
                        .build();
            }
        }

        List<PostResponse.MediaInfo> mediaInfo = post.getMedia().stream()
                .map(m -> PostResponse.MediaInfo.builder()
                        .fileId(m.getFileId())
                        .type(m.getMediaType())
                        .sortOrder(m.getSortOrder())
                        .durationSec(m.getDurationSec())
                        .build())
                .toList();

        long likesCount = likesCountMap.getOrDefault(post.getId(), 0L);
        boolean liked   = likedByUserIds.contains(post.getId());

        String authorRole = (camp.getOwnerId() != null && camp.getOwnerId().equals(post.getAuthorId()))
                ? "ADMIN" : "COUNSELOR";

        return PostResponse.builder()
                .id(post.getId())
                .author(PostResponse.AuthorInfo.builder()
                        .id(author.getId())
                        .firstName(author.getFirstName())
                        .lastName(author.getLastName())
                        .avatarUrl(author.getAvatarUrl())
                        .role(authorRole)
                        .build())
                .camp(PostResponse.CampInfo.builder()
                        .id(camp.getId()).name(camp.getName())
                        .build())
                .detachment(detachmentInfo)
                .title(post.getTitle())
                .content(post.getContent())
                .media(mediaInfo)
                .stats(PostResponse.PostStats.builder().likesCount(likesCount).build())
                .userInteraction(PostResponse.UserInteraction.builder().liked(liked).build())
                .isPinned(post.isPinned())   // Lombok генерирует isPinned() из поля pinned
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }

    // ─── Fallback-объекты при недоступности внешних сервисов ─────────────────

    private UserProfileDto fallbackAuthor(UUID id) {
        UserProfileDto dto = new UserProfileDto();
        dto.setId(id);
        dto.setFirstName("Вожатый");
        dto.setLastName("");
        return dto;
    }

    private CampDto fallbackCamp(UUID id) {
        CampDto dto = new CampDto();
        dto.setId(id);
        dto.setName("Лагерь");
        return dto;
    }
}