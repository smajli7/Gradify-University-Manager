package de.gradify.studiengang.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/**
 * Erstellt pro neuem Mandanten (Hochschule) die zugehörigen Tenant-Datenbanken
 * und initialisiert das Schema (Tabellen) in jeder DB.
 * Benötigt CREATEDB-Recht für den DB-Benutzer.
 */
@Service
@Slf4j
public class TenantDatabaseProvisioningService {

    @Value("${spring.datasource.url:jdbc:postgresql://localhost:5432/gradify_studiengang}")
    private String datasourceUrl;

    @Value("${spring.datasource.username:gradify}")
    private String username;

    @Value("${spring.datasource.password:gradify123}")
    private String password;

    @Value("${gradify.tenant-provisioning.enabled:true}")
    private boolean enabled;

    private static final String[] DB_TYPES = {"studiengang", "noten", "berechnung"};
    private static final String[] SCHEMA_RESOURCES = {
            "schema/tenant-studiengang.sql",
            "schema/tenant-noten.sql",
            "schema/tenant-berechnung.sql"
    };

    /**
     * Erstellt die drei Tenant-Datenbanken (Studiengang, Noten, Berechnung) und initialisiert das Schema.
     * User-Daten liegen zentral in gradify_user (mandant_id für Filterung).
     *
     * @param kuerzel Kürzel der Hochschule (z.B. THM, FU) – wird kleingeschrieben für DB-Namen
     * @throws IllegalStateException wenn die Erstellung fehlschlägt
     */
    public void provisionDatabasesForNewMandant(String kuerzel) {
        if (!enabled) {
            log.info("Tenant-DB-Provisioning ist deaktiviert – überspringe CREATE DATABASE");
            return;
        }

        String suffix = kuerzel.trim().toLowerCase().replaceAll("[^a-z0-9_]", "_");
        if (suffix.isEmpty()) {
            throw new IllegalArgumentException("Ungültiges Kürzel für Datenbank-Namen: " + kuerzel);
        }

        List<String> created = new ArrayList<>();
        List<String> failed = new ArrayList<>();
        String urlBase = urlBase(datasourceUrl);

        for (int i = 0; i < DB_TYPES.length; i++) {
            String dbType = DB_TYPES[i];
            String dbName = "gradify_" + dbType + "_" + suffix;
            try {
                createDatabase(dbName);
                initSchema(urlBase + "/" + dbName, SCHEMA_RESOURCES[i]);
                created.add(dbName);
                log.info("Datenbank erstellt und Schema initialisiert: {}", dbName);
            } catch (Exception e) {
                log.error("Fehler bei {}: {}", dbName, e.getMessage());
                failed.add(dbName + ": " + e.getMessage());
            }
        }

        if (!failed.isEmpty()) {
            throw new IllegalStateException(
                    "Fehler beim Anlegen der Tenant-Datenbanken: " + String.join("; ", failed));
        }
        log.info("Tenant-Datenbanken bereitgestellt: {}", created);
    }

    private void createDatabase(String dbName) throws SQLException {
        if (!dbName.matches("[a-z0-9_]+")) {
            throw new IllegalArgumentException("Ungültiger Datenbankname: " + dbName);
        }
        String adminUrl = toPostgresUrl(datasourceUrl);
        try (Connection conn = DriverManager.getConnection(adminUrl, username, password)) {
            conn.setAutoCommit(true);
            try (Statement stmt = conn.createStatement()) {
                var rs = stmt.executeQuery(
                        "SELECT 1 FROM pg_database WHERE datname = '" + dbName.replace("'", "''") + "'");
                if (rs.next()) {
                    log.warn("Datenbank {} existiert bereits – überspringe Erstellung", dbName);
                    return;
                }
                stmt.execute("CREATE DATABASE " + dbName);
            }
        }
    }

    private void initSchema(String jdbcUrl, String schemaResource) {
        DataSource ds = new DriverManagerDataSource(jdbcUrl, username, password);
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
        populator.addScript(new ClassPathResource(schemaResource));
        populator.setContinueOnError(true);
        populator.execute(ds);
    }

    private static String urlBase(String url) {
        return url.replaceAll("/[^/?]+(\\?.*)?$", "");
    }

    private static String toPostgresUrl(String url) {
        return url.replaceAll("/[^/?]+(\\?.*)?$", "/postgres$1");
    }
}
