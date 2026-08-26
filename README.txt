CARPLAY TRAVAILLE — CODE-GENERATEUR CORRIGE

Ce ZIP n'est plus un simple site statique : il contient un vrai Cloudflare Worker + les fichiers statiques.
Le générateur appelle maintenant les routes API du même Worker.

IMPORTANT : pour que les codes activent réellement les appareils de l'application, le binding DB doit pointer vers LA MEME BASE D1 que celle utilisée par ton application CarPlay téléphone/autoradio.

A FAIRE DANS CLOUDFLARE :
1. Dans wrangler.jsonc, remplacer :
   - REMPLACE_PAR_TA_BASE_D1 par le nom exact de ta base D1
   - REMPLACE_PAR_ID_D1 par l'ID exact de cette base
2. Déployer comme Worker (pas comme simple site statique).
3. Dans Paramètres > Variables et secrets, ajouter un SECRET chiffré nommé exactement :
   ADMIN_SECRET
   et lui donner ton mot de passe administrateur.
4. Redéployer.
5. Ouvrir : /api/health
   Tu dois voir has_admin_secret:true et has_db:true.
6. Revenir au générateur et tester un code 6 chiffres.

Routes incluses :
- POST /api/admin/subscriptions : 365 jours ou à vie
- POST /api/admin/subscriptions/action : reset_devices (déblocage)
- GET /api/health : diagnostic

Le design du générateur a été conservé depuis ton fichier index(7).html.
