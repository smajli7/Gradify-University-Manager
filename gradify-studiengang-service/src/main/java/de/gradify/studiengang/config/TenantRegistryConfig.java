package de.gradify.studiengang.config;

import com.zaxxer.hikari.HikariDataSource;
import de.gradify.shared.tenant.TenantRegistryClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.util.*;

/**
 * Konfiguriert den Zugriff auf die zentrale Tenant-Registry (gradify_auth).
 */
@Configuration
@Slf4j
@ConditionalOnProperty(name = "gradify.tenant-registry.enabled", havingValue = "true")
public class TenantRegistryConfig {

    @Value("${gradify.tenant-registry.url:jdbc:postgresql://localhost:5432/gradify_auth}")
    private String url;
    @Value("${gradify.tenant-registry.username:gradify}")
    private String username;
    @Value("${gradify.tenant-registry.password:gradify123}")
    private String password;

    @Bean("tenantRegistryDataSource")
    public DataSource tenantRegistryDataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(url);
        ds.setUsername(username);
        ds.setPassword(password);
        ds.setMaximumPoolSize(2);
        return ds;
    }

    @Bean
    public TenantRegistryClient tenantRegistryClient() {
        return new JdbcTenantRegistryClient(new JdbcTemplate(tenantRegistryDataSource()));
    }

    private static class JdbcTenantRegistryClient implements TenantRegistryClient {
        private final JdbcTemplate jdbc;
        private volatile Map<Long, String> idToSuffixCache;
        private volatile Map<String, Long> suffixToIdCache;
        private volatile long cacheTime;
        private static final long CACHE_TTL_MS = 30_000;

        JdbcTenantRegistryClient(JdbcTemplate jdbc) {
            this.jdbc = jdbc;
        }

        private void refreshIfNeeded() {
            long now = System.currentTimeMillis();
            if (idToSuffixCache == null || (now - cacheTime) > CACHE_TTL_MS) {
                synchronized (this) {
                    if (idToSuffixCache == null || (now - cacheTime) > CACHE_TTL_MS) {
                        Map<Long, String> idToSuffix = new HashMap<>();
                        Map<String, Long> suffixToId = new HashMap<>();
                        try {
                            jdbc.query("SELECT mandant_id, suffix, kuerzel, name FROM tenant_registry",
                                    rs -> {
                                        long id = rs.getLong("mandant_id");
                                        String s = rs.getString("suffix").toLowerCase();
                                        idToSuffix.put(id, s);
                                        suffixToId.put(s, id);
                                    });
                        } catch (Exception e) {
                            log.warn("Tenant-Registry lesen fehlgeschlagen: {}", e.getMessage());
                        }
                        idToSuffixCache = Collections.unmodifiableMap(idToSuffix);
                        suffixToIdCache = Collections.unmodifiableMap(suffixToId);
                        cacheTime = now;
                    }
                }
            }
        }

        @Override
        public void register(Long mandantId, String suffix, String kuerzel, String name) {
            String s = suffix.trim().toLowerCase();
            jdbc.update("INSERT INTO tenant_registry (mandant_id, suffix, kuerzel, name) VALUES (?,?,?,?) " +
                            "ON CONFLICT (mandant_id) DO UPDATE SET suffix=EXCLUDED.suffix, kuerzel=EXCLUDED.kuerzel, name=EXCLUDED.name",
                    mandantId, s, kuerzel, name);
            idToSuffixCache = null; // invalidate cache
        }

        @Override
        public Map<Long, String> getAllIdToSuffix() {
            refreshIfNeeded();
            return idToSuffixCache != null ? idToSuffixCache : Collections.emptyMap();
        }

        @Override
        public Map<String, Long> getAllSuffixToId() {
            refreshIfNeeded();
            return suffixToIdCache != null ? suffixToIdCache : Collections.emptyMap();
        }

        @Override
        public List<String> getAllSuffixes() {
            refreshIfNeeded();
            return suffixToIdCache != null ? new ArrayList<>(suffixToIdCache.keySet()) : Collections.emptyList();
        }
    }
}
