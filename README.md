# Nuit Éternelle

Roguelike « survivor » en 2D pixel art, inspiré de Vampire Survivors. Vos armes attaquent toutes seules : à vous de vous déplacer, d’esquiver et de bien choisir vos bonus pour tenir jusqu’au bout de la nuit.

- **Solo**, **coopération locale** jusqu’à 4 sur le même écran, ou **en ligne** jusqu’à 4 avec un simple code.
- Deux modes : **Manches** (15 manches, 3 boss) et **Survie** (10 minutes, La Faucheuse au bout), plus un **défi du jour**.
- 6 héros, 9 armes et leurs 9 évolutions, 12 objets passifs, 26 reliques, 8 synergies, 3 cartes, 6 niveaux de danger, 24 succès.
- Rendu **WebGL2** avec **éclairage nocturne dynamique** : votre lumière, les lanternes, chandeliers et champignons luminescents, les sorts et les flammes éclairent la nuit.
- Musique et effets sonores synthétisés en direct. Le jeu fonctionne hors-ligne (seul le jeu en ligne a besoin d’Internet).

## Lancer le jeu

### Avec Jouer.bat

Double-cliquez sur **`Jouer.bat`** :

- si la version .exe a été créée (`release\NuitEternelle.exe`, voir ci-dessous), c’est elle qui est lancée ;
- sinon, le jeu s’ouvre dans sa propre fenêtre Microsoft Edge (mode application, sans barre d’adresse). Tout le jeu tient dans un seul fichier, `dist/index.html`. S’il manque (premier lancement), `Jouer.bat` le compile automatiquement : il faut alors [Node.js](https://nodejs.org).

Appuyez sur **F11** pour passer en plein écran (aussi dans Paramètres › Graphismes).

### Version .exe pour Windows

Double-cliquez sur **`Creer-exe.bat`** (il lance `npm run exe` ; Node.js nécessaire, comptez plusieurs minutes la première fois). Vous obtenez **`release\NuitEternelle.exe`** :

- un **seul fichier portable** (environ 90 Mo), avec l’icône du jeu, **sans installation** ;
- il se lance sans Node.js ni navigateur et peut être copié tel quel sur un autre PC (pratique pour jouer en ligne avec des amis) ;
- `Jouer.bat` le démarre automatiquement dès qu’il existe ;
- **F11** ou **Alt+Entrée** passent en plein écran ; un seul exemplaire du jeu peut être ouvert à la fois.

À chaque lancement, l’exe se décompresse en quelques secondes dans le dossier temporaire de Windows. `release\win-unpacked\Nuit Eternelle.exe` est le même jeu déjà décompressé (démarrage immédiat, mais il a besoin de tout son dossier). L’exe n’est pas signé : si Windows affiche « Windows a protégé votre ordinateur », cliquez sur **Informations complémentaires › Exécuter quand même**.

Après une modification du jeu, relancez `Creer-exe.bat` : l’exe ne se met pas à jour tout seul. Le workflow GitHub Actions **Exe Windows** (onglet Actions, lancement manuel ou tag `v*`) fabrique aussi l’exe et le propose en téléchargement.

**Attention :** la sauvegarde de la version .exe est **séparée** de celle de la version Edge. Pour garder votre progression, exportez-la depuis la version Edge (**Paramètres › Sauvegarde › Exporter la sauvegarde**), puis importez le fichier dans l’exe (**Importer une sauvegarde**).

## Commandes

| Action | Clavier | Manette |
| --- | --- | --- |
| Se déplacer | ZQSD (AZERTY), WASD (QWERTY) ou flèches | Stick gauche ou croix |
| Naviguer dans les menus | Flèches (ou touches de déplacement), souris | Stick gauche ou croix |
| Valider | Entrée, Espace ou clic | A |
| Retour | Échap ou Retour arrière | B |
| Choisir un bonus | Touches 1 à 4, ou flèches + Entrée | Croix + A |
| Relancer les choix | R | Y |
| Pause | Échap ou P | Start |
| Plein écran | F11 | — |

- Les armes tirent automatiquement : il n’y a pas de bouton d’attaque.
- Les touches suivent leur **position physique** : ZQSD sur un clavier AZERTY et WASD sur un clavier QWERTY fonctionnent sans rien régler. Déplacements, pause et relance sont **réassignables** (deux touches chacun) dans **Paramètres › Commandes**.
- Manettes au format Xbox (disposition standard), avec vibrations (désactivables).
- La relance des choix n’est possible qu’après avoir acheté l’amélioration permanente **Relance** (jusqu’à 3 relances par partie).

## Modes de jeu

Depuis le menu **Solo**, choisissez un mode, puis votre héros, puis la carte et le niveau de danger.

### Déroulement d’une partie

- Les ennemis lâchent des **gemmes d’expérience**. À chaque niveau, vous choisissez parmi 3 bonus (parfois 4 avec de la chance) : nouvelle arme, amélioration d’arme ou objet passif. Au maximum 6 armes et 6 objets passifs ; une arme monte jusqu’au niveau 8.
- Les **élites** (ennemis teintés de rouge, bien plus résistants) et les **boss** lâchent des **coffres**. Une arme au niveau maximum **évolue** si vous possédez l’objet passif associé : l’évolution est alors proposée dans le coffre suivant (par exemple Lame du chevalier + Cœur vaillant → Faucheuse écarlate).
- Posséder deux armes précises active une **synergie** (voir [Contenu](#contenu)).
- Les **braseros** du décor se brisent et contiennent du poulet (soin), une bourse d’or, un aimant, une bombe ou une grosse gemme.
- L’**or** gagné est conservé (avec un bonus en cas de victoire) : dépensez-le dans **Améliorations** ou pour débloquer Brom le Nain.

### Manches

- **15 manches** chronométrées (de 30 s à 1 min). Les manches **5**, **10** et **15** sont des combats de boss (Roi Gluant, Liche Ancestrale, Comte Vladislav) : elles durent jusqu’à la mort du boss.
- À la fin d’une manche, les ennemis restants s’effondrent et leurs gemmes sont aspirées vers vous. Vous gagnez un peu d’or, choisissez une **relique** (commune, rare, épique ou légendaire) et récupérez **25 % de vos PV** (moitié moins en danger 4, rien en danger 5).
- La victoire s’obtient en battant le Comte. Vous pouvez ensuite **continuer en mode infini** : des manches générées de plus en plus dures, avec un boss toutes les 5 manches (20, 25, 30…).

### Survie (10 min)

- Des hordes **ininterrompues** qui changent et se renforcent chaque minute, avec des élites régulières et des encerclements.
- **Reliques** à **1:40**, **3:20**, **6:40** et **8:20**, plus une après le sous-boss (5 en tout). Chacune rend **15 % de vos PV** (moitié moins en danger 4, rien en danger 5) et aspire les gemmes et l’or restés au sol.
- **5:00** : un **sous-boss** apparaît (la Liche Ancestrale, ou le Roi Gluant dans la Forêt maudite).
- **10:00** : **La Faucheuse** arrive et balaie tous les autres ennemis (même le sous-boss s’il est encore en vie) ; les gemmes au sol sont aspirées. La vaincre donne la victoire ; vous pouvez ensuite continuer dans une **nuit sans fin** où les hordes grossissent toujours plus.
- Le record retenu est votre meilleur temps de survie.

### Défi du jour

- Héros, carte, niveau de danger (1 à 3) et **2 règles spéciales** sont tirés au sort à partir de la date : le même défi pour tout le monde, renouvelé chaque jour (en mode Manches). Tous les héros et toutes les cartes peuvent tomber, même ceux que vous n’avez pas encore débloqués.
- Tentatives illimitées : le jeu retient le nombre d’essais et votre meilleure manche du jour.
- Les **10 règles spéciales** possibles : Canon de verre, La Horde, Ruée vers l’or, Ennemis véloces, Pluie de projectiles, Sans répit, Géants, Bonne étoile, Nuit noire, Soif de sang.

### Niveaux de danger

Gagner une partie à un niveau de danger débloque le suivant (les victoires du défi du jour ne comptent pas).

| Danger | Effets | Or |
| --- | --- | --- |
| 0 — Normal | L’expérience prévue | — |
| 1 | Ennemis +15 % PV, +10 % dégâts | +10 % |
| 2 | Ennemis +30 % PV, +20 % dégâts, une élite de plus par manche | +20 % |
| 3 | Ennemis +45 % PV, +30 % dégâts, plus rapides ; boss +25 % PV | +35 % |
| 4 | Ennemis +65 % PV, +40 % dégâts ; soin entre manches réduit de moitié | +50 % |
| 5 | Ennemis +90 % PV, +60 % dégâts, deux élites de plus ; aucun soin entre manches | +75 % |

### Cartes

| Carte | Ambiance | Particularités | Déblocage |
| --- | --- | --- | --- |
| Cimetière oublié | Tombes et lanternes sous la lune | — | Dès le départ |
| Forêt maudite | Champignons luminescents dans le noir | Loups-garous et araignées géantes ; ennemis +15 % PV, or +20 % | Vaincre la Liche Ancestrale |
| Château du Comte | Couloirs éclairés de chandeliers | Armures maudites et gargouilles ; ennemis +30 % PV, or +40 % | Remporter une partie |

## Multijoueur

### En ligne (jusqu’à 4 joueurs)

1. **Multijoueur › Créer une partie en ligne** : un **code de 5 caractères** s’affiche (bouton Copier). Donnez-le à vos amis.
2. Vos amis entrent ce code dans **Multijoueur**, puis cliquent sur **Rejoindre**.
3. Dans le salon, chacun choisit son héros et se déclare prêt. L’hôte choisit le mode (Manches ou Survie 10 min), la carte et le danger parmi ceux qu’il a débloqués, puis lance la partie. Le salon a une discussion, et l’hôte peut exclure un joueur.

Comment ça marche :

- L’**hôte simule toute la partie**. Il reçoit les commandes des autres joueurs et leur envoie l’état du monde **15 fois par seconde** ; chez les invités, l’image est lissée et leur propre héros réagit immédiatement (prédiction locale).
- La connexion est **pair-à-pair (WebRTC)**. Le serveur public PeerJS ne sert qu’à la mise en relation : pas de compte, pas de serveur de jeu.
- **Tout le monde doit avoir la même version du jeu**, sinon l’invité est refusé (« Version du jeu différente de celle de l’hôte »).
- Chacun garde l’or gagné et profite de ses propres améliorations permanentes. Quand l’hôte met en pause, la partie s’arrête pour tout le monde.
- Les choix de bonus se font **en même temps** : chaque joueur reçoit les siens un par un, sur son écran.
- La partie continue si l’hôte **réduit sa fenêtre** ou passe sur une autre application. Si l’hôte se fige, les invités voient « L’hôte ne répond plus… ».
- Quand un joueur ferme le jeu, les autres sont prévenus aussitôt ; s’il plante ou perd sa connexion, il est retiré au bout de **30 s** (et la partie s’arrête pour les invités si c’est l’hôte).

**Votre propre serveur de mise en relation** (par exemple sur un réseau local, ou si le serveur public est injoignable) : ajoutez `?peer=hote:port` à l’adresse du jeu. Lancez un serveur PeerJS sur un PC du réseau :

```bash
npx -p peer peerjs --port 9000
```

(depuis le dossier du jeu, après `npm install`, `npx peerjs --port 9000` suffit)

puis chaque joueur ouvre le jeu dans son navigateur avec l’adresse `file:///C:/chemin/du/jeu/dist/index.html?peer=192.168.1.20:9000` (remplacez par l’adresse IP du PC qui fait tourner le serveur). Sans port, 9000 est utilisé ; avec le port 443, la connexion est sécurisée. Tous les joueurs doivent utiliser le même serveur.

### Coopération locale (jusqu’à 4 sur un écran)

- **Multijoueur › Coopération locale** : un joueur au clavier (bouton « Rejoindre au clavier ») et les autres à la manette (chaque manette rejoint en appuyant sur **Y**). Chacun choisit son héros, puis vous choisissez le mode, la carte et le danger. Start ne quitte pas le salon (B ou Échap pour revenir).
- La caméra suit le groupe : restez ensemble !
- L’expérience et l’or sont communs : quand l’équipe monte de niveau, chaque joueur choisit à tour de rôle son propre bonus, dans sa couleur, **avec son clavier ou sa manette** (les autres ne peuvent pas choisir à sa place ; la souris reste utilisable par tous, et si sa manette est débranchée, n’importe qui peut répondre).
- Tous les joueurs profitent des améliorations permanentes de la sauvegarde.
- Plus il y a de joueurs, plus les ennemis sont nombreux et résistants.

En coop locale comme en ligne, un joueur tombé à 0 PV est **à terre** : restez 2,5 s à côté de lui pour le **relever** (avec 35 % de ses PV). Les joueurs à terre se relèvent aussi au prochain choix de relique. La partie est perdue quand tout le monde est tombé.

## Contenu

| | Nombre | Détail |
| --- | --- | --- |
| Héros | 6 | 3 dès le départ, 1 à acheter, 2 à débloquer par succès |
| Armes | 9 + 9 évolutions | 3 armes à débloquer par succès |
| Objets passifs | 12 | 5 niveaux chacun (2 pour l’Anneau de duplication) |
| Reliques | 26 | 9 communes, 7 rares, 6 épiques, 4 légendaires ; 5 à débloquer par succès |
| Synergies | 8 | |
| Ennemis | 12 + 4 boss | Bestiaire de 16 entrées |
| Cartes | 3 | 2 à débloquer par succès |
| Niveaux de danger | 6 | De 0 à 5 |
| Règles spéciales | 10 | Pour le défi du jour |
| Succès | 24 | 12 débloquent du contenu, 12 rapportent de l’or (50 à 3 000) |
| Améliorations permanentes | 13 | |

### Héros

| Héros | Arme de départ | Bonus | Déblocage |
| --- | --- | --- | --- |
| Aldric, le Chevalier | Lame du chevalier | +20 PV max, +1 armure | Dès le départ |
| Lyra, la Mage | Baguette arcanique | -10 % recharge, +10 % zone, -10 PV max | Dès le départ |
| Kaela, la Rôdeuse | Dagues de lancer | +15 % vitesse, +5 % coups critiques | Dès le départ |
| Brom, le Nain | Hache de guerre | +15 % dégâts, +30 PV max, -10 % vitesse | 600 or, sur l’écran de choix du héros |
| Séraphine, la Prêtresse | Orbes sacrés | +0,4 PV/s, +15 % durée, +10 % zone | Succès « Veilleur » : atteindre la manche 10 |
| Ozric, l’Alchimiste | Fiole incendiaire | +15 % zone, +25 % or, +5 % chance | Succès « Collectionneur » : ouvrir 25 coffres |

### Armes et évolutions

| Arme | + Objet passif | → Évolution | Déblocage |
| --- | --- | --- | --- |
| Lame du chevalier | Cœur vaillant | Faucheuse écarlate | Dès le départ |
| Baguette arcanique | Sablier | Sceptre du néant | Dès le départ |
| Dagues de lancer | Bottes ailées | Mille Lames | Dès le départ |
| Orbes sacrés | Grimoire | Anneau céleste | Dès le départ |
| Aura d’ail | Plastron | Sanctuaire | Dès le départ |
| Hache de guerre | Gantelet de force | Couperet du titan | Dès le départ |
| Foudre céleste | Anneau de duplication | Tempête divine | Succès « Tenir bon » : atteindre la manche 5 |
| Boomerang | Trèfle | Lune d’argent | Succès « Chasseur » : 1 000 ennemis vaincus au total |
| Fiole incendiaire | Lentille | Brasier infernal | Succès « Métamorphose » : faire évoluer une arme |

Les 12 objets passifs : Cœur vaillant, Plastron, Bottes ailées, Gantelet de force, Lentille, Sablier, Anneau de duplication, Grimoire, Aimant, Trèfle, Couronne, Pomme d’or.

Reliques à débloquer : Âmes instables (vaincre le Roi Gluant), Carquois enchanté (activer une synergie), Écho arcanique (atteindre le niveau 30), Égide divine (finir une manche sans être touché, à partir de la 3e) et Couronne des rois (5 000 ennemis vaincus au total). Plus la partie avance et plus vous avez de chance, plus les reliques rares sortent souvent.

### Synergies

Les évolutions comptent aussi.

| Synergie | Armes | Effet |
| --- | --- | --- |
| Orage de feu | Foudre + Fiole | Les éclairs embrasent le sol ; zones de feu +20 % |
| Tempête arcanique | Baguette + Foudre | Les projectiles magiques électrocutent parfois un ennemi proche |
| Danse des lames | Lame + Dagues | +8 % coups critiques, +25 % dégâts critiques |
| Garde sacrée | Orbes + Aura d’ail | Aura +30 % de zone, un orbe de plus |
| Tourbillon d’acier | Hache + Boomerang | Une hache de plus ; haches et boomerangs +25 % de taille |
| Feu purificateur | Fiole + Aura d’ail | Flammes +1 s et +3 dégâts ; aura +3 dégâts |
| Rempart | Orbes + Lame | Lame +20 % de zone ; orbes plus rapides et +5 dégâts |
| Pluie d’étoiles | Baguette + Orbes | Un projectile magique de plus, qui traverse un ennemi de plus |

### Ennemis et boss

- **Partout** : chauve-souris, gluant, zombie, squelette, œil maudit, spectre, cultiste (attaque à distance), golem.
- **Forêt maudite** : le loup-garou remplace le zombie, l’araignée géante remplace le squelette.
- **Château du Comte** : l’armure maudite remplace le zombie, la gargouille remplace l’œil maudit.

| Boss | Où le rencontrer |
| --- | --- |
| Roi Gluant | Manche 5 ; sous-boss de la Survie dans la Forêt maudite |
| Liche Ancestrale | Manche 10 ; sous-boss de la Survie au Cimetière et au Château |
| Comte Vladislav | Manche 15, boss final des Manches |
| La Faucheuse | Survie, à 10:00 |

Chaque boss change deux fois de phase et finit enragé. En mode infini, Roi Gluant, Liche et Comte reviennent à tour de rôle toutes les 5 manches.

### Progression

- **Améliorations** (13, payées en or, le prix augmente à chaque niveau) : Puissance, Vitalité, Armure, Récupération, Célérité, Concentration, Amplitude, Magnétisme, Sagesse, Avidité, Chance, Relance, Seconde vie.
- **Collection** : les 24 succès (avec leur progression), le bestiaire et vos records.

### Sensations de jeu

Micro-pauses et tremblements d’écran sur les gros coups, flash blanc des ennemis touchés, chiffres de dégâts et éclats critiques, cadavres projetés en tournoyant, son des gemmes qui monte quand on en ramasse à la suite, changements de phase et explosions en chaîne à la mort des boss, bords de l’écran qui rougissent quand vos PV sont bas, flèches vers les boss, coffres et coéquipiers hors de l’écran, vibrations de la manette.

## Paramètres

Six onglets, accessibles depuis le menu principal ou la pause :

| Onglet | Contenu |
| --- | --- |
| Graphismes | Carte graphique détectée et préréglage recommandé (choisi automatiquement au premier lancement : une RTX 4050 est classée Ultra) ; préréglages Bas, Moyen, Élevé, Ultra ou Personnalisé ; résolution de rendu (50 à 100 %) ; éclairage dynamique (désactivé, simple, complet) ; lueurs (bloom) ; ombres ; particules ; cadavres projetés ; vignette ; images par seconde max. (30, 60, 120, 144 ou illimité) ; compteur d’images par seconde ; plein écran |
| Audio | Volume général, musique, effets sonores ; couper le son quand la fenêtre n’est pas active |
| Commandes | Deux touches par commande (Haut, Bas, Gauche, Droite, Pause, Relancer les choix), Échap pour annuler, bouton « Touches par défaut » ; rappel des boutons de manette |
| Accessibilité | Mode daltonien (protanopie, deutéranopie, tritanopie) ; projectiles ennemis très contrastés ; réduction des flashs ; intensité des tremblements d’écran ; taille de l’interface (80 à 140 %) |
| Jeu | Pseudo (multijoueur) ; chiffres de dégâts ; pause automatique quand la fenêtre perd le focus ; indicateurs hors écran ; pseudos au-dessus des joueurs ; vibrations de la manette |
| Sauvegarde | Exporter et importer la sauvegarde ; effacer la progression (avec confirmation) |

Sur un PC portable, si c’est la carte graphique intégrée qui est détectée, choisissez la carte NVIDIA pour Edge (ou pour l’exe) dans Paramètres Windows › Affichage › Graphiques.

## Architecture

Le jeu est écrit en **TypeScript**. Le monde est dessiné par un moteur **WebGL2** maison (des milliers de sprites par appel GPU, carte de lumière pour la nuit), avec une interface en HTML/CSS par-dessus. **Vite** produit un fichier HTML unique et autonome.

```
index.html                 Page du jeu : canvas WebGL et calques d'interface
src/
├── main.ts                Point d'entrée
├── core/                  Application
│   ├── Game.ts            Services partagés (rendu, entrées, son, sauvegarde, interface) + boucle principale
│   ├── Scene.ts           Interface commune des scènes
│   ├── SaveManager.ts     Sauvegarde locale, paramètres, export/import
│   ├── Achievements.ts    Suivi des succès et de leurs récompenses
│   ├── Daily.ts           Défi du jour (tirage à partir de la date)
│   └── Display.ts         Correction daltonienne et taille de l'interface
├── engine/                Moteur générique, indépendant du jeu
│   ├── gl/                GLRenderer.ts (sprites instanciés, éclairage, vignette, flash),
│   │                      Atlas.ts (textures GPU), BitmapFont.ts (texte dans le monde)
│   ├── gpu.ts             Détection de la carte graphique et préréglage recommandé
│   ├── Input.ts           Clavier (AZERTY/QWERTY, touches réassignables) et manettes
│   ├── Audio.ts           Synthétiseur WebAudio : effets sonores et musique
│   ├── Assets.ts          Chargement des sprites
│   └── Camera.ts, SpatialHash.ts, EventBus.ts, Rng.ts, color.ts, math.ts
├── data/                  Contenu du jeu, sous forme de tables (aucune logique)
│   ├── characters.ts, weapons.ts, passives.ts, relics.ts, enemies.ts, synergies.ts
│   ├── waves.ts           Les 15 manches (+ génération du mode infini)
│   ├── biomes.ts          Cartes : sol, décor, lumières, ennemis remplacés
│   ├── danger.ts, mutators.ts, achievements.ts, unlocks.ts, metaUpgrades.ts
│   ├── balance.ts         Constantes d'équilibrage et courbes de difficulté
│   └── types.ts           Types partagés
├── game/                  Simulation d'une partie
│   ├── World.ts           État de la partie, orchestre les systèmes à chaque pas
│   ├── Hero.ts            Un héros par joueur (stats, armes, reliques, synergies)
│   ├── Stats.ts, RunModifiers.ts
│   ├── entities/          Joueur, ennemis, projectiles, objets au sol, zones
│   ├── weapons/           Un comportement par type d'arme (Weapon.ts = classe de base)
│   ├── systems/           WaveDirector (Manches), SurvivalDirector (Survie), combat, IA,
│   │                      ramassage, reliques, synergies, choix de bonus, effets...
│   └── render/            WorldRenderer (monde), GroundRenderer (sol procédural), WorldView
├── net/                   Multijoueur en ligne
│   ├── Transport.ts       Connexions WebRTC (PeerJS), codes de partie, option ?peer
│   ├── Lobby.ts           Salon : joueurs, héros, prêts, discussion
│   ├── Protocol.ts        Messages et images d'état binaires
│   ├── HostSession.ts     Côté hôte : commandes reçues, état envoyé 15 fois par seconde
│   └── ClientWorld.ts     Côté invité : monde reconstruit, lissé, prédiction locale
├── scenes/                MenuScene, GameScene (solo, coop, hôte), ClientGameScene (invité)
├── ui/                    Interface DOM : HUD, notifications, navigation clavier/manette
│   └── screens/           Un fichier par écran (menus, choix, salon, paramètres...)
├── assets/                Sprites PNG (+ manifest.json) et favicon
└── styles/                main.css, menus.css
tools/
├── generate-assets.mjs    Génère les sprites PNG à partir de tools/sprites/*.mjs
├── sprites/               Pixel art décrit en ASCII (personnages, ennemis, boss, icônes...)
├── generate-icon.mjs      Génère l'icône (electron/icon.ico, electron/icon.png, favicon)
├── png.mjs                Encodeur PNG sans dépendance
├── launch.ps1             Ouvre le jeu dans Edge (utilisé par Jouer.bat)
└── tests/                 Tests automatisés (voir plus bas)
electron/
├── main.cjs               Fenêtre de la version .exe (Electron)
└── icon.ico, icon.png     Icône de l'application
Jouer.bat, Compiler.bat, Creer-exe.bat
```

Principes :

- **Données séparées de la logique** : ajouter une arme, un ennemi, une relique ou modifier une manche se fait surtout dans `src/data/`.
- **Systèmes découplés** : les reliques, les annonces du HUD, les succès, les vibrations et le réseau réagissent à des événements (`enemy:killed`, `wave:start`...) via un bus d’événements typé.
- **Un seul code de rendu** : la simulation locale (`World`) et la copie reçue du réseau (`ClientWorld`) exposent la même vue (`WorldView`), dessinée de la même façon en solo, en coop et en ligne.
- **Moteur réutilisable** : `src/engine/` ne connaît rien du jeu.

## Modifier le jeu

Installez [Node.js](https://nodejs.org), puis dans ce dossier :

```bash
npm install
npm run dev
```

Ouvrez ensuite l’adresse affichée (http://localhost:5173) : chaque modification du code est visible immédiatement.

Ajoutez **`?debug`** à l’adresse (http://localhost:5173/?debug, ou `dist/index.html?debug`) pour afficher le compteur d’images par seconde et activer les raccourcis de test en partie :

| Touche | Effet |
| --- | --- |
| F1 | Niveau suivant |
| F2 | Étape suivante : tue le boss ou termine la manche ; en Survie, tue le boss ou saute juste avant le sous-boss, puis La Faucheuse |
| F3 | Invincibilité (activer / désactiver) |
| F4 | Fait apparaître un coffre |
| F6 | +1 000 or |
| F7 | +500 ennemis (test de performance) |
| F9 | Tue le boss |

Une fois satisfait :

- double-cliquez sur **`Compiler.bat`** (ou `npm run build`) pour mettre à jour `dist/index.html` ;
- relancez **`Creer-exe.bat`** (ou `npm run exe`) si vous jouez avec l’exe : il ne se met pas à jour tout seul.

`npm run typecheck` vérifie les types sans compiler.

**Sprites** : les PNG de `src/assets/sprites/` sont modifiables avec n’importe quel logiciel de pixel art (Aseprite, Piskel...). Gardez les mêmes dimensions (les animations sont des bandes de frames côte à côte). Pour régénérer tous les sprites depuis leurs descriptions ASCII, utilisez `npm run assets` (attention, cela écrase les PNG modifiés à la main) ; `npm run assets -- --preview apercu.png` produit en plus une planche agrandie.

**Icône** : `node tools/generate-icon.mjs` régénère `electron/icon.ico`, `electron/icon.png` et `src/assets/favicon.png`.

**Équilibrage** :

| Fichier | Ce qu’on y règle |
| --- | --- |
| `src/data/weapons.ts` | Dégâts, recharge et niveaux des armes et des évolutions |
| `src/data/enemies.ts` | PV, vitesse, dégâts et expérience des ennemis et des boss |
| `src/data/waves.ts` | Les 15 manches (durée, ennemis, élites, encerclements) et le mode infini |
| `src/game/systems/SurvivalDirector.ts` | Rythme de la Survie : ennemis par minute, reliques, sous-boss, La Faucheuse |
| `src/data/balance.ts` | Statistiques de base, soin entre manches, or, courbe d’expérience, montée en difficulté, rareté des reliques |
| `src/data/danger.ts`, `biomes.ts`, `mutators.ts` | Multiplicateurs des niveaux de danger, des cartes et des règles spéciales |
| `src/data/passives.ts`, `relics.ts`, `synergies.ts`, `characters.ts` | Bonus des objets, reliques, synergies et héros |
| `src/data/metaUpgrades.ts` | Améliorations permanentes et leur prix |

## Tests automatisés

Les scripts de `tools/tests/` jouent de vraies parties dans un navigateur sans fenêtre, pilotés par Playwright (installé par `npm install`). Sous Windows, ils utilisent Microsoft Edge ; ailleurs, installez Chromium une fois avec `npx playwright-core install chromium`.

| Commande | Ce qui est testé |
| --- | --- |
| `npm test` | Compile le jeu, puis lance les tests de coopération locale et du jeu en ligne |
| `npm run test:coop` | Coopération locale : salon, manettes simulées, déplacements, choix de chaque joueur, joueur à terre, pause, fin de partie (≈ 30 s) |
| `npm run test:online` | Jeu en ligne entre plusieurs navigateurs via un serveur PeerJS local : salon, discussion, partie, choix de bonus, pause, reliques, 4 joueurs, exclusion, fenêtre cachée, déconnexions et plantages (quelques minutes ; `-- duo`, `-- groupe` ou `-- hote` pour un seul scénario) |
| `npm run sim:survie` | Un robot joue une partie de Survie pour vérifier l’équilibrage (options en tête du fichier, par exemple `npm run sim:survie -- --character knight --seed 3 --profile prudent`) |

Tous ces scripts testent la version compilée (`dist/index.html`) : relancez `npm run build` après une modification (`npm test` le fait pour vous).

## Sauvegarde

La progression (or, améliorations, héros et contenus débloqués, succès, bestiaire, records, défi du jour) et les paramètres sont enregistrés automatiquement sur ce PC, dans le stockage local du navigateur (ou de l’exe).

- La version Edge et la version .exe ont chacune **leur propre sauvegarde** (celle de l’exe est dans `%APPDATA%\Nuit Eternelle`).
- **Paramètres › Sauvegarde › Exporter la sauvegarde** crée un fichier `nuit-eternelle-sauvegarde.json` ; **Importer une sauvegarde** le recharge, dans l’autre version ou sur un autre PC. L’import remplace la progression mais garde les paramètres de la machine.
- Pensez à exporter votre sauvegarde avant de changer d’ordinateur ou de déplacer le jeu.
- **Effacer la progression** (même onglet, avec confirmation) repart de zéro, en gardant les paramètres.
