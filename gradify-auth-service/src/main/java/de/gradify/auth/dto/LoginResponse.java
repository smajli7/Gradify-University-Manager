package de.gradify.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    
    private String accessToken;
    private String refreshToken;
    private int expiresIn;
    private UserInfo user;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private Long id;
        private String username;
        private String vorname;
        private String nachname;
        private String[] roles;
        private Long studentId;  // null fuer Nicht-Studenten
        private Long mandantId;  // fuer HOCHSCHUL_VERWALTER-Scoping
    }
}




