# Propositions d’amélioration – Dashboard Pasteur

**Objectif :** KPI et graphiques performants et interactifs, pages fluides et moins chargées.

---

## 1. Problèmes actuels

- **Une seule page très longue** : bandeau → KPI → KPI globaux → progression (2 bar charts) → KPI période (12 cartes) → 4 graphiques d’évolution → recherche → rapports → liste familles → tableau familles → tableau membres → tableau mentors → arbre → modales. Beaucoup de scroll, pas de respiration.
- **KPI période** : 12 cartes colorées (culte samedi, dimanche, etc.) prennent beaucoup d’espace pour une seule période ; peu d’interactivité (clic sans action claire).
- **Graphiques** : BarCharts progression en 2 colonnes (6 + 6 familles), AreaCharts/LineCharts en grille ; pas de drill-down (ex. clic famille → détail), pas de filtres directs sur les courbes.
- **Tableaux** : chargés d’un coup ; pas de lazy load ni de vue “résumé puis détail”.
- **Chargement** : spinners pleine page ou par bloc ; peu de chargement progressif ou différé par section.

---

## 2. Structure proposée : onglets / sous-pages

Découper le dashboard en **vues ciblées** pour alléger chaque écran et garder une navigation claire.

| Onglet / page | Contenu principal | Objectif |
|---------------|-------------------|----------|
| **Vue d’ensemble** | Bandeau + 4 KPI synthèse (Superviseurs, Familles, Disciples, Progression) + 1 graphique phare (ex. progression globale ou objectif vs atteint) + liens rapides (Familles, Rapports, Arbre) | Premier écran léger, message en 5 secondes |
| **KPI & Période** | Sélecteur période (hebdo / mensuel / trim. / annuel) + KPI de la période (représentation graphique plutôt que 12 cartes) + 2–3 graphiques d’évolution interactifs | Focus sur les indicateurs avec choix de période |
| **Familles** | Recherche/filtres + liste familles (cartes ou tableau) + détail au clic (modal ou panneau) | Tout le flux “familles” au même endroit |
| **Membres & Mentors** | Tableau membres (avec pagination / virtualisation) + tableau mentors consolidé, éventuellement en sous-onglets | Données détaillées sans surcharger la vue KPI |
| **Rapports & Arbre** | Rapports reçus (résumé + lien “Voir tous”) + Arbre généalogique (embed ou lien) | Accès direct sans mélanger avec les KPI |

**Navigation :** Onglets horizontaux sous le bandeau (style tabs) ou menu latéral court. Une URL par onglet permet de partager / revenir directement (ex. `/dashboard/pasteur?tab=kpi`).

**Bénéfices :** Chaque vue affiche moins d’éléments ; chargement possible par onglet (lazy data) ; moins de re-renders inutiles.

---

## 3. Graphiques et KPI plus performants et interactifs

### 3.1 Vue d’ensemble

- **4 cartes KPI** : garder les 4 (Superviseurs, Familles, Disciples, Progression). Option : mini sparkline (tendance 3–6 derniers mois) dans chaque carte pour donner du contexte sans quitter la page.
- **Un seul graphique phare** au lieu de tout enchaîner :
  - **Option A** : Barres horizontales “Progression par famille” (objectif 70) avec **clic sur une barre** → ouverture du détail de la famille (modal ou redirection).
  - **Option B** : Donut / demi-jauge “Progression globale” (ex. 53 % vers objectif) + répartition par tranche (0–25 %, 25–50 %, 50–75 %, 75–100 %, objectif atteint). Clic sur un segment → filtre “familles dans cette tranche”.
- **Lazy load** : ne charger les données du graphique phare qu’une fois la vue visible (IntersectionObserver), comme sur le dashboard Superviseur.

### 3.2 KPI avec sélection de période

- **Remplacer les 12 cartes** par :
  - **Un bloc “Résumé période”** : 3–4 indicateurs clés (ex. Cultes, Prière/Partage, Évangélisation, Nouveaux convertis) en cartes compactes ou en barres comparatives.
  - **Un graphique interactif** : par ex. BarChart groupé (une barre par indicateur pour la période) avec tooltip détaillé ; ou graphique radar pour comparer plusieurs périodes (ce mois vs mois dernier).
- **Interactivité** :
  - Clic sur un KPI → affichage de l’évolution dans le temps (mini LineChart ou panneau détail).
  - Sélecteur période (hebdo / mensuel / trim. / annuel) qui met à jour uniquement ce bloc (éviter de recharger toute la page).

### 3.3 Progression des familles

- **Un seul BarChart horizontal** (ou un par “page” de 8–10 familles avec pagination) au lieu de 2 colonnes fixes de 6.
- **Interactivité** :
  - **Tooltip** : nom famille, superviseur, progression %, nombre de disciples, objectif.
  - **Clic sur une barre** : ouvrir la fiche famille (modal ou panneau latéral) ou naviguer vers “Familles” avec cette famille présélectionnée.
- **Filtres rapides** : “Objectif atteint” / “En cours” / “Toutes” pour alléger visuellement.
- **Tri** : par progression, par nombre de disciples, par nom (sans recharger toute la page).

### 3.4 Évolution des KPI (12 derniers mois)

- **Garder 2–3 graphiques** au lieu de 4 : par ex. “Cultes & présence”, “Prière & partage”, “Évangélisation & nouveaux convertis”. Les regrouper par thème réduit la hauteur de page.
- **Interactivité** :
  - **Tooltip** : valeur exacte + comparaison au mois précédent (ex. “+12 %” en vert).
  - **Sélecteur de séries** : cocher/décocher les courbes (ex. masquer “After culte” pour ne voir que Samedi / Dimanche).
  - **Zoom** : option “Derniers 3 mois” / “6 mois” / “12 mois” pour ne charger que les données utiles.
- **Performance** : ne rendre que les graphiques dont le conteneur est visible (lazy load), et limiter les points affichés (agrégation par mois déjà en place).

### 3.5 KPI “Total Disciples par Pasteur” (vue admin)

- Conserver la grille de cartes par pasteur + cumul.
- **Interactivité** : clic sur une carte → filtre “familles de ce pasteur” dans l’onglet Familles ou ouverture d’un panneau détail (liste familles + total).

---

## 4. Pages fluides et moins chargées

### 4.1 Chargement progressif

- **Vue d’ensemble** : charger en priorité bandeau + 4 KPI (une requête légère ou cache). Puis charger le graphique phare (une requête dédiée).
- **Onglet KPI & Période** : charger les données de la période uniquement quand l’onglet est actif (ou au focus). Éviter de tout précharger.
- **Onglet Familles** : charger la liste (résumée) en premier ; détails (membres, rapports) au clic sur une famille (déjà partiellement en place avec le modal).
- **Onglet Membres & Mentors** : charger les membres avec pagination côté client (déjà en place) ; pour les mentors, envisager pagination ou “charger plus” si la liste est longue.

### 4.2 Réduire le temps de chargement (sans skeletons)

**Pas de skeletons sur le site** — utiliser les leviers suivants pour un chargement plus rapide et une meilleure réactivité :

- **Chargement par onglet (lazy data)**  
  Ne charger les données que de l’onglet actif. Au premier clic sur un onglet, lancer les requêtes de cet onglet uniquement. Réduit le volume de requêtes au premier affichage et évite de tout charger d’un coup.

- **Cache avec TTL (comme Mentor/Disciple)**  
  Mettre en cache les réponses des appels pasteur (KPI, familles, rapports) avec un TTL court (ex. 1–2 min). Afficher tout de suite les données en cache si présentes, puis mettre à jour en arrière-plan (stale-while-revalidate). Le pasteur revoit la page quasi instantanément quand il revient.

- **Requête initiale légère**  
  Vue d’ensemble : une seule requête agrégée (ou RPC) qui renvoie les 4 KPI + éventuellement les libellés des familles pour le graphique phare, sans détail membres/rapports. Éviter `select('*')` ; ne demander que les champs nécessaires.

- **Affichage progressif**  
  Afficher dès réception : d’abord le bandeau (statique ou depuis cache), puis les 4 KPI dès que la requête KPI est revenue, puis le graphique phare quand ses données sont prêtes. Pas d’attente “tout ou rien” : chaque bloc apparaît dès qu’il est prêt (spinner localisé dans le bloc si besoin, petit et discret).

- **Graphiques chargés à l’affichage (IntersectionObserver)**  
  Ne charger les données des graphiques (et ne monter les composants Recharts lourds) que lorsque la section entre dans le viewport. Réduit le coût initial (moins de requêtes, moins de rendu) et accélère le premier affichage.

- **Prefetch au survol des onglets**  
  Au survol d’un onglet (hover), déclencher en arrière-plan le chargement des données de cet onglet. Au clic, les données sont souvent déjà là, donc affichage immédiat. Gérer l’annulation si l’utilisateur quitte sans cliquer.

- **Éviter les doubles requêtes**  
  Garder un garde-fou (ref “fetch in progress”) comme aujourd’hui ; en plus, quand on change d’onglet puis on revient, réutiliser le cache ou les données déjà en mémoire au lieu de refetch systématique (sauf action “Rafraîchir”).

- **Pagination côté serveur (optionnel)**  
  Pour “Membres des familles” et “Mentors consolidés”, si les listes sont très longues : pagination ou “charger plus” côté API (limit/offset ou cursor). Réduit le temps de la première réponse et le transfert.

- **Spinner localisé et discret**  
  Pas de spinner pleine page après le premier chargement. Pour chaque bloc (KPI, graphique, liste), un petit indicateur dans le bloc (icône tournante + “Chargement…” si besoin). La page reste lisible pendant les chargements.

Ces mesures réduisent le temps perçu de chargement et le volume de requêtes sans introduire de skeletons.

### 4.3 Réduction de la densité par vue

- **Vue d’ensemble** : pas de tableau, pas de liste familles complète ; uniquement synthèse + 1 graphique + actions rapides.
- **KPI & Période** : pas de liste familles ni de tableaux ; uniquement sélecteur + indicateurs + graphiques d’évolution.
- **Familles** : pas de graphiques d’évolution ; uniquement recherche, liste, détail au clic.
- **Membres & Mentors** : uniquement les deux tableaux (avec filtres et export).

Chaque onglet a un objectif unique, ce qui limite le nombre de composants montés et le temps de rendu.

### 4.4 Technique

- **Découper `PasteurDashboard.jsx`** en sous-composants par onglet (ex. `PasteurOverview`, `PasteurKpiPeriod`, `PasteurFamilies`, `PasteurMembersMentors`, `PasteurReportsTree`). Chaque sous-composant charge ses données (props ou hook dédié) pour permettre le lazy load par onglet.
- **Hooks dédiés** : par ex. `usePasteurOverview()`, `usePasteurKpiPeriod(period)`, `usePasteurFamilies()` pour isoler la logique et les requêtes.
- **Memo** : mémoïser les données dérivées (filteredFamilles, chartData, etc.) et les composants de graphiques (React.memo) pour éviter les re-renders en cascade quand seul un filtre change.

---

## 5. Récapitulatif des propositions

| Priorité | Proposition | Impact |
|----------|-------------|--------|
| Haute | Découper le dashboard en **onglets** (Vue d’ensemble, KPI & Période, Familles, Membres & Mentors, Rapports & Arbre) | Pages fluides, moins chargées |
| Haute | **Chargement par onglet** : ne charger les données que de l’onglet actif ; **cache TTL** (stale-while-revalidate) pour réaffichage instantané | Temps de chargement réduit, pas de tout charger d’un coup |
| Haute | **Affichage progressif** : bandeau → 4 KPI dès dispo → graphique phare dès dispo ; spinners localisés par bloc, pas de blocage pleine page | Réactivité perçue |
| Haute | Remplacer les **12 cartes KPI période** par un résumé (3–4 indicateurs) + **1 graphique interactif** (barres ou radar) avec tooltip et option de détail au clic | UX plus claire, moins de scroll |
| Moyenne | **Un graphique phare** sur la vue d’ensemble (progression par famille ou jauge globale) avec **clic barre → détail famille** | Interactivité et accès rapide au détail |
| Moyenne | **Lazy load** des graphiques (IntersectionObserver) et **prefetch au survol** des onglets pour affichage immédiat au clic | Performance et stabilité |
| Moyenne | **Filtres et tri** sur le graphique “Progression des familles” (objectif atteint / en cours, tri par % ou disciples) | Interactivité sans quitter la page |
| Basse | **Requêtes légères** : champs strictement nécessaires, pas de `select('*')` ; pagination serveur pour très longues listes | Réduction du temps de réponse et du transfert |
| Basse | **Sélecteur de séries** sur les graphiques d’évolution (afficher/masquer courbes) | Lisibilité sur des périodes longues |

---

## 6. Ordre de mise en œuvre suggéré

1. **Onglets** : introduire la navigation par onglets et déplacer le contenu actuel dans chaque onglet (sans changer encore le détail des graphiques). Vérifier que les URLs et le retour “onglet précédent” fonctionnent.
2. **Chargement par onglet + cache** : ne charger les données que de l’onglet actif ; intégrer le cache (getOrSetCache / stale-while-revalidate) pour les requêtes pasteur ; affichage progressif (bandeau → KPI → graphique) avec spinners localisés par bloc.
3. **KPI période** : remplacer les 12 cartes par le résumé + 1 graphique (ex. BarChart par indicateur pour la période) avec tooltip.
4. **Interactivité** : clic sur une barre “Progression des familles” → détail famille ; lazy load des graphiques (IntersectionObserver) ; optionnel : prefetch au survol des onglets.
5. **Graphiques d’évolution** : regrouper en 2–3 blocs, ajouter sélecteur de séries et lazy load à l’affichage.

Ce document sert de base pour les choix produit et les sprints de développement ; les modifications de code pourront être faites par étapes selon ces priorités. **Aucun skeleton n’est prévu sur le site** ; la réduction du temps de chargement repose sur le cache, le chargement par onglet, l’affichage progressif et le lazy load.
