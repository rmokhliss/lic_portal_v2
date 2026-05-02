// ==============================================================================
// LIC v2 — Identité SYSTEM (compte sentinelle pour les jobs et l'audit log)
//
// Le compte SYSTEM est seedé en BD via la migration F-06. Il représente
// l'auteur des actions automatisées (jobs pg-boss, scripts internes) dans
// lic_audit_log.user_id, sans casser l'intégrité référentielle (FK toujours
// valide vers lic_users.id).
//
// L'UUID utilisé est le `nil UUID` réservé par RFC 9562 — universellement
// reconnu comme valeur sentinelle, jamais émis par un générateur uuidv7
// légitime, et accepté par PostgreSQL/Drizzle (pas de validation stricte
// de la version uuid).
//
// Côté UI : SYSTEM_USER_DISPLAY est le rendu officiel à afficher dans les
// listes audit log pour les entrées de jobs (cohérent règle L9).
// ==============================================================================

export const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";
export const SYSTEM_USER_MATRICULE = "SYS-000";
export const SYSTEM_USER_DISPLAY = "Système (SYS-000)";
