

tests Knowage
accès API MNCA
url 
https://api.nicecotedazur.org/nca/traffic/trafficflowobserved/

API key poour alain.galdemas@eridanis.com
mettre dans request header
X-API-Key : 
4EMXijBk6yIoB19uZK8uiBJqws87ILfmGoX400Vb

utilisation d'un data set REST

avec NGSI checked
ou avec  "use directly json attributes" checked and json Path items : $.[*]

Attention : avec le mode jsonpath, il faut penser à déclarer les attriibuts autres que "id et "type", dans la liste "JSON Path Attributes".

prooblème 1 : 
le datasource cache, utilisé pour le REST (cache_ds) n'estt pas bien confiiiguré au niveau du container, (jndi)
et il y a une erreur : "Unable to load data from dataset meteo OCB direct Please check dataset & widget config"

changez pour utiliser une connection jdbc  avec la base de données MySQL :
URL : jdbc:mysql://knowagedb:3306/knowagedb
knowageuser/knowagepassword
Vérifier que c'est OK avec le bouton test.

Pour chaque data set don't forget :
 - to configure admin role or your role to be authorized to "**Default Dataset Category**"
 - to use "**Default Dataset Category**" when you create a data set
 - to set USER for the scope of a data set


Dans un cockpit (tableau de bord)


Pour un widget Table :
Si le data set est correctement configuré, pas de pb particulier

Pour les widget chart :
Idem, si le data set est correctement configuré, pas de pb particulier 

Map Widget :
sur un mapwidget on ne peut pas mettre 2 fois le même data set dans 2 couches différentes
donc si vous voulez utiliser le même data set dans 2 couches différentes, dupliquer le data set, et ultiliser la copie dans la seconde couche.

probléme 2 => J'ai été obligé de hacker "knowagecockpitengine/src/main/webapp/js/src/angular_1.4/cockpit/services/cockpitModule_mapServices.js", 
pour pouvoir faire afficher les objets en geoJSON, car l'attribut spatial n'est plus en geoJSON ('=' au lieu de ':' et pas de " pour les chaines), il a fallu le reconvertir en geoJSON...
Cependant, ce n'est peut-être pas l'endroit idéal pour faire ces modifications, c'est plutôt au niveau du data set REST, qu'il y a des choses à régler...

Si on utilise NGSI, Knowage tente de souscrire auprés du context broker pour recevoir des notifications, mais le POST de la "subscription" ne passe pas (erreur 404), l'url utilisée n'est pas comprise par l'API MNCA, car Knowage pense causer à un context broker NGSI...
=> il faudrait avoir accès directement au context broker, plutôt qu'à l'API MNCA, ou pouvoir utiliser l'URL pour la souscription, au travers de l'API (configuration par la DSI de l'API manager frontal)...
=> de même pour l'accès à l'historique, un accès direct à la base de données historique serait plus efficace, car l'implémentation des data set REST dans Knowage, n'est pas aussi avancé que les data set utilisant des data sources base de données...


Pour voir les erreurs serveur dans le container Knowage :
se connecter sur le coontainer
docker exec -ti <container id> bash
puis : 
tail -f /home/knowage/apache-tomcat/logs/knowage.log

trucs à voir pour déploiement :

pb pool connection database 
=> dans config data source on peut changer la taille du pool de connections !
mais pour s'apercevoir qu'il y a un pb il faut voir dans les logs (/home/knowage/apache-tomcat/logs/knowage.log), quuand le truc se met à ramer...

voir comment rediriger aussi les logs knowage.log au niveau du container...

temps démarrage long (sur ma machine), compilation des jsp à chaque démarrage : peut-on faire quelque chose ?
changement pour postgres au lieu de mysql !
dèjà pour le cache !
