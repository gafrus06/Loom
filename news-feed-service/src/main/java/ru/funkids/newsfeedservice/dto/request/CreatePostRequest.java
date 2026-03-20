package ru.funkids.newsfeedservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreatePostRequest {

    @NotNull(message = "Camp ID is required")
    private UUID campId;

    private UUID detachmentId;

    private String title;

    @NotBlank(message = "Content is required")
    private String content;

    private boolean isPinned;
}