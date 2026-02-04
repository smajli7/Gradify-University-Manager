package de.gradify.user.config;

import de.gradify.shared.tenant.TenantSuffixResolver;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.util.*;

/**
 * Konfiguriert die Tenant-Routing-DataSource für DB-per-Tenant.
 */
@Configuration
@Slf4j
@ConditionalOnProperty(name = "gradify.tenant-routing.enabled", havingValue = "true")
public class TenantDataSourceConfig {

    @Value("${spring.datasource.url:jdbc:postgresql://localhost:5432/gradify_user}")
    private String baseUrl;

    @Value("${spring.datasource.username:gradify}")
    private String username;

    @Value("${spring.datasource.password:gradify123}")
    private String password;

    @Bean
    @Primary
    public DataSource dataSource(@Lazy TenantSuffixResolver resolver) {
        java.util.List<String> suffixes = resolver.getAllSuffixes();
        if (suffixes.isEmpty()) {
            throw new IllegalStateException("gradify.tenants muss konfiguriert sein wenn tenant-routing aktiv ist (z.B. 1:thm,2:gu)");
        }
        String urlBase = baseUrl.replaceAll("/[^/?]+(\\?.*)?$", "");
        Map<Object, Object> targets = new HashMap<>();
        for (String suffix : suffixes) {
            targets.put(suffix, createDataSource(urlBase + "/gradify_user_" + suffix));
        }
        DynamicTenantRoutingDataSource ds = new DynamicTenantRoutingDataSource(resolver,
                suffix -> createDataSource(urlBase + "/gradify_user_" + suffix));
        ds.init(targets);
        log.info("Tenant-DataSource konfiguriert: {} Tenants (User), dynamisch erweiterbar", targets.size());
        return ds;
    }

    private DataSource createDataSource(String url) {
        com.zaxxer.hikari.HikariDataSource ds = new com.zaxxer.hikari.HikariDataSource();
        ds.setJdbcUrl(url);
        ds.setUsername(username);
        ds.setPassword(password);
        ds.setMaximumPoolSize(5);
        return ds;
    }
}
