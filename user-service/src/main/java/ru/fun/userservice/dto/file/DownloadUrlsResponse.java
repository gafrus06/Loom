package ru.fun.userservice.dto.file;

import lombok.Data;

import java.util.Map;
import java.util.UUID;

@Data
public class DownloadUrlsResponse {
    private Map<UUID, String> urls;
}
