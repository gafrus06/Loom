package ru.funkids.newsfeedservice;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import ru.funkids.newsfeedservice.controller.PostController;
import ru.funkids.newsfeedservice.service.PostService;

import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PostControllerJsonOnlyTest {

    private PostService postService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        postService = mock(PostService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new PostController(postService)).build();
    }

    @Test
    void multipartCreateEndpointIsNotSupportedAnymore() throws Exception {
        mockMvc.perform(multipart("/api/feed/posts")
                        .file("images", "legacy".getBytes())
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isUnsupportedMediaType());

        verifyNoInteractions(postService);
    }

    @Test
    void multipartUpdateEndpointIsNotSupportedAnymore() throws Exception {
        mockMvc.perform(multipart("/api/feed/posts/{id}", UUID.randomUUID())
                        .file("videos", "legacy".getBytes())
                        .with(request -> {
                            request.setMethod("PUT");
                            return request;
                        })
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isUnsupportedMediaType());

        verifyNoInteractions(postService);
    }
}
