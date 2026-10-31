# Dawa — votre backend est connecté

Le projet Supabase **Dawa** est créé dans votre organisation, en région Paris, sur le plan annoncé à 0 $/mois. La base et l’API sont déployées. Les paramètres publics sont inclus dans `src/backend-config.ts`.

## Ce qu’il vous reste pour GitHub Pages

1. Envoyez le contenu de ce dossier à la racine de votre dépôt GitHub, sur la branche `main` (y compris `.github/`).
2. Dans Settings → Pages, choisissez **GitHub Actions**.
3. Le workflow **Deploy GitHub Pages** publie l’application. Aucun paramètre Supabase supplémentaire n’est nécessaire pour ce projet.
4. Ouvrez l’URL publiée et ajoutez `#admin` à la fin.
5. Utilisez la clé fournie **séparément** dans `Dawa_Private_Setup.txt` pour choisir votre identifiant et votre mot de passe. Ne publiez jamais ce fichier privé sur GitHub.
6. Complétez les médicaments puis créez l’invitation pour votre mère dans Accès & réglages. Elle ouvre le lien et accepte ; aucun compte à créer pour elle.

Le serveur accepte l’origine `https://mo9696-boop.github.io`, quel que soit le nom du dépôt. Si vous ajoutez un domaine personnalisé, son origine doit être mise à jour dans les paramètres privés du serveur.

Les sept fiches restent inactives tant que vous ne les avez pas vérifiées et complétées. Les rappels automatiques appareil fermé restent non implémentés.

## Vérification réalisée

L’API hébergée refuse un accès sans session (401) et une origine non autorisée (403). Les vérifications PostgreSQL confirment qu’un visiteur ne peut lire ni modifier directement les données ou les paramètres privés. Le compte administrateur n’est pas créé à votre place : vous choisissez son mot de passe lors de la première ouverture.

Les deux téléphones et le site GitHub Pages publié restent à tester après votre publication.

---

# Guide pour une installation indépendante

Cette version remplace le serveur Node de la version précédente. **L'interface se déploie bien sur GitHub Pages.** Supabase héberge uniquement la base et l'API sécurisée. Votre mère n'a besoin d'aucun compte externe : elle ouvre une invitation, donne son accord, puis retrouve directement ses prises.

Aucun projet Supabase, compte administrateur ni donnée de connexion n'est inclus dans l'archive. Le code et les workflows sont prêts ; les connexions ci-dessous restent à configurer.

## A. Publier le code

1. Créez votre dépôt GitHub, puis envoyez **le contenu** du dossier `dawa-github-pages` à sa racine. `package.json` et `.github/` doivent être à la racine du dépôt.
2. Dans **Settings → Pages → Build and deployment**, choisissez **GitHub Actions**.
3. Le workflow **Deploy GitHub Pages** construit et publie l'interface à chaque push sur `main`. Il calcule le chemin du dépôt automatiquement : il fonctionne sous `/nom-du-depot/`, à la racine et avec un domaine personnalisé.

Sans configuration Supabase, la page indique que le suivi partagé n'est pas encore connecté. Elle ne présente pas de fausses données comme synchronisées.

## B. Connecter la base et l'API

Créez un **nouveau projet Supabase dédié** à Dawa. Ne réutilisez pas une base contenant des données d'une autre application. Gardez le mot de passe de la base choisi à sa création.

Dans votre dépôt GitHub, ouvrez **Settings → Secrets and variables → Actions**.

**Variables** (onglet Variables, informations publiques) :

| Nom | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | L'URL du projet, comme `https://REFERENCE.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | La clé **publishable** du projet (`sb_publishable_…`), ou la clé legacy **anon**. Jamais la clé secret/service_role. |
| `DAWA_ALLOWED_ORIGIN` | L'origine de votre site, comme `https://VOTRE_COMPTE.github.io` : **sans** `/nom-du-depot/` et sans barre finale. Avec un domaine personnalisé, son origine HTTPS. |

**Secrets** (onglet Secrets, privés) :

| Nom | Valeur |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Un jeton personnel créé dans les paramètres de votre compte Supabase ; il sert uniquement au déploiement. |
| `SUPABASE_PROJECT_REF` | La référence du projet Supabase, visible dans son URL de tableau de bord. |
| `SUPABASE_DB_PASSWORD` | Le mot de passe de la base, choisi à la création du projet. |
| `DAWA_SETUP_KEY` | Une clé aléatoire privée d'au moins 32 caractères. Générez-la avec `npm run setup-key` et conservez-la : elle sera demandée une seule fois pour créer votre compte administrateur. |

Pour générer la clé sans installer les dépendances, avec Node.js installé :

```sh
node scripts/setup-key.mjs
```

Ne partagez pas cette clé avec votre mère. N'ajoutez aucun de ces secrets au code ou dans un champ commençant par `VITE_`.

Ensuite, dans **Actions** :

1. Lancez **Deploy Supabase backend → Run workflow**. Il applique la migration, enregistre les paramètres privés et déploie l'API.
2. Une fois terminé, relancez **Deploy GitHub Pages → Run workflow** pour intégrer les deux variables publiques.

La clé `SUPABASE_SERVICE_ROLE_KEY` est fournie au serveur par Supabase. Elle n'est jamais nécessaire dans les variables GitHub publiques ni dans le navigateur.

## C. Créer votre accès et inviter votre mère

1. Ouvrez l'adresse publiée par GitHub Pages et ajoutez `#admin` à la fin : `https://VOTRE_COMPTE.github.io/DEPOT/#admin`.
2. À la première ouverture, saisissez votre clé `DAWA_SETUP_KEY`, choisissez votre identifiant et un mot de passe d'au moins 12 caractères. Les connexions suivantes ne demandent que l'identifiant et le mot de passe.
3. Vérifiez les sept fiches initiales. Elles sont toutes inactives, sans horaires inventés. Complétez les quantités, jours, heures et dates avant de les activer.
4. Dans **Accès & réglages**, générez l'invitation privée et ouvrez-la sur le téléphone de votre mère.
5. Elle appuie sur « موافقة، افتحوا برنامجي ». Elle n'a aucun compte, email ou mot de passe à créer.
6. Ajoutez l'icône à son écran d'accueil si le navigateur le propose. Conservez les données de son navigateur.
7. Testez une déclaration, sa visibilité dans votre espace, puis sa correction. Testez aussi hors connexion après une première ouverture complète.

**Ce qui reste non opérationnel :** les rappels automatiques appareil fermé et les alertes à l'aidant. Le bouton de notification ne réalise qu'un test immédiat. Les tests sur vos téléphones restent à faire.

Si vous préférez que la configuration de Supabase soit réalisée dans cette conversation, autorisez l'intégration Supabase. Le code ne peut pas créer une base dans votre compte sans cet accès.
