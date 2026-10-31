# Dawa — GitHub Pages + Supabase

Application familiale de déclarations de prise : interface arabe RTL pour la mère, gestion en français pour le fils. **Aucune connexion ChatGPT. Aucun compte externe pour la mère.**

Commencez par [DEMARRER-ICI.md](DEMARRER-ICI.md). Cette archive est distincte de l'ancienne version Node/SQLite : n'utilisez pas son ancien fichier START-WINDOWS.cmd ou son Dockerfile pour ce déploiement.

## Architecture

- **GitHub Pages** : fichiers statiques React/Vite, manifest, service worker. Les données saisies et l'historique ne sont pas stockés dans le dépôt. Le fichier de configuration initiale contient toutefois les sept médicaments et notes fournis : en tenir compte avant de rendre le dépôt public.
- **Supabase Edge Function** `dawa` : API de confiance, contrôles des rôles, gestion des invitations et des sessions, validation métier.
- **PostgreSQL** : dossier familial avec écritures conditionnelles atomiques (`version`) et limite de tentatives d'accès. RLS activé sans politique publique. Les rôles `anon` et `authenticated` n'ont aucun droit sur les tables ou les fonctions internes.
- Le secret service_role reste exclusivement dans l'environnement de l'Edge Function.
- Les sessions sont aléatoires (256 bits), hachées côté serveur, conservées sur le navigateur pour autoriser l'accès depuis GitHub Pages sans cookies tiers. Session patiente : 365 jours au maximum ; administrateur : 7 jours. Effacer les données du navigateur révoque de fait son accès local.
- Mot de passe administrateur : PBKDF2-HMAC-SHA256, sel aléatoire, 600 000 itérations. L'ouverture initiale est protégée par `DAWA_SETUP_KEY`, puis fermée dès création du compte. Une clé ne suffit plus à recréer un administrateur tant que celui-ci existe.
- Les invitations expirent après 24 h, sont consommées atomiquement et sont révocables. Le fragment du lien est supprimé de la barre d'adresse à l'ouverture.
- Les identifiants et clés de session du navigateur sont limités à l'application par un préfixe de stockage dépendant du chemin. Comme toute application web, l'isolation de sécurité du navigateur est celle de l'origine ; hébergez seulement du code de confiance sur votre origine GitHub Pages.

`verify_jwt=false` dans Supabase est intentionnel : la mère n'a pas de compte Supabase Auth. Cette option n'ouvre pas les données : le gestionnaire valide chaque session lui-même, et les opérations d'initialisation et d'invitation exigent leurs secrets spécifiques.

## Fonctionnalités

Fiches initiales inactives, photos réduites, dose et quantité séparées, programme versionné, dates de fin inclusives, traitements si besoin, historique, déclarations et corrections avec auteur, détection des doubles envois, gestion des conflits, export CSV/JSON, association et révocation des téléphones, fuseau Asia/Beirut, file locale en attente de connexion.

Les écritures en conflit ne sont pas appliquées silencieusement. Les demandes rejetées pour conflit sont conservées dans le stockage local `dawa-conflicts` et signalées pour revue. La copie hors connexion reste sur le téléphone ; sa révocation à distance ne peut pas effacer les données déjà téléchargées lorsqu'il est hors ligne.

Les changements de programme ne réécrivent pas les déclarations passées. Une heure locale inexistante lors d'un changement d'heure est signalée comme annulée à revoir et n'est pas remplacée par un horaire inventé. Une heure répétée ne produit qu'une occurrence. Une prise tardive conserve son occurrence d'origine.

## Développement

Node.js 24 et npm :

```sh
npm ci
npm run check
npm test
npm run build
```

Pour lancer l'interface localement, copier `.env.example` vers `.env.local`, renseigner uniquement les paramètres publics du **projet de test**, puis `npm run dev`. L'origine locale doit correspondre à `DAWA_ALLOWED_ORIGIN` de cette API de test. Ne pas modifier l'origine de l'API de production juste pour tester localement.

Le chemin du site est défini par `VITE_BASE_PATH`. Le workflow Pages utilise `actions/configure-pages` pour le déduire ; un simple `npm run build` utilise des liens relatifs. L'accès de gestion est `#admin`, ce qui évite les erreurs 404 des routes `/admin` sur un hébergeur statique.

Le code métier partagé est dans `supabase/functions/_shared/model.mjs`. Les données initiales ne sont pas activées avant vérification. Le backend Supabase Dawa est maintenant déployé pour votre compte. Les paramètres publics sont dans src/backend-config.ts. La publication GitHub Pages reste à effectuer.

## Sauvegarde et récupération

L'export CSV permet la lecture des prises ; l'export JSON contient les programmes et corrections mais exclut les secrets d'authentification. Conservez des exports réguliers hors de votre dépôt.

Pour une sauvegarde complète incluant les comptes, utilisez les fonctions de sauvegarde de votre projet Supabase ou une sauvegarde PostgreSQL sous votre contrôle. Leur disponibilité et rétention dépendent de votre configuration. Les dumps contiennent des informations sensibles et ne doivent jamais être committés.

Un administrateur ayant oublié son mot de passe peut le réinitialiser depuis le SQL Editor Supabase : le fichier `scripts/reset-admin.sql` retire uniquement l'accès administrateur et ses sessions, en conservant le traitement et les accès patient. Rouvrez ensuite `#admin` avec la clé de configuration conservée. Ne lancez pas ce script pendant un usage normal.

## Vérification

La suite contient 13 tests, dont le cycle création administrateur → invitation → accès patiente → enregistrement → lecture aidant → correction → révocation. Elle couvre les doubles invitations concurrentes, les écritures simultanées, les répétitions hors connexion, les permissions, l'expiration, le refus d'une autre origine, les horaires et les fins de traitement.

Ces tests utilisent une implémentation en mémoire des opérations atomiques de stockage pour le gestionnaire Edge. Ils ne remplacent pas un test de la migration sur un vrai projet Supabase. Le typage du frontend et du point d'entrée Edge est vérifié séparément. Le build vérifie les fichiers référencés et l'absence de références à l'ancienne authentification.

Les contrôles de permissions sur PostgreSQL hébergé et le refus des accès non autorisés sur Deno Edge ont été vérifiés. Le parcours authentifié complet, GitHub Pages publié et les deux téléphones restent à tester. L'accès au navigateur de test disponible ici n'a pas permis de valider les écrans mobiles.

## Limites actuelles

- Rappels automatiques en arrière-plan et alertes aidant non implémentés. Le test de notification est immédiat uniquement.
- Aucun SMS ou WhatsApp envoyé.
- Pas de restauration JSON automatique ni sauvegarde indépendante planifiée.
- Un seul foyer par projet ; ne pas utiliser comme service public multi-patients.
- La copie locale et les jetons de session dépendent de la protection du navigateur et du téléphone.
- L'application suit des déclarations, ne prescrit pas et ne prouve pas l'ingestion.

## Références de déploiement

- Vite / GitHub Pages : https://vite.dev/guide/static-deploy#github-pages
- Supabase / migrations et GitHub Actions : https://supabase.com/docs/guides/deployment/managing-environments
- Supabase / déploiement des Edge Functions : https://supabase.com/docs/guides/functions/deploy
- Supabase / authentification des fonctions : https://supabase.com/docs/guides/functions/auth-headers
