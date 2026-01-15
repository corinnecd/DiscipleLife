# Tableau des Pasteurs et Superviseurs (Référents)

## 📊 PASTEURS

| # | Identifiant | Prénom | Nom | Email | Mot de passe |
|---|-------------|--------|-----|-------|--------------|
| 1 | PASTEUR-001 | DR | MODE | dr.mode@disciplelife.com | Pasteur001!2024 |
| 2 | PASTEUR-002 | PS | JULIANA | ps.juliana@disciplelife.com | Pasteur002!2024 |
| 3 | PASTEUR-003 | PS | PEGGY NN | ps.peggy.nn@disciplelife.com | Pasteur003!2024 |
| 4 | PASTEUR-004 | PS | JESSY | ps.jessy@disciplelife.com | Pasteur004!2024 |

---

## 📊 SUPERVISEURS (RÉFÉRENTS)

| # | Identifiant | Prénom | Nom | Email | Mot de passe | Pasteur de tutelle |
|---|-------------|--------|-----|-------|--------------|-------------------|
| 1 | - | Alain | SIL | alain.sil@example.com | TempPassword123! | À assigner |
| 2 | - | Andréa | ERNEST | andrea.ernest@example.com | TempPassword123! | À assigner |
| 3 | - | Béraca | KAZONGO | beraca.kazongo@example.com | TempPassword123! | À assigner |
| 4 | - | BETSALEEL | BADILA | betsaleel.badila@example.com | TempPassword123! | À assigner |
| 5 | - | CARINE | MATONDO | carine.matondo@example.com | TempPassword123! | À assigner |
| 6 | - | COCO | OKANZI | coco.okanzi@example.com | TempPassword123! | À assigner |
| 7 | - | CYNTHIA | ALLOH | cynthia.alloh@example.com | TempPassword123! | À assigner |
| 8 | - | ELISABETH | AMECY | elisabeth.amecy@example.com | TempPassword123! | À assigner |
| 9 | - | Andréa | Ernest | andrea.ernest2@example.com | TempPassword123! | À assigner |
| 10 | - | EPHREM | MBA | ephrem.mba@example.com | TempPassword123! | À assigner |
| 11 | - | GERVAIS | NKATOULOULOU | gervais.nkatouloulou@example.com | TempPassword123! | À assigner |
| 12 | - | Andréa | Ernest | andrea.ernest3@example.com | TempPassword123! | À assigner |
| 13 | - | HÉLÈNE | LAMAGO | helene.lamago@example.com | TempPassword123! | À assigner |
| 14 | - | JOCELYNE | FORTUNE | jocelyne.fortune@example.com | TempPassword123! | À assigner |
| 15 | - | KARINE | WILLIAM | karine.william@example.com | TempPassword123! | À assigner |
| 16 | - | KEVIN | THÉA | kevin.thea@example.com | TempPassword123! | À assigner |
| 17 | - | LAETITIA | OBAME | laetitia.obame@example.com | TempPassword123! | À assigner |
| 18 | - | MANICIA | THÉA | manicia.thea@example.com | TempPassword123! | À assigner |
| 19 | - | NANCY | NZI | nancy.nzi@example.com | TempPassword123! | À assigner |
| 20 | - | NASDÈNE | KODIA | nasdene.kodia@example.com | TempPassword123! | À assigner |
| 21 | - | PATRICK | BATSIAGA | patrick.batsiaga@example.com | TempPassword123! | À assigner |
| 22 | - | PROSPERE | LEBA | prospere.leba@example.com | TempPassword123! | À assigner |
| 23 | - | ROCHELLE | PASSI BEN | rochelle.passiben@example.com | TempPassword123! | À assigner |
| 24 | - | SERGE | AMANY | serge.amany@example.com | TempPassword123! | À assigner |
| 25 | - | SNELLA | MOUSSIO | snella.moussio@example.com | TempPassword123! | À assigner |
| 26 | - | YVAN | DESSANDE | yvan.dessande@example.com | TempPassword123! | À assigner |

---

## 📝 Notes importantes

- **Mots de passe des Pasteurs** : Les mots de passe sont définis lors de la création des comptes via le script `create_pasteurs.js`
- **Mots de passe des Superviseurs** : Mot de passe temporaire `TempPassword123!` - les utilisateurs devront le changer à la première connexion
- **Pasteur de tutelle** : Les superviseurs doivent être assignés à un pasteur lors de leur inscription ou via une migration SQL
- **Identifiants uniques** : Les superviseurs n'ont pas encore d'identifiants uniques assignés dans le script de création

---

## 🔄 Pour obtenir les données à jour depuis la base de données

Exécutez le script :
```bash
node scripts/list_pasteurs_superviseurs.js
```

**Prérequis** : Le fichier `.env` doit contenir `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`

---

*Document généré le : $(date)*
