-- =====================================================
-- Gradify E2E Test Seed-Daten
-- Wird vor den E2E-Tests in die Test-Datenbanken geladen.
-- =====================================================

-- ===== AUTH DB (gradify_auth) =====
-- Kein Seed noetig – Auth-Service hat keine eigene User-Tabelle,
-- er validiert Credentials via gRPC beim User-Service.

-- ===== USER DB (gradify_user) =====
-- Rollen
INSERT INTO rollen (name) VALUES ('ROLE_ADMIN') ON CONFLICT DO NOTHING;
INSERT INTO rollen (name) VALUES ('ROLE_STUDENT') ON CONFLICT DO NOTHING;
INSERT INTO rollen (name) VALUES ('ROLE_LEHRENDER') ON CONFLICT DO NOTHING;
INSERT INTO rollen (name) VALUES ('ROLE_PRUEFUNGSAMT') ON CONFLICT DO NOTHING;
INSERT INTO rollen (name) VALUES ('ROLE_HOCHSCHUL_VERWALTER') ON CONFLICT DO NOTHING;

-- Test-Benutzer (Passwort: "test1234" als BCrypt-Hash)
-- BCrypt Hash fuer "test1234": $2a$10$dXJ3SW6G7P50lGmMQgel6uVVs/DNYp2PQ.G1bQWwFkYzHiKxK0eJy
INSERT INTO benutzer (benutzername, email, passwort_hash, vorname, nachname, mandant_id, aktiv)
VALUES ('admin', 'admin@gradify.de',
        '$2a$10$dXJ3SW6G7P50lGmMQgel6uVVs/DNYp2PQ.G1bQWwFkYzHiKxK0eJy',
        'System', 'Administrator', 1, true)
ON CONFLICT DO NOTHING;

INSERT INTO benutzer (benutzername, email, passwort_hash, vorname, nachname, mandant_id, aktiv)
VALUES ('prof.schmidt', 'schmidt@thm.de',
        '$2a$10$dXJ3SW6G7P50lGmMQgel6uVVs/DNYp2PQ.G1bQWwFkYzHiKxK0eJy',
        'Prof. Dr.', 'Schmidt', 1, true)
ON CONFLICT DO NOTHING;

INSERT INTO benutzer (benutzername, email, passwort_hash, vorname, nachname, mandant_id, aktiv)
VALUES ('max.mustermann', 'max@student.thm.de',
        '$2a$10$dXJ3SW6G7P50lGmMQgel6uVVs/DNYp2PQ.G1bQWwFkYzHiKxK0eJy',
        'Max', 'Mustermann', 1, true)
ON CONFLICT DO NOTHING;

INSERT INTO benutzer (benutzername, email, passwort_hash, vorname, nachname, mandant_id, aktiv)
VALUES ('pa.thm', 'pruefungsamt@thm.de',
        '$2a$10$dXJ3SW6G7P50lGmMQgel6uVVs/DNYp2PQ.G1bQWwFkYzHiKxK0eJy',
        'Pruefungsamt', 'THM', 1, true)
ON CONFLICT DO NOTHING;

-- Benutzer-Rollen-Zuordnung (anhand Benutzername -> ID-Mapping)
-- HINWEIS: Die IDs haengen von der Insert-Reihenfolge ab.
-- In der Praxis: Rollen werden ueber REST-API zugewiesen.

-- ===== STUDIENGANG DB (gradify_studiengang) =====
-- Mandant
INSERT INTO mandanten (name, kuerzel, aktiv)
VALUES ('Technische Hochschule Mittelhessen', 'THM', true)
ON CONFLICT DO NOTHING;

-- Studiengang: Bioverfahrenstechnik (Bachelor)
INSERT INTO studiengaenge (mandant_id, name, kuerzel, abschlussart, regelstudienzeit, gesamt_ects, studienvariante, aktiv)
VALUES (1, 'Bioverfahrenstechnik', 'BVT', 'BACHELOR', 7, 210, 'ALLGEMEIN', true)
ON CONFLICT DO NOTHING;

-- Studiengang: Funktionale Sicherheit (Master)
INSERT INTO studiengaenge (mandant_id, name, kuerzel, abschlussart, regelstudienzeit, gesamt_ects, studienvariante, aktiv)
VALUES (1, 'Funktionale Sicherheit im Automobilbereich', 'FSA', 'MASTER', 3, 120, 'ALLGEMEIN', true)
ON CONFLICT DO NOTHING;

-- Pruefungsordnung BVT 2024
INSERT INTO pruefungsordnungen (studiengang_id, version, gueltig_ab, aktiv, berechnungsart)
VALUES (1, '2024', '2024-09-01', true, 'GEWICHTET')
ON CONFLICT DO NOTHING;

-- Pruefungsordnung FSA 2024
INSERT INTO pruefungsordnungen (studiengang_id, version, gueltig_ab, aktiv, berechnungsart)
VALUES (2, '2024', '2024-09-01', true, 'ARITHMETISCH_GEMISCHT')
ON CONFLICT DO NOTHING;

-- Module BVT (Auswahl)
INSERT INTO module (pruefungsordnung_id, modul_nr, name, ects, gewichtung, in_gesamtnote)
VALUES (1, '1', 'Einfuehrung in die Bioverfahrenstechnik', 5, 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO module (pruefungsordnung_id, modul_nr, name, ects, gewichtung, in_gesamtnote)
VALUES (1, '2', 'Mathematik I', 10, 2.0, true)
ON CONFLICT DO NOTHING;

INSERT INTO module (pruefungsordnung_id, modul_nr, name, ects, gewichtung, in_gesamtnote)
VALUES (1, '3', 'Allgemeine und Anorganische Chemie', 5, 1.0, true)
ON CONFLICT DO NOTHING;

INSERT INTO module (pruefungsordnung_id, modul_nr, name, ects, gewichtung, in_gesamtnote)
VALUES (1, '4', 'Physik', 5, 1.0, true)
ON CONFLICT DO NOTHING;

-- Module FSA Master (Auswahl)
INSERT INTO module (pruefungsordnung_id, modul_nr, name, ects, gewichtung, in_gesamtnote)
VALUES (2, '1', 'Paradigmatische Grundlegung', 10, 1.0, true)
ON CONFLICT DO NOTHING;

INSERT INTO module (pruefungsordnung_id, modul_nr, name, ects, gewichtung, in_gesamtnote)
VALUES (2, '2', 'Quantitative Forschungsmethoden', 10, 1.0, true)
ON CONFLICT DO NOTHING;

INSERT INTO module (pruefungsordnung_id, modul_nr, name, ects, gewichtung, in_gesamtnote)
VALUES (2, '6', 'Aktuelle Forschungen', 5, 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO module (pruefungsordnung_id, modul_nr, name, ects, gewichtung, in_gesamtnote)
VALUES (2, '12', 'Master-Thesis mit Kolloquium', 30, 2.0, true)
ON CONFLICT DO NOTHING;
