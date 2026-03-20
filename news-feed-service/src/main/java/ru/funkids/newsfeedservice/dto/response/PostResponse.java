package ru.funkids.newsfeedservice.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PostResponse {

    private UUID id;
    private AuthorInfo author;
    private CampInfo camp;
    private DetachmentInfo detachment;
    private String title;
    private String content;
    private List<MediaInfo> media;
    private PostStats stats;
    private UserInteraction userInteraction;
    // Примитив boolean, а не Boolean — с @JsonInclude(NON_NULL) обёртка Boolean(false)
    // сериализовалась бы, но явный примитив надёжнее и не допускает null.
    private boolean isPinned;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AuthorInfo {
        private UUID id;
        private String firstName;
        private String lastName;
        private String avatarUrl;
        private String role;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CampInfo {
        private UUID id;
        private String name;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DetachmentInfo {
        private UUID id;
        private String name;
        private String ageGroup;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MediaInfo {
        private UUID fileId;
        private String type;       // "IMAGE" | "VIDEO"
        private Integer sortOrder;
        private Long durationSec;  // для VIDEO: длительность в секундах (null для IMAGE)
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PostStats {
        private long likesCount;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UserInteraction {
        private boolean liked;
    }
}