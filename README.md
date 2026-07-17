# Aliénor’s Swiftie Experience — Alpha 1

## Mise en ligne sur GitHub Pages
1. Créez un dépôt GitHub public.
2. Déposez à la racine : `index.html`, `styles.css`, `data.js`, `app.js`.
3. Dans **Settings > Pages**, choisissez **Deploy from a branch**, branche `main`, dossier `/root`.
4. GitHub affiche ensuite l’adresse publique du site.

## Fonctions incluses
- Accueil personnalisé pour Aliénor.
- Quatre thèmes saisonniers mémorisés dans le navigateur.
- Catalogue des albums studio, avec priorité aux Taylor’s Versions.
- Notation sur 4 critères et classement général.
- Blindtest 1 / 5 / 10 / 20 avec trois difficultés.
- Recherche automatique d’extraits de 30 secondes via l’API publique iTunes.
- Quiz 1 / 5 / 10 / 20, catégories mélangées.
- Sauvegarde locale automatique des notes.

## État de cette alpha
L’interface et les moteurs sont fonctionnels. Le fichier `data.js` contient volontairement un catalogue de démonstration abrégé et une première base de questions. La prochaine étape est de compléter toutes les tracklists, enrichir le quiz, ajouter les photos sous licence et améliorer la tolérance des réponses du blindtest.

## Données
Les notes sont stockées avec `localStorage` dans le navigateur. Aucun compte Apple ni compte joueur n’est requis.


## Alpha 2
- Sélecteur de thèmes toujours visible avec quatre pastilles colorées.
- Ambiances saisonnières nettement renforcées.
- Bouton retour contextuel sur tous les écrans.
- Chargement automatique des pochettes d’albums depuis l’API publique iTunes.
- Les images restent distantes et ne sont pas redistribuées dans l’archive.


## Alpha 3
- Correction du changement de thème : le sélecteur ciblait auparavant aussi la balise HTML, ce qui pouvait annuler le choix.
- Une seule pastille de couleur reste visible dans le menu supérieur.
- Suppression des rappels de thème à l’intérieur des pages.
- Ajout d’une croix de sortie dans les écrans Quiz et Blindtest, avant et pendant les parties.
- La sortie interrompt également l’extrait audio en cours.


## Alpha 4
- Croix de sortie déplacée en haut à droite dans Quiz et Guess.
- Ajout d’un bouton « Réinitialiser la notation » dans chaque album.
- Confirmation avant suppression des notes de l’album.
- Critères de notation mis à jour : Reliability, Lyrics, Voice, Production.


## Alpha 5
- Écran de fin du quiz et du blindtest corrigé.
- Bouton « Rejouer » fonctionnel avec les mêmes réglages.
- Bouton « Retour à l’accueil » fonctionnel.
- Croix de sortie également disponible sur l’écran de résultat.


## Alpha 6
- Ajout des en-têtes de colonnes dans le classement général.
- Tri par note générale, Reliability, Lyrics, Voice ou Production.
- Choix de l’ordre croissant ou décroissant.
- Filtre par album.
- Tableau horizontalement défilable sur mobile afin de conserver tous les critères visibles.


## Alpha 7
- Ajout d’un bouton « Réinitialiser tous les classements » dans le classement général.
- Double confirmation obligatoire avant suppression.
- Réinitialisation également des filtres et du tri du classement.


## Alpha 8
- Le bouton « Voir le classement général » est désormais placé en haut de la page Rank.


## Alpha 9
- L’en-tête « Classement » du tableau général est remplacé par le symbole « # ».

# Version complète 1.0

- Catalogue de tous les albums studio, avec priorité aux Taylor’s Versions.
- Chargement automatique des tracklists intégrales depuis Apple/iTunes et cache local.
- Classement selon Reliability, Lyrics, Voice et Production.
- Tableau général filtrable et triable, réinitialisation par album ou globale.
- Blindtest de 1, 5, 10 ou 20 titres, avec trois niveaux de difficulté.
- Banque de quiz mixte : discographie, tracklists, chronologie, collaborations, famille, vie publique, engagements, fun facts et photos datées.
- Questions générées automatiquement à partir du catalogue : plusieurs centaines de combinaisons possibles.
- Quatre thèmes saisonniers et personnalisation Aliénor.


## Version 1.1 — catalogue et quiz photo
- Les 12 albums studio sont désormais intégrés directement dans `data.js`.
- Les tracklists ne dépendent plus d’une recherche Apple réussie pour être complètes.
- 248 pistes sont disponibles dès l’ouverture du site.
- Le cache du catalogue a été versionné pour ne pas réutiliser d’anciennes listes abrégées.
- Six questions photographiques utilisent maintenant deux images incluses dans l’archive.
- Pour une partie de 5 questions ou plus, au moins une question photo est systématiquement intégrée.


## Version 1.2 — optimisation mobile
- Dans un album, un toucher sur le titre d’une chanson déplie les quatre critères de notation.
- Une seule chanson peut rester ouverte à la fois ; la ligne se replie en la touchant à nouveau.
- Le classement général propose une vue simplifiée (#, chanson, album, note) adaptée à la largeur mobile.
- Un sélecteur sticky permet de basculer vers la vue détaillée avec les quatre critères.
- Le choix de vue est conservé pendant la navigation de la session.


## Version 1.3 — navigation mobile
- L’identité « Aliénor’s Swiftie Experience » reste visible dans l’en-tête mobile.
- Ajout d’un menu burger à gauche avec Rank, Guess et Quiz.
- Le menu contient également le choix de la gamme colorée.
- Les palettes sont renommées Été, Automne, Hiver et Printemps sur mobile et ordinateur.
- La pastille de saison reste accessible à droite de l’en-tête.


## Version 1.4 — Supabase
- Connexion e-mail/mot de passe au premier lancement.
- Synchronisation des notes, meilleurs scores, thème et préférences entre appareils.
- Sauvegarde locale maintenue en parallèle.


## Version 1.5
- Les quatre critères sont désormais additionnés : la note d’un morceau est affichée sur 20.
- Le classement général trie la note totale sur 20.
- Le blindtest accepte davantage de fautes de frappe grâce à une comparaison approximative.
- Les accents, apostrophes, ponctuations, espaces et la mention « Taylor’s Version » sont ignorés.
- Une réponse partielle ou légèrement mal orthographiée peut être acceptée lorsque la similarité reste suffisante.


## Version 1.6
- Une réponse de blindtest est également acceptée si elle contient au moins trois mots significatifs du titre.
- Ces trois mots peuvent comporter de petites fautes d’orthographe.
- Les mots très courts et les mots-outils fréquents ne comptent pas dans cette règle.


## Version 1.7
- Suppression de la phrase explicative sous le titre du splash screen.
- Un second clic sur la note 1 remet désormais le critère à 0.


## Version 1.8 — compte desktop
- Ajout d’une icône de compte dans l’en-tête desktop.
- Accès au statut de synchronisation, à la synchronisation manuelle et à la déconnexion.
- Le menu burger mobile reste inchangé.


## Version 1.9
- Icône de compte remplacée par un pictogramme de personnage.
- Menus saison et compte harmonisés visuellement.
- Suppression des textes sur le mélange automatique des albums et catégories.
- Bouton Accueil et croix de sortie alignés.
- Ajout d’un indicateur de chargement animé pour Quiz, Guess et la recherche d’extrait audio.
- Nouveau libellé : « Quelle est ta gamme colorée préférée, Aliénor ? »


## Version 2.0
- Écran intermédiaire Bravo / Raté après chaque réponse.
- Affichage de la bonne réponse avant de passer à la question suivante.
- Détail des points et bonnes solutions dans le blindtest.
- Rappel permanent du barème du blindtest.
- Le bloc « Extrait prêt » disparaît dès que l’audio est chargé.
- La flèche du bouton Écouter s’anime lorsque l’extrait est disponible.
- L’onde sonore ne s’anime que pendant la lecture.
- Nouveau pictogramme de compte fourni par l’utilisateur.


## Version 2.1
- Nouveau pictogramme de compte en SVG.
- Ajout de « Réinitialiser tous les scores » dans les menus compte mobile et desktop, avec double confirmation.
- Ajout de la mention « Made with love. Happy birthday. » dans les menus compte et sur l’écran de connexion.
- Phrases de réussite et d’échec randomisées dans Quiz et Blindtest.
- Barème du blindtest transformé en trois pastilles graphiques.


## Version 2.2
- Correction du statut de synchronisation sur desktop.
- Affichage de l’heure de la dernière synchronisation réussie.


## Version 2.3 — synchronisation multi-appareils fiable
- Synchronisation désormais bidirectionnelle : chaque appareil récupère les données distantes avant d’envoyer ses changements.
- Fusion des notes morceau par morceau grâce à une date de modification propre à chaque notation.
- Les suppressions et réinitialisations sont synchronisées avec des marqueurs de suppression.
- Vérification automatique au retour sur l’onglet, au retour en ligne et toutes les 15 secondes lorsque le site est visible.
- Le bouton « Synchroniser maintenant » récupère et fusionne les changements avant l’envoi.
- Les meilleurs scores sont fusionnés en conservant le score le plus élevé.


## Correctif 2.3.1
- Correction d’une erreur JavaScript au démarrage : la migration des anciennes notes était exécutée avant l’initialisation des variables de stockage.
- Le site et les menus sont à nouveau fonctionnels.


## Correctif 2.3.2
- L’interface est rendue immédiatement, sans attendre Supabase.
- La synchronisation initiale s’effectue en arrière-plan.
- Un délai maximal empêche l’authentification de bloquer indéfiniment l’écran.
- Les synchronisations automatiques ne rechargent plus une partie Quiz ou Blindtest en cours.
- Réduction de la fréquence de vérification automatique à 30 secondes.


## Version 2.4 — connexion Mac et synchronisation
- Authentification Supabase explicitement persistante dans le stockage local du navigateur.
- La connexion ne reste plus bloquée en attendant la synchronisation.
- Délai de sécurité et messages d’erreur plus précis sur l’écran de connexion.
- Correction des anciennes notes locales qui étaient artificiellement datées au moment du chargement.
- Le simple chargement du thème ne modifie plus la date des données locales.
- Une synchronisation sans modification ne fabrique plus une nouvelle modification locale.
- Récupération automatique lors de la restauration ou du renouvellement de session.
- Ajout d’un numéro de version aux fichiers JavaScript et CSS pour empêcher Chrome d’utiliser une ancienne copie en cache.


## Version 2.5 — clés de notation stables
- Les notes ne sont plus identifiées par le titre du morceau, qui pouvait varier selon le cache iTunes de chaque navigateur.
- Chaque note utilise désormais une clé stable composée de l’album et du numéro de piste.
- Migration automatique des anciennes notes locales et distantes vers le nouveau format.
- Les classements deviennent cohérents entre mobile, Chrome, Safari et les différents domaines.


## Version 2.6 — fusion critère par critère
- Chaque critère de notation possède désormais son propre horodatage.
- Une modification de « Lyrics » sur mobile ne remplace plus « Voice » ou « Production » modifiés sur desktop.
- Migration automatique des anciennes notes par morceau vers le nouveau format.
- Les suppressions restent prioritaires uniquement lorsqu’elles sont réellement plus récentes que toutes les notes.
- Le bouton « Synchroniser maintenant » recharge immédiatement l’affichage après fusion.


## Version 2.7 — identifiant unique par piste
- 248 pistes dotées d’un identifiant interne immuable.
- Migration automatique des anciennes clés par titre ou numéro de piste.
- Le catalogue local est la source de vérité ; iTunes ne sert qu’aux extraits audio.
- Les notes restent fusionnées critère par critère.


## Version 2.7.1 — correctif de démarrage et connexion
- Suppression de la dépendance de `app.js` à la table `TRACK_IDS` de `data.js`.
- Les identifiants uniques sont désormais produits directement à partir de l’identifiant immuable de l’album et du rang canonique de la piste.
- Le site démarre même si un navigateur possède encore une ancienne copie de `data.js`.
- Nouveau cache-busting `2.7.1` pour forcer le rechargement des scripts.


## Version 2.8
- Stockage local strictement isolé par identifiant Supabase.
- Migration unique des anciennes données locales vers le premier compte connecté après mise à jour.
- Effacement de l’état en mémoire lors d’une déconnexion ou d’un changement de compte.
- Nouveaux textes d’accueil pour Rank, Blindtest et Quiz.
- Formats de partie : 1, 7, 13 ou 19 questions/morceaux.
- Blindtest : compte à rebours de trois secondes, lecture automatique, replay et pause.
- Navigation Rank : boutons « Tous les albums » et « Classement général ».
- Compteur de progression du classement global.


## Version finale 2.8.1
- Le bouton Pause du blindtest devient « Reprendre » lorsque l’extrait est interrompu.
- La reprise continue au même endroit et respecte la durée restante de l’extrait.
- Le bouton « Classement général » est également disponible depuis chaque page album.
- Easter egg : le cœur après « Aliénor » ouvre le message « One single thread of gold tied me to you. ».
