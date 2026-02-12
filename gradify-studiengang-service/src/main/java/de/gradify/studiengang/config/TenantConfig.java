package de.gradify.studiengang.config;

import de.gradify.shared.tenant.TenantRegistryClient;
import de.gradify.shared.tenant.TenantSuffixResolver;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.*;

@Configuration
@Slf4j
public class TenantConfig {

    @Value("${gradify.tenants:1:thm,2:gu}")
    private String tenantsConfig;

    @Bean
    public TenantSuffixResolver tenantSuffixResolver(ObjectProvider<TenantRegistryClient> registryClientProvider) {
        TenantRegistryClient registryClient = registryClientProvider.getIfAvailable();
        TenantSuffixResolver staticResolver = staticTenantSuffixResolver();
        if (registryClient != null) {
            log.info("TenantSuffixResolver nutzt zentrale Tenant-Registry (dynamisch, Fallback: gradify.tenants)");
            return new TenantSuffixResolver() {
                @Override
                public String resolve(Long mandantId) {
                    String s = mandantId != null ? registryClient.getAllIdToSuffix().get(mandantId) : null;
                    return s != null ? s : staticResolver.resolve(mandantId);
                }
                @Override
                public List<String> getAllSuffixes() {
                    List<String> fromRegistry = registryClient.getAllSuffixes();
                    List<String> fromStatic = staticResolver.getAllSuffixes();
                    if (fromRegistry == null || fromRegistry.isEmpty()) return fromStatic;
                    // Merge: Registry kann verzögert sein – statische Suffixe immer miteinbeziehen
                    Set<String> merged = new LinkedHashSet<>(fromStatic);
                    merged.addAll(fromRegistry);
                    return new ArrayList<>(merged);
                }
                @Override
                public Long resolveMandantId(String suffix) {
                    Long id = suffix != null ? registryClient.getAllSuffixToId().get(suffix) : null;
                    return id != null ? id : staticResolver.resolveMandantId(suffix);
                }
            };
        }
        return staticResolver;
    }

    private TenantSuffixResolver staticTenantSuffixResolver() {
        Map<Long, String> idToSuffix = new HashMap<>();
        Map<String, Long> suffixToId = new HashMap<>();
        List<String> allSuffixes = new ArrayList<>();
        for (String pair : tenantsConfig.split(",")) {
            String[] kv = pair.trim().split(":");
            if (kv.length == 2) {
                try {
                    long id = Long.parseLong(kv[0].trim());
                    String suffix = kv[1].trim().toLowerCase();
                    idToSuffix.put(id, suffix);
                    suffixToId.put(suffix, id);
                    allSuffixes.add(suffix);
                } catch (NumberFormatException e) {
                    log.warn("Ungültige Tenant-Konfiguration: {}", pair);
                }
            }
        }
        return new TenantSuffixResolver() {
            @Override
            public String resolve(Long mandantId) {
                return mandantId != null ? idToSuffix.get(mandantId) : null;
            }
            @Override
            public List<String> getAllSuffixes() {
                return Collections.unmodifiableList(allSuffixes);
            }
            @Override
            public Long resolveMandantId(String suffix) {
                return suffix != null ? suffixToId.get(suffix) : null;
            }
        };
    }
}
