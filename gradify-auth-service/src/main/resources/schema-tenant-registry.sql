-- Zentrale Tenant-Registry (gradify_auth) – alle Services lesen von hier
CREATE TABLE IF NOT EXISTS tenant_registry (
    mandant_id BIGINT NOT NULL PRIMARY KEY,
    suffix VARCHAR(50) NOT NULL UNIQUE,
    kuerzel VARCHAR(20) NOT NULL,
    name VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO tenant_registry (mandant_id, suffix, kuerzel, name) VALUES
    (1, 'thm', 'THM', 'Technische Hochschule Mittelhessen'),
    (2, 'gu', 'GU', 'Goethe Universität Frankfurt')
ON CONFLICT (mandant_id) DO UPDATE SET suffix = EXCLUDED.suffix, kuerzel = EXCLUDED.kuerzel, name = EXCLUDED.name;
