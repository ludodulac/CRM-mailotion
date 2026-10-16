# MAILOTION CRM V2 — Interface privée ChatGPT

Cette documentation concerne **un classeur Google Sheets privé**, distinct de ce dépôt public. Ne jamais copier les données privées de ce classeur sur GitHub.

## Où trouver les données

Dans le connecteur **Google Drive** de ChatGPT, chercher ce nom exact :
**MAILOTION — CRM privé connecté à ChatGPT**.

Le classeur est privé, seul le compte du propriétaire y a accès ; ne pas créer de partage public.

Trois onglets servent de base opérationnelle :

- **Prospects** : A `id`, B `name`, C `stage`, D `priority`, E `followup`, F `updatedAt`, G **fiche JSON complète**.
- **Actions** : A `id`, B `prospectId`, C `date`, D `due`, E `type`, F `status`, G `description`, H **action JSON complète**.
- **Emails** : A `id`, B `prospectId`, C `email`, D `status`, E `active` (« oui » / « non »), F `verifiedAt`, G **adresse JSON complète**.
- **Meta** : informations de version et contrôles techniques.

**IMPORTANT :** Ne jamais lire seulement les colonnes résumées pour reconstituer une fiche. La dernière colonne JSON contient les informations commerciales détaillées. Une mise à jour doit maintenir *le JSON et les colonnes de synthèse cohérents*.

## Fiches Prospects — champs JSON

```json
{
  "id":"identifiant-immuable",
  "name":"Nom de la boutique",
  "website":"https://...",
  "city":"",
  "sector":"",
  "contact":"",
  "email":"",
  "phone":"",
  "contactPage":"",
  "sourceUrl":"",
  "verifiedAt":"",
  "emailTool":"",
  "problems":"",
  "opportunities":"",
  "priority":"",
  "qualification":"",
  "emailStatus":"",
  "stage":"a_contacter",
  "lastContact":"",
  "followup":"",
  "lastAction":"",
  "nextAction":"",
  "notes":"",
  "proposalSent":false,
  "freeInProgress":false,
  "paidOffer":"",
  "clientAcquired":false,
  "offer":"",
  "help":"",
  "outreachPersonal":"D\u0027ailleurs, j\u0027ai vu que… Est-ce que… ? Et… ?",
  "outreachResearch":"Faits observés sur le site public + opportunité proposée",
  "outreachSource":"https://boutique.exemple/produits/",
  "outreachReviewedAt":"YYYY-MM-DD",
  "archived":false,
  "createdAt":"ISO8601",
  "updatedAt":"ISO8601"
}
```

Champs inconnus = chaîne vide, booleans faux ; ne rien inventer.

Valeurs de `stage` : `a_contacter`, `contactee`, `echange`, `gratuit`, `offre`, `cliente`, `sans_suite`.
Valeurs `priority` : `haute`, `moyenne`, `basse` ou vide.
Valeurs `emailStatus` : `trouve_non_teste`, `confirme`, `invalide`, `alternatif_a_tester` ou vide.
Une adresse `invalide` ne doit jamais être utilisée pour un envoi. Garder son historique dans l'onglet Emails.

## Actions — champs JSON

```json
{
  "id":"action-id-unique",
  "prospectId":"identifiant-de-la-boutique",
  "date":"YYYY-MM-DD",
  "due":"YYYY-MM-DD",
  "type":"email_envoye",
  "status":"terminee",
  "description":"Premier email envoyé",
  "next":"",
  "createdAt":"ISO8601",
  "updatedAt":"ISO8601"
}
```

Types : `tache`, `email_envoye`, `reponse_recue`, `relance`, `audit_gratuit`, `proposition`, `appel`, `note`.
Statuts : `a_faire`, `en_cours`, `terminee`, `annulee`.
Une tâche `terminee` / `annulee` ne figure plus dans les actions à effectuer.

L'historique est **append-only quand il s'agit d'événements distincts** : ne pas effacer les événements passés. Modifier la même tâche pour reporter une échéance ou la marquer terminée. Pour une nouvelle action, créer un nouvel `id`.

## Emails — champs JSON

```json
{
  "id":"email-id-unique",
  "prospectId":"identifiant-de-la-boutique",
  "email":"contact@boutique.fr",
  "status":"trouve_non_teste",
  "active":true,
  "verifiedAt":"",
  "source":"",
  "notes":"",
  "createdAt":"ISO8601",
  "updatedAt":"ISO8601"
}
```

Si une adresse devient invalide : écrire une nouvelle entrée `status:"invalide"`, marquer cette adresse non active, conserver les précédentes, puis mettre à jour le prospect. L'adresse alternative reste `alternatif_a_tester` jusqu'à vérification, sans jamais la déclarer fonctionnelle sans preuve.

Exemple générique : si une première adresse est signalée invalide, conserver cette ancienne adresse comme inactive dans l’onglet Emails et enregistrer la nouvelle comme alternative à tester, sans inventer de date de vérification.

## Procédure fiable pour ChatGPT

1. Chercher le classeur privé **MAILOTION — CRM privé connecté à ChatGPT** avec Google Drive ; lire les plages **Prospects!A1:G** / **Actions!A1:H** / **Emails!A1:G** via `get_spreadsheet_range`.
2. Pour toute demande de boutique, chercher par ID, puis par nom ET site web : **ne pas créer de doublon**.
3. Mettre à jour **seulement la ligne concernée** par `batch_update_spreadsheet` avec `updateCells`, `fields:"userEnteredValue"`, en conservant tous les champs JSON existants et les en-têtes. Écrire les colonnes visibles correspondantes. Une ligne nouvelle ne doit jamais écraser une ligne existante (inspecter la plage avant).
4. Re-lire la même ligne via `get_spreadsheet_range` après la modification. N'annoncer la réussite qu'après lecture de vérification.
5. Ne jamais enregistrer de dates, emails fonctionnels, conversations ou paiements supposés. Les inconnues restent vides.
6. Ne pas publier le contenu du classeur ni d'ID de fichier privé dans un commit. Le dépôt GitHub public sert au code et éventuellement aux coordonnées **professionnelles publiques seulement**.

**Questions pratiques**
- « Que dois-je faire aujourd'hui pour Mailotion ? » : comparer la date locale aux `followup` des Prospects et `due` des Actions, filtrer `status !== terminee/annulee`, trier priorité haute puis retard, identifier `freeInProgress`, propositions envoyées, et prospects `a_contacter`.
- « Qu'ai-je fait avec Tasha ? » : filtrer par `prospectId` dans Actions et Emails ; ne pas déduire qu'un email a été envoyé sans entrée d'historique.
- « Note que j'ai envoyé un email » : ajouter une action `email_envoye` terminée et actualiser `lastContact` / `lastAction` du prospect, avec date confirmée par l'utilisateur.
- « Relance dans trois jours » : ajouter ou mettre à jour une action `relance` avec échéance correcte, et éventuellement `followup` sur la fiche.

## Connexion depuis Android

Le CRM sur GitHub Pages utilise Google Identity Services (OAuth) avec le scope Google Sheets. Il requiert un **client OAuth de type Application Web**, l'origine JavaScript autorisée `https://ludodulac.github.io`, et l'API Google Sheets activée sur le projet Google Cloud.

Le propriétaire entre une fois dans le CRM son **ID client OAuth** et **l'ID du classeur privé** (pas de secret ni de jeton). Ensuite, il clique sur **Connecter Google** et autorise l'accès. Les jetons temporaires restent seulement en mémoire jusqu'à expiration.

Après chaque connexion, l'application relit les trois onglets, fusionne les changements et écrit les nouveaux éléments ; elle conserve les fiches locales jusqu'à lecture réussie. Elle effectue une relecture du serveur après les écritures.

**Limitations** : la synchronisation côté téléphone n'est pas vérifiable tant que le client OAuth n'a pas été configuré et autorisé. Google Sheets n'offre pas ici de transaction atomique inter-appareils : éviter les modifications simultanées de la même fiche ; sauvegarder en JSON. Des versions en conflit sont conservées en `localStorage` sous `mailotion-conflicts-v1`.

Pour les données créées *avant* la première connexion, une sauvegarde `mailotion-precloud-snapshot-v2` est conservée localement. Le stockage du navigateur peut être supprimé par nettoyage des données du site : utiliser **Sauvegarder tout mon CRM** régulièrement.

## Personnalisation commerciale fondée sur des faits publics

Lorsque l'utilisateur demande d'analyser les boutiques ou d'ajouter des prospects en vue d'un premier email :
1. Lire d'abord les fiches privées dans Prospects (ne pas travailler à partir d'une ancienne liste GitHub si la feuille privée est disponible).
2. Visiter le site officiel de chaque boutique, ses catégories, ses fiches produit et ses éléments publics pertinents, en utilisant la recherche Internet si nécessaire. **Si le site est indisponible, le préciser et ne rien inventer.**
3. Relever une **observation précise et vérifiable** (gamme, routine, coffrets, programme de fidélité, formulaire newsletter, etc.). Éviter les compliments génériques.
4. Rédiger un court paragraphe d'email commençant naturellement par « D'ailleurs, j'ai vu que… » et ajoutant **deux questions concrètes** concernant l'acquisition, les paniers abandonnés, la fidélisation, les conseils après achat ou la segmentation. Les questions doivent être pertinentes pour cette boutique. **Ne jamais affirmer que des automatisations n'existent pas simplement parce qu'on ne peut pas les voir.**
5. Enregistrer le paragraphe dans `outreachPersonal`, le résultat de l'audit dans `outreachResearch`, l'URL réellement consultée dans `outreachSource`, et la date de consultation dans `outreachReviewedAt`. Actualiser `updatedAt`, garder tous les autres champs JSON et les colonnes de synthèse, puis re-lire et vérifier les lignes écrites.
6. Les observations et brouillons commerciaux doivent rester dans la base Google Sheets **privée**. Ne pas ajouter de fichier avec notes commerciales, réponses de clients ou données privées au dépôt GitHub public.
7. Ne pas renvoyer d'email de première prise de contact à une boutique dont `stage` indique déjà une discussion ou dont l'historique contient un email envoyé. Ne jamais utiliser une adresse `invalide`.
8. Ne pas supposer que toutes les boutiques utilisent Shopify. Dans le texte générique, parler de « boutiques en ligne » à moins de disposer d'une confirmation de plateforme.

Le panneau « Mes emails de prospection » récupère le texte privé du prospect après la synchronisation Google et insère `outreachPersonal` **avant** « Bonne journée, Ludovic — MAILOTION ». Ce passage est modifiable depuis le téléphone, puis synchronisé comme les autres champs. Ouvrir le brouillon dans un client mail n'est **pas un envoi** ; l'action `email_envoye` n'est créée que si l'utilisateur confirme avoir réellement envoyé l'email.
