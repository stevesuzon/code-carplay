GÉNÉRATEUR CARPLAY AUTOMATIQUE FINAL

Fonctionnement :
- ACTIVER 365 JOURS : génère automatiquement un code lettres + chiffres, puis tente jusqu'à trouver un code libre.
- ACTIVER À VIE : même fonctionnement automatique, sans date d'expiration.
- CODE DE DÉBLOCAGE : utiliser le code existant du client pour libérer 1 autoradio + 1 téléphone.
- Le générateur appelle l'API :
  https://carplay-telephone.appli-suzon.workers.dev

Pour fonctionner :
1. Déployer l'application carplay-telephone avec les routes /api/admin/subscriptions et /api/admin/subscriptions/action.
2. Dans Cloudflare > carplay-telephone > Variables et secrets, définir ADMIN_SECRET.
3. Le secret tapé dans le générateur doit être exactement le même.
4. La base D1 de l'application doit rester liée à carplay-telephone.
5. Déployer ce générateur dans code-generateur via GitHub code-carplay.
