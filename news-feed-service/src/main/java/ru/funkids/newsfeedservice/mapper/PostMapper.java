package ru.funkids.newsfeedservice.mapper;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
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
@RequiredArgsConstructor
public class PostMapper {

    private final ObjectMapper objectMapper;

    public Post toEntity(CreatePostRequest request) {
        if (request == null) return null;
        JsonNode normalizedContent = normalizeContentJson(request.getContentJson(), request.getContent());
        return Post.builder()
                .campId(request.getCampId())
                .detachmentId(request.getDetachmentId())
                .title(request.getTitle())
                .content(extractPlainText(normalizedContent, request.getContent()))
                .contentJson(writeJson(normalizedContent))
                .pinned(request.isPinned())
                .build();
    }

    public void updateEntity(Post post, UpdatePostRequest request) {
        if (request == null || post == null) return;
        if (request.getTitle()    != null) post.setTitle(request.getTitle());
        if (request.getContent() != null || request.getContentJson() != null) {
            JsonNode normalizedContent = normalizeContentJson(request.getContentJson(),
                    request.getContent() != null ? request.getContent() : post.getContent());
            post.setContent(extractPlainText(normalizedContent, post.getContent()));
            post.setContentJson(writeJson(normalizedContent));
        }
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

        JsonNode contentJson = readJson(post.getContentJson(), post.getContent());

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
                .contentJson(contentJson)
                .media(mediaInfo)
                .stats(PostResponse.PostStats.builder().likesCount(likesCount).build())
                .userInteraction(PostResponse.UserInteraction.builder().liked(liked).build())
                .moderationStatus(post.getModerationStatus().name())
                .isPinned(post.isPinned())   // Lombok генерирует isPinned() из поля pinned
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }

    private JsonNode normalizeContentJson(JsonNode contentJson, String fallbackText) {
        if (contentJson != null && !contentJson.isNull()) {
            return contentJson;
        }

        ObjectNode root = objectMapper.createObjectNode();
        root.put("version", 1);
        ArrayNode blocks = root.putArray("blocks");

        String safeText = fallbackText == null ? "" : fallbackText;
        String[] paragraphs = safeText.split("\\R", -1);
        if (paragraphs.length == 0) {
            paragraphs = new String[]{""};
        }

        for (String paragraph : paragraphs) {
            ObjectNode block = objectMapper.createObjectNode();
            block.put("type", "paragraph");
            block.put("text", paragraph);
            blocks.add(block);
        }

        return root;
    }

    private String extractPlainText(JsonNode contentJson, String fallbackText) {
        if (contentJson == null || contentJson.isNull()) {
            return fallbackText == null ? "" : fallbackText;
        }

        List<String> chunks = new java.util.ArrayList<>();
        JsonNode blocks = contentJson.get("blocks");
        if (blocks != null && blocks.isArray()) {
            for (JsonNode block : blocks) {
                String text = extractNodeText(block);
                if (!text.isBlank()) {
                    chunks.add(text.trim());
                }
            }
        }

        if (chunks.isEmpty()) {
            String extracted = extractNodeText(contentJson);
            if (!extracted.isBlank()) {
                return extracted.trim();
            }
            return fallbackText == null ? "" : fallbackText;
        }

        return String.join("\n", chunks);
    }

    private String extractNodeText(JsonNode node) {
        if (node == null || node.isNull()) return "";
        if (node.isTextual()) return node.asText();

        StringBuilder builder = new StringBuilder();

        if (node.has("text") && node.get("text").isTextual()) {
            builder.append(node.get("text").asText());
        }

        if (node.has("content") && node.get("content").isArray()) {
            for (JsonNode child : node.get("content")) {
                String childText = extractNodeText(child);
                if (!childText.isBlank()) builder.append(childText);
            }
        }

        if (node.has("items") && node.get("items").isArray()) {
            for (JsonNode child : node.get("items")) {
                String childText = extractNodeText(child);
                if (!childText.isBlank()) {
                    if (!builder.isEmpty()) builder.append('\n');
                    builder.append(childText);
                }
            }
        }

        return builder.toString();
    }

    private String writeJson(JsonNode contentJson) {
        try {
            return objectMapper.writeValueAsString(contentJson);
        } catch (Exception e) {
            return null;
        }
    }

    private JsonNode readJson(String contentJson, String fallbackText) {
        if (contentJson == null || contentJson.isBlank()) {
            return normalizeContentJson(null, fallbackText);
        }
        try {
            return objectMapper.readTree(contentJson);
        } catch (Exception e) {
            return normalizeContentJson(null, fallbackText);
        }
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
