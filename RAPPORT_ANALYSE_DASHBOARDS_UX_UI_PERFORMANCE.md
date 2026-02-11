# Rapport d’analyse des dashboards – UX/UI et performance

**Date :** 10 février 2026  
**Périmètre :** Dashboards Pasteur, Superviseur, Mentor, Disciple (+ AdminDashboard, composants partagés).  
**Objectif :** Amélioration UX/UI et performance. **Aucune modification de code n’a été effectuée.**

---

## 1. Vue d’ensemble

### 1.1 Architecture

| Dashboard        | Fichier principal        | Lignes (approx.) | Données / Hook principal                          |
|-----------------|--------------------------|------------------|----------------------------------------------------|
| **Pasteur**     | `PasteurDashboard.jsx`   | ~3 280           | État local + `fetchPasteurData`, RPC, cache        |
| **Superviseur** | `SuperviseurDashboard.jsx` | ~474          | `useSuperviseurDashboard` (hook dédié)             |
| **Mentor**      | `MentorDashboard.jsx`    | ~600             | État local + `fetchMentorData`, cache              |
| **Disciple**    | `DiscipleDashboard.jsx`  | ~515             | État local + `fetchDashboardData`, cache           |
| **Admin**       | `AdminDashboard.jsx`     | ~40              | Router par rôle → Pasteur / Mentor / Disciple     |

- **Superviseur** : le plus modulaire (sous-composants dans `superviseur/`, hook `useSuperviseurDashboard`).
- **Pasteur** : très volumineux, beaucoup de logique et d’UI dans un seul fichier.
- **Mentor / Disciple** : structure proche (cartes, tableau `MembersTableCard`, arbre embed).

### 1.2 Composants partagés

- `MembersTableCard` : tableau membres (recherche, filtres, pagination, export, sélection) – utilisé Pasteur, Superviseur, Mentor, Disciple.
- `ArbreGenealogiqueEmbed` : arbre famille/pasteur – utilisé dans les 4 dashboards.
- `useMembersTable` : filtres, pagination, sélection pour les listes de membres.
- UI : `Card`, `Button`, `Badge`, `Dialog`, `Table`, etc. (design system cohérent).

---

## 2. Points forts

- **Cache** : Disciple et Mentor utilisent `getOrSetCache` (TTL 1–2 min) pour limiter les appels Supabase.
- **Requêtes parallèles** : `Promise.all` pour stats (Mentor : prières, présences ; Disciple : RDV + prières).
- **Lazy loading** (Superviseur) : `IntersectionObserver` pour charger graphiques (formations/vidéos, statuts spirituels, activité récente, stats comparatives) au scroll.
- **Garde anti double-fetch** : Pasteur utilise `fetchPasteurInProgressRef` pour éviter boucles.
- **Spinner pleine page** uniquement au premier chargement (Pasteur, Superviseur) ; pas de re-spinner à chaque changement de filtre KPI.
- **Réutilisation** : même tableau membres, même embed arbre, même patterns de boutons (Export PDF/Excel).
- **Helmet** : titres de page (Pasteur, Superviseur) pour SEO et accessibilité.
- **Rappel rapport** : Mentor et Superviseur affichent un rappel (5 jours avant fin du mois).

---

## 3. UX / UI – axes d’amélioration

### 3.1 États de chargement

- **Problème** : partout des spinners (`Loader2`) ou du texte « Chargement... » ; peu de chargement progressif ou différé par section.
- **Impact** : perception de lenteur si tout est bloqué sur une seule requête.
- **Recommandation (sans skeletons)** :
  - Chargement par onglet / vue : ne charger que les données de la vue affichée.
  - Cache TTL (stale-while-revalidate) pour réafficher les données en cache immédiatement puis mettre à jour en arrière-plan.
  - Affichage progressif : afficher chaque bloc dès que ses données sont prêtes (spinner localisé dans le bloc, pas pleine page après le premier load).
  - Lazy load des graphiques (IntersectionObserver) et requêtes légères (champs nécessaires uniquement).

### 3.2 Cohérence des libellés et des parcours

- **Titres** : « Mon Espace Disciple » vs « Tableau de Bord Mentor » vs « Bienvenue, [nom] » (Pasteur) – styles et niveaux hiérarchiques différents.
- **Bouton « Retour »** : présent sur Pasteur (en haut), pas sur Mentor/Disciple ; Superviseur utilise `SuperviseurDashboardHeader` avec `onBack`.
- **Accès Arbre** : Disciple a à la fois la carte embed + un bouton « Arbre généalogique » dans Accès rapide ; Mentor a l’embed + un bouton « Arbre généalogique » en haut. À clarifier selon le parcours prioritaire.
- **Recommandation** : définir une charte (titre H1, sous-titre, emplacement du retour, ordre des blocs) et l’appliquer à tous les rôles.

### 3.3 Données mockées / incohérences

- **Mentor** : `meetingsCount: 3`, `unreadMessages: 0`, `bibleStudiesCount: 3`, `acceptedChristCount: 0` sont en dur ; certaines barres de métriques utilisent des cibles fixes (ex. « Échanges » 12/20, « Accompagnement » 2/6).
- **Pasteur** : la fonction `nombreMembresPourStats(nb, familleId)` remplace encore la valeur **53** par un nombre entre 40 et 65 (hash sur `familleId`) pour les stats affichées. Incohérent avec l’objectif « vrais chiffres » (Familles de disciples a déjà été corrigé).
- **Recommandation** :
  - Remplacer les métriques mockées par des données réelles ou masquer les indicateurs non alimentés.
  - Supprimer ou aligner `nombreMembresPourStats` avec la même logique que Familles de disciples (afficher le nombre réel).

### 3.4 Gestion d’erreurs et états vides

- **Erreurs** : `useErrorHandler` / `handleError` sont utilisés ; les toasts d’erreur sont présents, mais il n’y a pas toujours de zone dédiée « Erreur de chargement » avec action « Réessayer ».
- **États vides** :
  - Superviseur : message clair « Aucune famille assignée » avec icône.
  - Tableaux : pas de message explicite du type « Aucun membre ne correspond aux filtres » dans le bloc principal (le toast à l’export le fait partiellement).
- **Recommandation** : pour chaque liste/tableau, prévoir un état vide avec illustration ou icône + message + action (ex. « Réinitialiser les filtres »).

### 3.5 Accessibilité

- **ARIA** : peu d’attributs `aria-*` ou `role` sur les dashboards (hors composants génériques). Les cartes cliquables (Disciple : RDV, Prière, Ressources, Vidéo) n’ont pas de `role="button"` ni de gestion clavier explicite.
- **Focus** : pas de gestion visible du focus (skip link, focus trap dans modales).
- **Contraste** : dégradés (ex. Pasteur bienvenue, cartes Disciple) à vérifier (WCAG AA).
- **Recommandation** :
  - Ajouter `aria-label` / `aria-describedby` sur les cartes d’action et les zones de stats.
  - S’assurer que les modales (Dialog) gardent le focus et le restituent à la fermeture.
  - Vérifier les contrastes (texte sur fond dégradé, badges).

### 3.6 Mobile / responsive

- **Grilles** : `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` (ou 3) utilisées ; globalement correct.
- **Pasteur** : tableaux larges (familles, mentors) ; risque de scroll horizontal sur petit écran.
- **Boutons** : « Ajouter un disciple », « Arbre généalogique » en `flex-wrap` ; à valider sur très petit écran (empilement, taille tactile).
- **Recommandation** : tester les vues Pasteur et Superviseur sur mobile ; prévoir tableaux en mode « cartes » ou liste simplifiée sur petit écran si nécessaire.

### 3.7 Hiérarchie visuelle et densité

- **Pasteur** : beaucoup d’informations (KPI, familles, tableau membres, mentors consolidés, arbre, rapports). Peu d’ancres ou de navigation interne.
- **Superviseur** : défilement long ; sections bien séparées mais pas de « sommaire » ou ancres.
- **Recommandation** : ajouter un sommaire fixe (ancres) ou un menu « Sur cette page » pour Pasteur et Superviseur ; alléger la densité par repli de sections (accordéons) pour les blocs secondaires.

---

## 4. Performance

### 4.1 Déjà en place

- Cache (Disciple, Mentor).
- Lazy loading des graphiques (Superviseur).
- Évitation du double fetch (Pasteur).
- Chargement des détails du modal famille (Pasteur) uniquement à l’ouverture.

### 4.2 À améliorer

- **Pasteur** :
  - Un seul très gros composant ; les changements d’état (filtres KPI, sélection famille) peuvent provoquer de gros re-renders.
  - `fetchMentorsConsolides` dépend de `familles.length` ; si la liste familles change souvent, multiplier les appels.
- **Mentor** : `fetchMentorData` récupère tous les disciples avec `select('*')` ; limiter les colonnes si possible.
- **Données** : pas de pagination côté serveur pour les listes de membres (Pasteur, Superviseur) ; tout est chargé puis paginé côté client. Pour des familles très grandes, envisager une pagination ou un chargement progressif côté API.
- **Recommandation** :
  - Découper Pasteur en sous-composants (bloc KPI, bloc Familles, bloc Tableau membres, etc.) et mémoïser les parties lourdes (`React.memo` / `useMemo` là où c’est pertinent).
  - Réduire les colonnes dans les `select` Supabase aux champs réellement utilisés.
  - Pour les listes très longues, envisager une API paginée ou un virtual scroll.

### 4.3 Bundling

- Les dashboards sont en `lazy()` dans le routeur (Mentor, Admin, Superviseur) ; Disciple et Pasteur sont chargés via AdminDashboard. Vérifier que les écrans les plus utilisés (ex. Disciple, Mentor) ne chargent pas inutilement du code Pasteur/Superviseur.

---

## 5. Synthèse des recommandations par priorité

### Priorité haute

1. **Réduire le temps de chargement sans skeletons** : chargement par onglet, cache TTL (stale-while-revalidate), affichage progressif par bloc avec spinner localisé, lazy load des graphiques (IntersectionObserver), requêtes légères.
2. **Supprimer ou aligner `nombreMembresPourStats`** (Pasteur) avec les vrais chiffres, comme sur Familles de disciples.
3. **Remplacer les métriques mockées** (Mentor : meetingsCount, bibleStudiesCount, Échanges, Accompagnement, etc.) par des données réelles ou retirer ces indicateurs.
4. **États vides explicites** : message + action pour chaque liste/tableau quand il n’y a aucun résultat (ou aucun membre).

### Priorité moyenne

5. **Cohérence des en-têtes** : titre H1, sous-titre, bouton Retour identiques en comportement sur tous les dashboards.
6. **Accessibilité** : `aria-label` sur les cartes et zones cliquables, gestion du focus dans les modales.
7. **Refactor Pasteur** : extraire des sous-composants et réduire la taille du fichier pour maintenabilité et performance.

### Priorité basse

8. **Ancres / sommaire** sur Pasteur et Superviseur pour la navigation dans la page.
9. **Pagination ou virtualisation** côté serveur pour les très grandes listes de membres.
10. **Tests responsive** ciblés (tableaux Pasteur, boutons, arbre) sur mobile.

---

## 6. Fichiers analysés (référence)

- `src/pages/dashboards/PasteurDashboard.jsx`
- `src/pages/dashboards/SuperviseurDashboard.jsx`
- `src/pages/dashboards/MentorDashboard.jsx`
- `src/pages/dashboards/DiscipleDashboard.jsx`
- `src/pages/dashboards/AdminDashboard.jsx`
- `src/hooks/useSuperviseurDashboard.js`
- `src/components/MembersTableCard.jsx`
- `src/components/ArbreGenealogiqueEmbed.jsx`
- `src/pages/dashboards/superviseur/` (StatsRapidesEtActions, WelcomeBanner, KpiSection, ChartsKpi, etc.)

---

*Rapport généré à partir de l’analyse du code ; aucune modification n’a été appliquée.*
