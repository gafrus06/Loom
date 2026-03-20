package ru.funkids.newsfeedservice.service;

import lombok.extern.slf4j.Slf4j;
import org.mp4parser.IsoFile;
import org.mp4parser.boxes.iso14496.part12.MovieHeaderBox;
import org.mp4parser.support.Matrix;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Утилита для работы с видео-файлами.
 *
 * Порядок попыток определения длительности:
 *  1. mp4parser (чистая Java) — работает с MP4, MOV, M4V
 *  2. ffprobe   (внешний процесс) — работает с любым форматом, если ffprobe установлен
 *  3. null      — если оба варианта не сработали
 */
@Slf4j
public class VideoUtils {

    private VideoUtils() {}


    public static Long getDurationSeconds(MultipartFile file) {
        if (file == null || file.isEmpty()) return null;

        String filename = file.getOriginalFilename() != null
                ? file.getOriginalFilename().toLowerCase() : "";

        // Пробуем mp4parser для MP4/MOV/M4V
        if (isMp4Compatible(filename, file.getContentType())) {
            Long duration = getDurationViaMp4Parser(file);
            if (duration != null) return duration;
        }

        // Fallback: ffprobe если установлен
        return getDurationViaFfprobe(file);
    }

    // ─── MP4PARSER ───────────────────────────────────────────────────────────

    private static Long getDurationViaMp4Parser(MultipartFile file) {
        Path tempFile = null;
        try {
            // mp4parser работает с файлом, а не с потоком — сохраняем во временный файл
            tempFile = Files.createTempFile("video_", getExtension(file.getOriginalFilename()));
            file.transferTo(tempFile.toFile());

            try (IsoFile isoFile = new IsoFile(tempFile.toFile())) {
                MovieHeaderBox mvhd = isoFile
                        .getMovieBox()
                        .getMovieHeaderBox();

                long timescale = mvhd.getTimescale();
                long duration  = mvhd.getDuration();

                if (timescale > 0) {
                    return duration / timescale;
                }
            }
        } catch (Exception e) {
            log.debug("mp4parser failed for {}: {}", file.getOriginalFilename(), e.getMessage());
        } finally {
            deleteTempFile(tempFile);
        }
        return null;
    }

    // ─── FFPROBE ─────────────────────────────────────────────────────────────

    private static Long getDurationViaFfprobe(MultipartFile file) {
        Path tempFile = null;
        try {
            tempFile = Files.createTempFile("video_", getExtension(file.getOriginalFilename()));
            file.transferTo(tempFile.toFile());

            // ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 <file>
            ProcessBuilder pb = new ProcessBuilder(
                    "ffprobe",
                    "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    tempFile.toAbsolutePath().toString()
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();

            String output = new String(process.getInputStream().readAllBytes()).trim();
            int exitCode = process.waitFor();

            if (exitCode == 0 && !output.isEmpty() && !output.equals("N/A")) {
                double seconds = Double.parseDouble(output);
                return (long) seconds;
            }
        } catch (Exception e) {
            log.debug("ffprobe failed for {}: {}", file.getOriginalFilename(), e.getMessage());
        } finally {
            deleteTempFile(tempFile);
        }
        return null;
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────

    private static boolean isMp4Compatible(String filename, String contentType) {
        if (filename.endsWith(".mp4") || filename.endsWith(".mov") || filename.endsWith(".m4v")) {
            return true;
        }
        if (contentType != null) {
            return contentType.equals("video/mp4")
                    || contentType.equals("video/quicktime")
                    || contentType.equals("video/x-m4v");
        }
        return false;
    }

    private static String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return ".tmp";
        return filename.substring(filename.lastIndexOf("."));
    }

    private static void deleteTempFile(Path path) {
        if (path != null) {
            try { Files.deleteIfExists(path); }
            catch (IOException ignored) {}
        }
    }
}