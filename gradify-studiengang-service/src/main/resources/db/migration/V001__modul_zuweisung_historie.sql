-- Migration: Tabelle modul_zuweisung_historie für Protokoll (Audit) von Zuweisungsänderungen
CREATE TABLE IF NOT EXISTS modul_zuweisung_historie (
    id BIGSERIAL PRIMARY KEY,
    dozent_id BIGINT NOT NULL,
    modul_id BIGINT NOT NULL,
    geaendert_von BIGINT NOT NULL,
    aenderungs_typ VARCHAR(50) NOT NULL,
    kommentar VARCHAR(500),
    geaendert_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_modul_zuweisung_historie_geaendert_am ON modul_zuweisung_historie(geaendert_am);
