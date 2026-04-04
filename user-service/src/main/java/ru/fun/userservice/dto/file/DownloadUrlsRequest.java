package ru.fun.userservice.dto.file;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class DownloadUrlsRequest {
    private List<UUID> fileIds;
}
