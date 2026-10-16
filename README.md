# CRM Mailotion — assistant commercial connecté (v2)

Application mobile PWA pour gérer les boutiques e-commerce, les échanges, les relances, les audits gratuits, les propositions et les clients payants. Le design violet et la navigation du CRM d'origine sont conservés.

## Ouvrir le CRM

GitHub Pages : https://ludodulac.github.io/CRM-mailotion/

Pour l'installer sur Android : ouvrir ce lien dans Chrome → ⋮ → **Ajouter à l'écran d'accueil** (ou **Installer**).

## Nouvelles fonctions

- Page **AUJOURD'HUI** : priorités, relances dues/en retard, contacts à faire, prestations gratuites et offres en attente.
- Fiche boutique : site, secteur, ville, contact, coordonnées, source, vérification, outil email, problèmes, opportunités, priorité, qualification, statut, audit, propositions, notes.
- Historique chronologique : événements et tâches datées, reportables et terminables.
- Historique des emails : trouvé non testé, confirmé, invalide ou alternatif à tester. Un email invalide n'est jamais proposé comme destinataire.
- Sauvegarde complète JSON (prospects + actions + historique d'emails), import/export existant conservé.
- Fonctionnement local/hors ligne avec copie des données du navigateur.
- **Mode connecté en option** : Google Sheets privé avec OAuth Google, lisible/modifiable par ChatGPT via Google Drive.

## Architecture sécurisée

- **Dépôt public GitHub** : code, PWA, exemples et coordonnées professionnelles publiques uniquement. **Aucune note privée, historique, token, clé ou mot de passe.**
- **Google Sheets privé « MAILOTION — CRM privé connecté à ChatGPT »** : trois onglets **Prospects, Actions, Emails** + Meta. Il n'est partagé avec personne, vérifié par les permissions de Google Drive.
- **Téléphone** : conserve son stockage existant `mailotion-crm-v1`. L'historique des actions et des emails est enregistré localement avant la connexion. Un snapshot de migration est conservé en `mailotion-precloud-snapshot-v2`.
- **OAuth Google** : un ID client OAuth web, créé dans Google Cloud ; l'application conserve cet ID (non secret) et le numéro du Google Sheets sur le téléphone. **Le jeton OAuth ne reste qu'en mémoire** jusqu'à expiration.
- **ChatGPT** : le connecteur Google Drive, déjà utilisable sur le compte ChatGPT, permet de rechercher et lire le classeur privé puis de modifier les lignes par les actions Google Sheets. Voir [SCHEMA-CHATGPT.md](SCHEMA-CHATGPT.md) pour les formats exacts et les contrôles nécessaires.

## Première connexion Google (intervention humaine obligatoire)

1. Dans la console Google Cloud, choisir ou créer un projet Google, puis activer l'**API Google Sheets**.
2. Dans Google Auth Platform / écran de consentement, configurer l'application **Mailotion CRM**, public cible **Externe** pour un compte Gmail personnel, statut **Test**, ajouter son propre email dans les **utilisateurs de test**, et déclarer le scope `https://www.googleapis.com/auth/spreadsheets`.
3. Dans **Clients** → créer **ID client OAuth** → **Application Web** → Origines JavaScript autorisées : exactement `https://ludodulac.github.io`. Copier l'**ID client** (terminant par `.apps.googleusercontent.com`). **Aucun secret client** ne doit être saisi dans le CRM.
4. Sur le téléphone, ouvrir le CRM, section **Mémoire partagée ChatGPT**, paramètres ⚙ : coller l'**ID client OAuth** et l'**ID de la feuille Google Sheets privée** ; enregistrer.
5. Cliquer sur **Connecter Google**, autoriser, puis attendre l'état vert **Synchronisé**. La feuille Google privée existe déjà et contient 11 contacts publics migrés, l'historique des deux emails de Tasha (un invalide, l'alternative à tester). Les notes et le CRM du téléphone ne sont fusionnés qu'après autorisation. Cliquer sur **Connecter Google** au retour dans l'app si la session a expiré.

Le site peut être utilisé **sans configurer Google** ; dans ce cas les nouvelles actions restent **locales** et ChatGPT ne les voit pas encore. Ne pas annoncer de synchronisation opérationnelle sans avoir constaté l'état vert après login réel.

## Utiliser avec ChatGPT

> Dans mon Google Drive, retrouve le classeur privé « MAILOTION — CRM privé connecté à ChatGPT ». Lis les onglets Prospects, Actions, Emails et les champs JSON. Fais-moi mon programme commercial d'aujourd'hui en te basant uniquement sur les données réelles. Pour tout changement, re-lis la ligne ciblée, écris la fiche/le journal sans écraser les autres, puis vérifie ta modification par une nouvelle lecture. Ne publie aucune donnée privée dans GitHub.

Les additions publiques depuis ChatGPT dans `prospects.json` restent compatibles, mais elles **ne sont pas adaptées aux notes confidentielles**. Le bouton **Actualiser** peut toujours charger ce fichier ; la synchronisation privée se fait depuis **Connecter Google**.

## Fiabilité et limites

- Les 11 prospects publics originaux ont été copiés dans le classeur privé ; les données locales supplémentaires sont sur l'appareil et n'ont pas pu être lues à distance.
- Le module cloud exécute lecture, fusion, écriture par lignes et **relecture après écriture**. Le connecteur ChatGPT a été testé sur le classeur privé, mais la connexion OAuth **depuis le téléphone** doit encore être vérifiée après configuration.
- Google Sheets n'offre pas de verrouillage transactionnel dans cette implémentation : éviter d'éditer **la même fiche simultanément** depuis ChatGPT et le téléphone. En cas de conflit détecté, le CRM garde une copie locale du conflit.
- Le dépôt public contient encore des *révisions Git historiques*. Une note privée précédemment copiée dans `prospects.json` a été retirée de la version courante, mais l'ancienne révision reste accessible tant que l'historique Git n'est pas purgé.
- Les sauvegardes JSON contiennent les notes et données privées : **ne pas les publier sur GitHub**.
