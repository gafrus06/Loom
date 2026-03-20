package ru.fun.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.fun.authservice.entity.Role;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(String name);
}