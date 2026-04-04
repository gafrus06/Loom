package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ShiftAssignmentScheduler {

    private static final long AUTO_DETACH_LOCK_KEY = 4_207_001L;

    private final CampMemberServiceImpl campMemberService;
    private final JdbcTemplate jdbcTemplate;

    @Scheduled(cron = "0 10 3 * * *")
    public void autoDetachFinishedShiftAssignments() {
        Boolean locked = jdbcTemplate.queryForObject("select pg_try_advisory_lock(?)", Boolean.class, AUTO_DETACH_LOCK_KEY);
        if (!Boolean.TRUE.equals(locked)) {
            log.debug("Skipping shift auto-detach on this instance because another node holds the lock");
            return;
        }

        try {
            log.debug("Running shift assignment auto-detach scheduler");
            campMemberService.autoDetachExpiredAssignments();
        } finally {
            jdbcTemplate.queryForObject("select pg_advisory_unlock(?)", Boolean.class, AUTO_DETACH_LOCK_KEY);
        }
    }
}
