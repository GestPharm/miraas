# miraas

Calculateur d'héritage islamique — projet restructuré.

Structure proposée:

- `public/` : contenu statique (HTML/CSS/JS)
  - `public/index.html` : page principale
  - `public/css/style.css` : styles
  - `public/js/app.js` : logique front-end

Usage rapide:

1. Installer (optionnel) : `npm install`
2. Lancer le serveur de développement :

```bash
npm run dev
```

La page sera disponible sur http://localhost:3000

Si vous préférez ouvrir localement, ouvrez `public/index.html` dans votre navigateur.

**Note importante :** Ce calculateur se base sur les rites malikites et ne fournit qu'une estimation pour des cas simples. Il ne remplace pas l'avis d'un savant ou d'un juriste spécialisé en droit successoral islamique. Pour toute succession réelle, consultez un savant compétent afin d'obtenir une répartition officielle et juridiquement valable.

Si vous voulez que je refactore la logique de calcul en modules, ou passer le projet en Node/Express, dis-le-moi et je m'en occupe.

## Algorithme et règles (résumé Malikite)

Résumé fonctionnel de l'algorithme implémenté dans `public/js/app.js` et des hypothèses malikites appliquées :

- 1. Entrées : valeur de la succession et présence/nombre des héritiers (conjoint, enfants, parents, petits‑enfants, frères/sœurs, grands‑parents).
- 2. Calcul des **parts fixes (Fard)** : époux/épouse, mère, père (si conditions), sœurs seules, etc. Ces parts sont calculées en priorité et sommées dans `totalShares`.
- 3. Conjoint :
  - Épouse(s) reçoit 1/8 s'il y a descendants, sinon 1/4.
  - Époux reçoit 1/4 s'il y a descendants, sinon 1/2.
- 4. Parents :
  - Mère : 1/6 en présence de descendants ou si >=2 frères/sœurs ou père présent ; sinon 1/3.
  - Père : dans l'implémentation actuelle, si des descendants sont présents il reçoit 1/6 ; en l'absence de descendants il reçoit 1/6 puis, si le reliquat le permet, un complément (logique `1/6 + complément`).
- 5. Enfants directs : lorsque présents, le reliquat est distribué entre enfants en unités (fils=2, fille=1) — fils double de la fille (Asabah).
- 6. Petits‑enfants : dans l'implémentation malikite ici, les petits‑enfants par fils et par fille sont inclus en représentation (ta'sib) si les enfants directs sont absents. Ils reçoivent des unités avec fils=2 et filles=1.
- 7. Frères/sœurs et grands‑parents : appliqués selon l'ordre de priorité classique (après enfants/petits‑enfants et parents), avec règles spécifiques pour sœur seule (1/2) ou 2+ sœurs (2/3) et unités asabah quand il y a frères.
- 8. Affichage : les parts sont montrées en pourcentage et en fraction mixte (ex. `1 1/2`) pour lisibilité.

Limitations et hypothèses importantes :

- L'algorithme applique les règles malikites de base listées ci‑dessus mais **ne couvre pas tous les cas juridiques complexes** (ex. enfants posthumes, disqualifications, validité des mariages mixtes, etc.).
- **Awl (réduction proportionnelle des parts fixes si la somme des parts fixes > 100%)** : non implémenté automatiquement. Si la somme des parts fixes dépasse 1, le comportement peut produire un reliquat négatif ou des distributions inattendues — il faut ajouter une étape d'awl pour conformité stricte.
- Les règles sensibles (représentation, priorité entre branches, traitement des petits‑enfants par fille dans certaines circonstances) ont été adaptées pour suivre la version malikite demandée, mais **il est recommandé de faire valider par un spécialiste malikite** pour des cas réels.

Tests recommandés :

- Cas de base : défunt avec épouse + enfants (vérifier que l'épouse reçoit 1/8 si enfants présents).
- Défunt sans enfants mais avec petits‑enfants par fille (valider distribution par représentation).
- Défunt sans descendants mais père présent (valider que le père reçoit `1/6 + complément`).
- Cas où la somme des parts fixes dépasse 100% (vérifier nécessité d'implémenter awl).

Si tu veux, j'ajoute une suite de tests automatisés (JSON + petit runner) pour couvrir ces cas et prévenir les régressions.
