package ru.fun.userservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ru.fun.userservice.entity.CounselorProfile;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CounselorProfileRepository extends JpaRepository<CounselorProfile, Long> {

    Optional<CounselorProfile> findByUserProfile_Id(UUID userId);

    boolean existsByUserProfile_Id(UUID userId);

    @Query("SELECT c FROM CounselorProfile c WHERE c.userProfile.id IN :userIds")
    List<CounselorProfile> findAllByUserProfileIdIn(@Param("userIds") Collection<UUID> userIds);
}