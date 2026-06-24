package com.pactchain.backend.repository;

import com.pactchain.backend.model.Pact;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PactRepository extends JpaRepository<Pact, String> {}
