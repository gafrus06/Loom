package ru.fun.authservice;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import ru.fun.authservice.kafka.UserEventProducer;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserPaginationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserEventProducer userEventProducer;

    @Test
    void testPaginationAfterUserRegistration() throws Exception {
        int successfulRegistrations = 0;

        for (int i = 13; i <= 50; i++) {
            String email = "user-" + UUID.randomUUID() + "-" + i + "@test.com";

            int status = mockMvc.perform(post("/api/auth/register")
                            .contentType("application/json")
                            .content("""
                                    {"email":"%s","password":"password123"}
                                    """.formatted(email)))
                    .andReturn()
                    .getResponse()
                    .getStatus();

            assertThat(status).isBetween(200, 299);
            successfulRegistrations++;
        }

        assertThat(successfulRegistrations).isEqualTo(38);
    }
}
