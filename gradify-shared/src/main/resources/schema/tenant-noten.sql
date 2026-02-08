-- Schema für neue Tenant-DBs (z.B. gradify_noten_xyz)
CREATE TABLE IF NOT EXISTS noten (id BIGSERIAL PRIMARY KEY, einschreibung_id BIGINT NOT NULL, modul_id BIGINT NOT NULL, erfasst_von BIGINT NOT NULL, note_wert DECIMAL(2,1), bestanden BOOLEAN, versuch INT NOT NULL DEFAULT 1, pruefungsdatum DATE NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'ERFASST', kommentar VARCHAR(500), erfasst_am TIMESTAMP, validiert_am TIMESTAMP, validiert_von BIGINT);
CREATE TABLE IF NOT EXISTS noten_historie (id BIGSERIAL PRIMARY KEY, note_id BIGINT NOT NULL, einschreibung_id BIGINT, modul_id BIGINT, geaendert_von BIGINT NOT NULL, aenderungs_typ VARCHAR(30) NOT NULL, alter_wert DECIMAL(2,1), neuer_wert DECIMAL(2,1), kommentar VARCHAR(500), geaendert_am TIMESTAMP);
-- Hibernate-generiertes CHECK-Constraint entfernen (Enum-Werte werden von der Anwendung validiert)
ALTER TABLE noten_historie DROP CONSTRAINT IF EXISTS noten_historie_aenderungs_typ_check;
-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_noten_einschreibung_id ON noten(einschreibung_id);
CREATE INDEX IF NOT EXISTS idx_noten_modul_id ON noten(modul_id);
CREATE INDEX IF NOT EXISTS idx_noten_status ON noten(status);
CREATE INDEX IF NOT EXISTS idx_noten_historie_note_id ON noten_historie(note_id);
