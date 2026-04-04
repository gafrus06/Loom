package ru.funkids.newsfeedservice.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;
import java.util.List;

@Data
public class CreatePostRequest {

    @NotNull(message = "Camp ID is required")
    private UUID campId;

    private UUID detachmentId;

    private String title;

    @NotBlank(message = "Content is required")
    private String content;

    private JsonNode contentJson;

    private boolean isPinned;

    private List<UUID> imageFileIds;
    private List<UUID> videoFileIds;
}
