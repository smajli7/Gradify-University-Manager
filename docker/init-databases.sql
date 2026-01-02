-- Erstellt alle Datenbanken für die Gradify Services
-- Wird automatisch beim ersten Start des PostgreSQL Containers ausgeführt

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

-- Berechtigungen für alle Datenbanken
GRANT ALL PRIVILEGES ON DATABASE gradify_auth TO gradify;
GRANT ALL PRIVILEGES ON DATABASE gradify_user TO gradify;
GRANT ALL PRIVILEGES ON DATABASE gradify_studiengang TO gradify;
GRANT ALL PRIVILEGES ON DATABASE gradify_noten TO gradify;
GRANT ALL PRIVILEGES ON DATABASE gradify_berechnung TO gradify;


