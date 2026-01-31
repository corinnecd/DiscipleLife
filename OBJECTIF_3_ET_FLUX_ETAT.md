# Objectif 3, tableau Pasteur et flux superviseur → pasteur – État

**Date :** 30 janvier 2026

## Réalisé

### Tableau 7 colonnes – Dashboard Pasteur
- **Colonnes alignées au cahier des charges :** Nom, Prénom, Église (famille), Nombre de disciples, Avancement % (objectif 70), Nombre de disciples présents, Taux participation semaine.
- Tableau et export CSV/Excel mis à jour (7 colonnes ; « Présence Culte Samedi » et « Présence Culte Dimanche » fusionnées en « Nombre de disciples présents »).

### Flux superviseur → pasteur
- **SendReport.jsx :** le superviseur envoie un rapport avec `user_id` (lui-même), `pasteur_id` (récupéré depuis `profils.pasteur_id`), `status: 'submitted'`.
- **Vue Pasteur « Rapports reçus » :** section dédiée dans PasteurDashboard avec filtres année/mois, tableau (Superviseur, Type, Date, Voir), modal de détail (statistics_snapshot + content).
- Les rapports affichés sont ceux dont `user_id` appartient aux superviseurs du pasteur (profils avec `pasteur_id = pasteur.id`). Si la migration 074 est appliquée, les rapports ont aussi `pasteur_id` renseigné.

### Objectif 3 – État actuel (Transformation / OKR)
- **Transformation.jsx :** bibliothèque de parcours (`parcours_transformation`, `modules_parcours`), journal personnel (`journal_transformation` avec filtres date/thématique, édition, export), **évaluations continues** (`evaluations_croissance` : liste, filtres, formulaire d’ajout, graphiques), **suivi post-crise** (onglets « Ressources guérison » et « Suivi post-crise » : lecture `suivi_post_crise`, `historique_guerison`), statistiques (progression, graphiques), vue par disciple.
- **ParcoursDetail.jsx :** détail d’un parcours, modules, progression utilisateur (`user_parcours_progression`), modules complétés.
- Tables utilisées : `parcours_transformation`, `modules_parcours`, `user_parcours_progression`, `journal_transformation`, **evaluations_croissance**, **suivi_post_crise**, **historique_guerison** (migration 073).

## À compléter / vérifier (Objectif 3)

| Élément | Action |
|--------|--------|
| Évaluations continues | ✅ En place : table `evaluations_croissance`, formulaires, filtres, graphiques dans Transformation.jsx. |
| Module suivi post-crise | ✅ En place : tables `suivi_post_crise`, `historique_guerison` (migration 073) ; Transformation.jsx lit ces tables pour les onglets Ressources guérison / Suivi post-crise. Alertes/rappels à renforcer si besoin. |
| Ressources guérison et restauration | Catalogue, filtrage par type de besoin, recommandations (à enrichir si prévu). |
| Notifications | Notifier le pasteur à l’envoi d’un rapport, le superviseur à la consultation (optionnel). |

## Migrations utiles

- **074_add_pasteur_id_to_reports.sql** : ajoute `pasteur_id` à `reports` pour lier explicitement chaque rapport au pasteur de tutelle (déjà utilisé côté SendReport si la colonne existe).
