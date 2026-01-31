# Checklist – SendReport et Suivi de présence

Checklist de test pour **Envoyer un rapport** et **Suivi de présence** (Priorité 1).

---

## SendReport (Envoyer un rapport)

**Route :** `/send-report`  
**Prérequis :** Compte superviseur ou mentor (avec `pasteur_id` pour le message de confirmation).

### Envoi

- [ ] **Rapport vide** : Ne rien remplir, cliquer sur « Envoyer le Rapport » → une alerte propose d’annuler ou de confirmer l’envoi.
- [ ] **Annuler** : Choisir « Annuler » → le rapport n’est pas envoyé, le formulaire reste affiché.
- [ ] **Confirmer (rapport vide)** : Choisir « Confirmer » → le rapport est envoyé malgré tout (comportement actuel).
- [ ] **Rapport rempli** : Renseigner au moins un KPI (ex. Présences Dimanche), cliquer sur « Envoyer le Rapport » → envoi sans alerte.
- [ ] **Message de succès** : Après envoi, un message du type « Rapport envoyé avec succès ! À [email pasteur] » (ou sans email si pas de pasteur) s’affiche.
- [ ] **Disparition du message** : Le message de succès disparaît après environ 5 secondes.

### Prévisualisation

- [ ] **Bouton « Prévisualiser »** : Cliquer sur « Prévisualiser » → une modal s’ouvre.
- [ ] **Contenu** : La modal affiche le type de rapport, la période, les statistiques (disciples, évangélisations, présences, etc.) et les notes/témoignage si renseignés.
- [ ] **Annuler** : « Annuler » ferme la modal sans envoyer.
- [ ] **Confirmer et Envoyer** : « Confirmer et Envoyer » ferme la modal et envoie le rapport (même flux qu’« Envoyer le Rapport »).

### Historique

- [ ] **Bouton « Voir l’historique »** : Cliquer sur « Voir l’historique » → une modal « Historique des Rapports » s’ouvre.
- [ ] **Liste** : Les 10 derniers rapports de l’utilisateur s’affichent (type, période, date d’envoi, statistiques, contenu).
- [ ] **Après un nouvel envoi** : Fermer la modal, envoyer un rapport, rouvrir l’historique → le nouveau rapport apparaît en premier.

### Types de rapport

- [ ] **Mensuel** : Choisir mois + année, envoyer → le rapport est enregistré avec `report_type: mensuel`, `month`, `year`.
- [ ] **Hebdomadaire** : Choisir semaine + année, envoyer → `report_type: hebdomadaire`, `week_number`, `year`.
- [ ] **Trimestriel** : Choisir trimestre + année, envoyer → `report_type: trimestriel`, `quarter`, `year`.
- [ ] **Annuel** : Choisir année, envoyer → `report_type: annuel`, `year`.

### Export

- [ ] **Export PDF** : Cliquer sur « PDF » → un fichier PDF est téléchargé (contenu cohérent avec la page).
- [ ] **Export Excel** : Cliquer sur « Excel » → un fichier Excel est téléchargé (colonnes et données cohérentes).

---

## Suivi de présence (AttendanceTracking)

**Route :** `/attendance-tracking` (ou via le menu « Suivi de présence »).  
**Prérequis :** Compte disciple (ou rôle ayant accès à cette page).

### 6 activités

Vérifier que les 6 boutons d’activité s’affichent et que le formulaire change bien selon l’onglet :

- [ ] **1. Culte du Samedi Soir** (`saturday_evening_worship`)
- [ ] **2. Culte Dimanche Matin** (`sunday_worship`)
- [ ] **3. After Culte du Dimanche** (`after_culte`)
- [ ] **4. Temps de Prière** (`saturday_prayer`)
- [ ] **5. Temps de Partage** (`sunday_sharing`)
- [ ] **6. Sortie d’Évangélisation** (`evangelization_outing`)

### Enregistrement

- [ ] **Date** : Choisir une date (calendrier).
- [ ] **Présent** : Sélectionner « Présent », optionnellement « Nom d’église », puis enregistrer → une entrée est créée dans `attendance_tracking` avec `status: present`.
- [ ] **Absent** : Sélectionner « Absent », renseigner éventuellement la raison, enregistrer → entrée avec `status: absent`.
- [ ] **Changement d’onglet** : Changer d’activité → le formulaire se réinitialise (date du jour, statut « Présent »).

### Statistiques

- [ ] **Bloc stats** : Si au moins un enregistrement existe, les 4 cartes s’affichent : Total, Présences, Absences, Taux de présence (%).
- [ ] **Cohérence** : Total = Présences + Absences, Taux = (Présences / Total) × 100.

### Graphiques

- [ ] **Graphique par mois** : Les 6 derniers mois sont affichés (barres ou courbe) avec présents/absents par mois pour l’activité sélectionnée.
- [ ] **Changement d’activité** : Changer d’onglet → les données du graphique correspondent à la nouvelle activité.

### Export

- [ ] **Excel** : Cliquer sur « Excel » → téléchargement d’un fichier avec l’historique (colonnes : date, type, statut, etc.).
- [ ] **PDF** : Cliquer sur « PDF » → téléchargement d’un PDF de la zone « Suivi de présence » (contenu lisible).

### Recherche / pagination

- [ ] **Recherche** : Si une barre de recherche existe (date, statut, etc.), vérifier qu’elle filtre correctement la liste.
- [ ] **Pagination** : Si plus de 10 enregistrements, vérifier que la pagination affiche les pages suivantes.

---

## Résumé

| Page            | Envoi / Enregistrement | Prévisualisation | Historique | Export   | Stats / Graphiques |
|-----------------|------------------------|------------------|------------|----------|---------------------|
| SendReport      | ✅                     | ✅               | ✅ (10)    | PDF, Excel | -                |
| Suivi de présence | ✅ (6 activités)    | -                | Liste + pagination | PDF, Excel | ✅ (4 cartes + graphique 6 mois) |

Cocher les cases au fur et à mesure des tests. En cas d’échec, noter le scénario et le message d’erreur (console ou toast) pour correction.
