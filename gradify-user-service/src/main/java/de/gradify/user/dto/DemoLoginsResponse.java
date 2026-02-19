package de.gradify.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response für /api/users/demo-logins.
 * Liefert alle aktiven Nutzer und das Demo-Passwort (konfigurierbar).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemoLoginsResponse {
    private List<DemoUserItem> users;
    /** Demo-Passwort für alle Nutzer (konfigurierbar via gradify.demo.password) */
    private String demoPassword;
}
