package ru.fun.userservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ru.fun.userservice.entity.ParentProfile;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ParentProfileRepository extends JpaRepository<ParentProfile, Long> {

    Optional<ParentProfile> findByUserProfile_Id(UUID userId);

    boolean existsByUserProfile_Id(UUID userId);

    @Query("SELECT p FROM ParentProfile p WHERE p.userProfile.id IN :userIds")
    List<ParentProfile> findAllByUserProfileIdIn(@Param("userIds") Collection<UUID> userIds);
}