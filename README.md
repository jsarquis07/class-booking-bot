# Class Booking Bot

Ce script automatise la réservation de cours de sport sur le site Lamont Golfiere Club.

## Prérequis

- Node.js (version 14 ou supérieure)
- npm (Node Package Manager)

## Installation

1. Clonez ce dépôt
2. Installez les dépendances :
```bash
npm install
```

## Configuration

1. Copiez le fichier `.env.example` vers `.env` :
```bash
cp .env.example .env
```

2. Modifiez le fichier `.env` avec vos informations :
- `EMAIL` : Votre adresse email
- `PASSWORD` : Votre mot de passe
- `WEBSITE_URL` : L'URL du site (par défaut : https://lamontgolfiereclub.com)
- `TARGET_HOUR` : L'heure à laquelle le script doit cliquer sur le bouton de réservation
- `TARGET_MINUTE` : Les minutes à laquelle le script doit cliquer sur le bouton de réservation
- `TARGET_SECOND` : Les secondes à laquelle le script doit cliquer sur le bouton de réservation
- `START_HOUR` : L'heure à laquelle le script doit démarrer
- `START_MINUTE` : Les minutes à laquelle le script doit démarrer

## Utilisation

Pour démarrer le script :
```bash
npm start
```

Pour le développement (avec rechargement automatique) :
```bash
npm run dev
```

## Fonctionnalités

- Connexion automatique au site
- Recherche du cours spécifique (5 jours dans le futur)
- Réservation automatique à l'heure configurée
- Gestion des erreurs et des timeouts
- Logs détaillés

## Notes

- Le script utilise Puppeteer pour automatiser le navigateur Chrome
- Assurez-vous d'avoir une connexion internet stable
- Le navigateur restera ouvert pendant 10 secondes après la fin du script 