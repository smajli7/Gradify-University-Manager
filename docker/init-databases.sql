-- Erstellt alle Datenbanken für die Gradify Services
-- Wird automatisch beim ersten Start des PostgreSQL Containers ausgeführt

SET client_encoding TO 'UTF8';

-- CREATEDB-Recht für gradify: Admin kann neue Hochschulen anlegen (CREATE DATABASE)
ALTER USER gradify CREATEDB;

-- Auth Service Datenbank (Standard-DB bereits erstellt via POSTGRES_DB)
-- CREATE DATABASE gradify_auth; -- bereits via env erstellt

-- User Service Datenbank
CREATE DATABASE gradify_user;

-- Studiengang Service Datenbank
CREATE DATABASE gradify_studiengang;

-- Noten Service Datenbank
CREATE DATABASE gradify_noten;

-- Berechnungs Service Datenbank
CREATE DATABASE gradify_berechnung;

-- Tenant-Datenbanken (DB-per-Tenant für Studiengang/Noten/Berechnung; User zentral in gradify_user)
CREATE DATABASE gradify_studiengang_thm;
CREATE DATABASE gradify_studiengang_gu;
CREATE DATABASE gradify_noten_thm;
CREATE DATABASE gradify_noten_gu;
CREATE DATABASE gradify_berechnung_thm;
CREATE DATABASE gradify_berechnung_gu;

-- Berechtigungen für alle Datenbanken
GRANT ALL PRIVILEGES ON DATABASE gradify_auth TO gradify;
GRANT ALL PRIVILEGES ON DATABASE gradify_user TO gradify;
GRANT ALL PRIVILEGES ON DATABASE gradify_studiengang TO gradify;
GRANT ALL PRIVILEGES ON DATABASE gradify_noten TO gradify;
GRANT ALL PRIVILEGES ON DATABASE gradify_berechnung TO gradify;
GRANT ALL PRIVILEGES ON DATABASE gradify_studiengang_thm TO gradify;
GRANT ALL PRIVILEGES ON DATABASE gradify_studiengang_gu TO gradify;
GRANT ALL PRIVILEGES ON DATABASE gradify_noten_thm TO gradify;
GRANT ALL PRIVILEGES ON DATABASE gradify_noten_gu TO gradify;
GRANT ALL PRIVILEGES ON DATABASE gradify_berechnung_thm TO gradify;
GRANT ALL PRIVILEGES ON DATABASE gradify_berechnung_gu TO gradify;

-- Zentrale Tenant-Registry (gradify_auth) - existiert vor allen Services
CREATE TABLE IF NOT EXISTS tenant_registry (
    mandant_id BIGINT NOT NULL PRIMARY KEY,
    suffix VARCHAR(50) NOT NULL UNIQUE,
    kuerzel VARCHAR(20) NOT NULL,
    name VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO tenant_registry (mandant_id, suffix, kuerzel, name) VALUES
    (1, 'thm', 'THM', 'Technische Hochschule Mittelhessen'),
    (2, 'gu', 'GU', 'Goethe Universitaet Frankfurt')
ON CONFLICT (mandant_id) DO UPDATE SET suffix = EXCLUDED.suffix, kuerzel = EXCLUDED.kuerzel, name = EXCLUDED.name;

