# Objectif 3 (Transformation / OKR) – Checklist

Page principale : **`/transformation`** (`src/pages/Transformation.jsx`). Détail d’un parcours : **`/transformation/:parcoursId`** (`src/pages/ParcoursDetail.jsx`).

## Onglets et tables

| Onglet | Table(s) principale(s) | À vérifier en base |
|--------|------------------------|--------------------|
| Bibliothèque | `parcours_transformation`, `modules_parcours` | Présence des parcours et modules. |
| Mes Formations / Mes Parcours | `user_parcours_progression`, `user_module_progression` | Progression utilisateur. |
| Journal | `journal_transformation` | Entrées journal (date, thématique, contenu). |
| Évaluations | `evaluations_croissance` | Évaluations liées aux parcours. |
| Statistiques | Données dérivées des parcours et du journal | — |
| Guérison | `resources` ou `parcours_transformation` (filtre catégorie/thématique guérison) | Ressources avec category/thematique contenant guérison/restauration. |
| Suivi Post-Crise | `suivi_post_crise`, `historique_guerison` (migration 073) | Tables créées par 073. |

## Prérequis migrations

- **016** (ou équivalent) : `parcours_transformation`, `modules_parcours`, `user_parcours_progression`, `journal_transformation`, `evaluations_croissance`.
- **073** : `suivi_post_crise`, `historique_guerison`.

Si un onglet ne remonte pas de données : vérifier que les tables existent et que les RLS (Supabase) autorisent la lecture pour l’utilisateur connecté.

## Référence

- Rapport : **RAPPORT_TOUT_A_IMPLEMENTER.md** § 3.1 (Objectif 3).
- Code : `src/pages/Transformation.jsx`, `src/pages/ParcoursDetail.jsx`.
