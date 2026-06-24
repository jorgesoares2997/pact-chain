package com.pactchain.backend.repository;

import com.pactchain.backend.model.InviteLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InviteLinkRepository extends JpaRepository<InviteLink, String> {
    Optional<InviteLink> findByCode(String code);
}
