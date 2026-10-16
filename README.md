# CRM Mailotion — Mes boutiques

CRM mobile simple pour contacter les boutiques e-commerce et suivre la progression de **premier contact → aide gratuite → offre payante → cliente**.

## Ouvrir l'application

Une fois **GitHub Pages activé**, l'adresse sera :

**https://ludodulac.github.io/CRM-mailotion/**

Dans GitHub → **Settings → Pages** : **Deploy from a branch** → branche **main**, dossier **/(root)** → Save. Sur Chrome Android, menu **⋮ → Ajouter à l'écran d'accueil** / **Installer l'application**.

## Fonctionnalités

- Ajouter/modifier/supprimer des boutiques, email, téléphone, site, ville, secteur, interlocuteur.
- Contacter par **Email / Appeler / Site** en un clic.
- Étapes : à contacter, contactée, en discussion, aide gratuite, offre payante, cliente, sans suite.
- Date de relance, recherche et filtres, notes personnelles, offre et montant facultatifs.
- Sauvegarde **automatique dans le navigateur de l'appareil** ; export CSV et sauvegarde/restauration JSON.
- Application PWA, consultable hors ligne après la première visite.

## Ajouter des boutiques depuis une autre conversation ChatGPT

L'app recharge `prospects.json` au démarrage, et avec le bouton **Actualiser**. Une conversation ChatGPT disposant de l'accès GitHub au dépôt peut ajouter des contacts professionnels publics dans ce fichier. Format :

```json
{
  "version": 1,
  "boutiques": [
    {
      "id": "boutique-exemple-brest",
      "boutique": "Nom de boutique",
      "ville": "Brest",
      "secteur": "Cosmétiques",
      "email": "contact@exemple.fr",
      "telephone": "02 00 00 00 00",
      "site": "https://exemple.fr",
      "source_url": "https://exemple.fr/contact"
    }
  ]
}
```

**Consigne à copier dans ChatGPT :** « Dans `ludodulac/CRM-mailotion`, ajoute les boutiques que nous avons vérifiées dans `prospects.json`, sans retirer les anciennes, sans doublons, avec seulement les coordonnées professionnelles publiquement accessibles. Ne modifie pas les autres fichiers. »

### Respect de la confidentialité

Le dépôt étant **public**, `prospects.json` et tous ses contacts sont **accessibles à tout le monde** sur GitHub. N'y inscris **aucune** note privée, numéro personnel, contact non public, email confidentiel, information client ou donnée de connexion. Le logiciel n'enregistre jamais ses **notes, suivis, dates de relance ou montants** dans le dépôt public : ces informations restent dans le stockage local du navigateur. Le CRM ne dispose **pas** d'une synchronisation automatique des notes entre plusieurs appareils.

- Ajouter depuis l'interface de l'app enregistre uniquement sur l'appareil.
- Pour retrouver les données après changement ou réinitialisation de téléphone, utiliser **Sauvegarder tout mon CRM** puis **Restaurer une sauvegarde**.
- Les adresses des boutiques ajoutées par ChatGPT via GitHub apparaissent à la prochaine ouverture ou en cliquant **Actualiser**.
- L'app permet également l'import local CSV ou JSON et un lien de transfert `#import=<JSON encodé en base64url>` vers un seul téléphone, sans publication dans le dépôt.

Pas de backend, pas de statistiques d'usage, pas de mot de passe intégré. Ne publie jamais un jeton GitHub dans ces fichiers.

## Limites

- Les cartes et notes ajoutées ou modifiées depuis un téléphone ne sont **pas modifiées sur GitHub**.
- Les données de contact qui arrivent depuis ChatGPT sont visibles publiquement : pour une véritable équipe multi-utilisateurs ou un carnet confidentiel synchronisé, il faudrait un stockage privé et une authentification.
- Les champs d'étape et de notes sont conservés lors des nouveaux imports de contacts GitHub.

Licence : usage personnel. 
