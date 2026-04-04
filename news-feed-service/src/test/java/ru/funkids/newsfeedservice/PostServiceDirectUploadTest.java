package ru.funkids.newsfeedservice;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import ru.funkids.newsfeedservice.client.CampServiceClient;
import ru.funkids.newsfeedservice.client.FileStorageClient;
import ru.funkids.newsfeedservice.client.UserServiceClient;
import ru.funkids.newsfeedservice.dto.client.*;
import ru.funkids.newsfeedservice.dto.request.CreatePostRequest;
import ru.funkids.newsfeedservice.dto.request.UpdatePostRequest;
import ru.funkids.newsfeedservice.dto.response.PostResponse;
import ru.funkids.newsfeedservice.entity.Post;
import ru.funkids.newsfeedservice.entity.PostMedia;
import ru.funkids.newsfeedservice.mapper.PostMapper;
import ru.funkids.newsfeedservice.repository.LikeRepository;
import ru.funkids.newsfeedservice.repository.PostRepository;
import ru.funkids.newsfeedservice.security.SecurityUtils;
import ru.funkids.newsfeedservice.service.PostService;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PostServiceDirectUploadTest {

    private PostRepository postRepository;
    private LikeRepository likeRepository;
    private CampServiceClient campServiceClient;
    private UserServiceClient userServiceClient;
    private FileStorageClient fileStorageClient;
    private PostMapper postMapper;
    private PostService postService;

    @BeforeEach
    void setUp() {
        postRepository = mock(PostRepository.class);
        likeRepository = mock(LikeRepository.class);
        campServiceClient = mock(CampServiceClient.class);
        userServiceClient = mock(UserServiceClient.class);
        fileStorageClient = mock(FileStorageClient.class);
        postMapper = mock(PostMapper.class);
        postService = new PostService(
                postRepository,
                likeRepository,
                campServiceClient,
                userServiceClient,
                fileStorageClient,
                postMapper
        );
    }

    @Test
    void createPostBindsAlreadyUploadedFilesWithoutMultipartProxying() {
        UUID currentUserId = UUID.randomUUID();
        UUID campId = UUID.randomUUID();
        UUID imageFileId = UUID.randomUUID();
        UUID videoFileId = UUID.randomUUID();

        try (var mockedSecurity = mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(currentUserId);
            mockedSecurity.when(SecurityUtils::getCurrentUserRole).thenReturn("ROLE_COUNSELOR");

            CampPostingAccessDto postingAccess = new CampPostingAccessDto();
            postingAccess.setAcceptedStaff(true);
            postingAccess.setCanPostWithoutModeration(true);

            CreatePostRequest request = new CreatePostRequest();
            request.setCampId(campId);
            request.setContent("post");
            request.setImageFileIds(List.of(imageFileId));
            request.setVideoFileIds(List.of(videoFileId));

            Post post = Post.builder()
                    .id(UUID.randomUUID())
                    .campId(campId)
                    .authorId(currentUserId)
                    .content("post")
                    .build();
            post.setMedia(new java.util.ArrayList<>());

            UserProfileDto author = new UserProfileDto();
            author.setId(currentUserId);
            CampDto camp = new CampDto();
            camp.setId(campId);

            when(campServiceClient.getCamp(campId)).thenReturn(camp);
            when(campServiceClient.getPostingAccess(campId)).thenReturn(postingAccess);
            when(postMapper.toEntity(request)).thenReturn(post);
            when(postRepository.save(any(Post.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(likeRepository.countMapByPostIds(any())).thenReturn(Map.of(post.getId(), 0L));
            when(likeRepository.findLikedPostIds(any(), eq(currentUserId))).thenReturn(Set.of());
            when(userServiceClient.getUserProfiles(List.of(currentUserId))).thenReturn(List.of(author));
            when(fileStorageClient.getDownloadUrls(any())).thenReturn(new DownloadUrlsResponse(Map.of()));
            when(campServiceClient.getCamps(List.of(campId))).thenReturn(List.of(camp));
            when(postMapper.toResponse(any(), anyMap(), anyMap(), anyMap(), anyMap(), anySet()))
                    .thenReturn(new PostResponse());

            postService.createPost(request);

            verify(fileStorageClient).confirmUpload(imageFileId, post.getId().toString());
            verify(fileStorageClient).confirmUpload(videoFileId, post.getId().toString());
            verify(fileStorageClient, never()).generateUploadUrl(anyString(), anyString(), anyString(), anyString());
            verify(userServiceClient).getUserProfiles(List.of(currentUserId));
            verify(campServiceClient).getCamps(List.of(campId));
        }
    }

    @Test
    void updatePostBindsNewUploadedFilesWithoutMultipartProxying() {
        UUID currentUserId = UUID.randomUUID();
        UUID campId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID imageFileId = UUID.randomUUID();

        try (var mockedSecurity = mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(currentUserId);
            mockedSecurity.when(SecurityUtils::getCurrentUserRole).thenReturn("ROLE_COUNSELOR");

            UpdatePostRequest request = new UpdatePostRequest();
            request.setNewImageFileIds(List.of(imageFileId));
            CampPostingAccessDto postingAccess = new CampPostingAccessDto();
            postingAccess.setCanPostWithoutModeration(true);

            Post post = Post.builder()
                    .id(postId)
                    .campId(campId)
                    .authorId(currentUserId)
                    .content("post")
                    .build();
            post.setMedia(new java.util.ArrayList<>(List.of(
                    PostMedia.builder()
                            .id(UUID.randomUUID())
                            .fileId(UUID.randomUUID())
                            .mediaType("IMAGE")
                            .sortOrder(0)
                            .build()
            )));

            UserProfileDto author = new UserProfileDto();
            author.setId(currentUserId);
            CampDto camp = new CampDto();
            camp.setId(campId);

            when(postRepository.findById(postId)).thenReturn(java.util.Optional.of(post));
            when(postRepository.save(any(Post.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(likeRepository.countMapByPostIds(any())).thenReturn(Map.of(postId, 0L));
            when(likeRepository.findLikedPostIds(any(), eq(currentUserId))).thenReturn(Set.of());
            when(userServiceClient.getUserProfiles(List.of(currentUserId))).thenReturn(List.of(author));
            when(fileStorageClient.getDownloadUrls(any())).thenReturn(new DownloadUrlsResponse(Map.of()));
            when(campServiceClient.getCamps(List.of(campId))).thenReturn(List.of(camp));
            when(campServiceClient.getPostingAccess(campId)).thenReturn(postingAccess);
            when(postMapper.toResponse(any(), anyMap(), anyMap(), anyMap(), anyMap(), anySet()))
                    .thenReturn(new PostResponse());

            postService.updatePost(postId, request);

            verify(fileStorageClient).confirmUpload(imageFileId, postId.toString());
            verify(fileStorageClient, never()).generateUploadUrl(anyString(), anyString(), anyString(), anyString());
            verify(postMapper).updateEntity(post, request);
        }
    }
}
