package ru.fun.authservice;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.ResponseEntity;
import ru.fun.authservice.dto.RegisterRequest;


import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserPaginationIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void testPaginationAfterUserRegistration() throws InterruptedException {
        // 1. Зарегистрируем 12 пользователей через auth-service
        List<String> registeredEmails = new ArrayList<>();
        for (int i = 13; i <= 50; i++) {
            String email = "user" + i + "@test.com";
            RegisterRequest request = new RegisterRequest();
            request.setEmail(email);
            request.setPassword("password123");

            ResponseEntity<String> response =
                    restTemplate.postForEntity("http://localhost:12717/api/auth/register", request, String.class); // 8081 = порт auth-service
            assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
            registeredEmails.add(email);
        }

        // 2. Подождём немного, чтобы Kafka доставила события в user-service
        Thread.sleep(2000);


    }
}


