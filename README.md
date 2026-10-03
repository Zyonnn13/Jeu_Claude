# Nuit Éternelle

Roguelike « survivor » en 2D pixel art, inspiré de Vampire Survivors. Vos armes attaquent toutes seules : à vous de vous déplacer, d’esquiver et de bien choisir vos bonus pour survivre aux 15 manches de la nuit.

## Lancer le jeu

Double-cliquez sur **`Jouer.bat`**. Le jeu s’ouvre dans sa propre fenêtre (Microsoft Edge en mode application, sans barre d’adresse). Appuyez sur **F11** pour passer en plein écran.

Le jeu fonctionne hors-ligne : tout est contenu dans le fichier `dist/index.html`. Si ce fichier manque, `Jouer.bat` le recompile automatiquement (il faut alors [Node.js](https://nodejs.org)).

## Commandes

| Action | Clavier | Manette |
| --- | --- | --- |
| Se déplacer | ZQSD, WASD ou flèches | Stick gauche / croix |
| Choisir un bonus | Clic, touches 1 à 4, ou flèches + Entrée | Croix + A |
| Relancer les choix | R | — |
| Pause | Échap ou P | Start |

Les armes tirent automatiquement.

## Déroulement d’une partie

- **15 manches** chronométrées. Les manches 5, 10 et 15 sont des **combats de boss** (Roi Gluant, Liche Ancestrale, Comte Vladislav).
- Les ennemis lâchent des **gemmes d’expérience**. À chaque niveau, vous choisissez parmi 3 bonus : nouvelle arme, amélioration d’arme, objet passif.
- À la fin de chaque manche, vous choisissez une **relique** (commune, rare, épique ou légendaire) et récupérez 25 % de vos PV.
- Les **élites** (ennemis rouges, plus gros) et les boss lâchent des **coffres** : ils permettent de faire **évoluer** une arme au niveau maximum si vous possédez l’objet passif associé (par exemple Lame + Cœur vaillant → Faucheuse écarlate).
- Les **braseros** du décor se brisent et contiennent du poulet (soin), de l’or, un aimant ou une bombe.
- Après la victoire, vous pouvez continuer en **mode infini**.
- L’**or** gagné est conservé : dépensez-le dans **Améliorations** (bonus permanents) ou pour débloquer **Brom le Nain**.

**Contenu** : 4 personnages, 9 armes + 9 évolutions, 12 objets passifs, 26 reliques, 8 types d’ennemis, 3 boss, 13 améliorations permanentes. Musique et effets sonores sont synthétisés en direct.

## Architecture

Le jeu est écrit en **TypeScript** et dessiné sur un **canvas 2D** (rapide même avec des centaines d’ennemis), avec une interface en HTML/CSS par-dessus. **Vite** produit un fichier HTML unique et autonome.

```
src/
├── main.ts              Point d'entrée
├── core/                Application : boucle, scènes, sauvegarde
│   ├── Game.ts          Services partagés (rendu, entrées, son, interface) + boucle principale
│   ├── Scene.ts         Interface commune des scènes
│   └── SaveManager.ts   Sauvegarde locale (or, améliorations, records, options)
├── engine/              Moteur générique, indépendant du jeu
│   ├── Renderer.ts      Canvas, zoom entier (pixel art net), dessin de sprites
│   ├── Assets.ts        Chargement des sprites + variantes (miroir, flash blanc, teinte)
│   ├── Input.ts         Clavier (AZERTY et QWERTY) et manette
│   ├── Audio.ts         Synthétiseur WebAudio : effets sonores et musique
│   ├── Camera.ts, SpatialHash.ts, EventBus.ts, Rng.ts, math.ts
├── data/                Contenu du jeu, sous forme de tables (aucune logique)
│   ├── weapons.ts       Armes, niveaux et évolutions
│   ├── enemies.ts       Ennemis et boss
│   ├── waves.ts         Les 15 manches (+ génération du mode infini)
│   ├── passives.ts, relics.ts, characters.ts, metaUpgrades.ts
│   └── balance.ts       Constantes d'équilibrage et courbes de difficulté
├── game/                Simulation d'une partie
│   ├── World.ts         État de la partie, orchestre les systèmes à chaque frame
│   ├── Stats.ts         Statistiques du joueur (sources de bonus additionnées)
│   ├── entities/        Joueur, ennemis, projectiles, objets au sol, zones
│   ├── weapons/         Un comportement par type d'arme (Weapon.ts = classe de base)
│   ├── systems/         Combat, IA, vagues, ramassage, reliques, choix de bonus, effets
│   └── render/          Rendu du monde et du sol procédural
├── scenes/              Menu principal et partie en cours
├── ui/                  Interface DOM : HUD, écrans, navigation clavier/manette
└── styles/main.css      Thème visuel
tools/
├── generate-assets.mjs  Génère les sprites PNG à partir de tools/sprites/*.mjs
└── sprites/             Pixel art décrit en ASCII (personnages, ennemis, icônes...)
```

Principes :

- **Données séparées de la logique** : ajouter une arme, un ennemi, une relique ou modifier une manche se fait surtout dans `src/data/`.
- **Systèmes découplés** : les reliques, le HUD et l’audio réagissent à des événements (`enemy:killed`, `wave:start`...) via un bus d’événements typé.
- **Moteur réutilisable** : `src/engine/` ne connaît rien du jeu.

## Modifier le jeu

Installez [Node.js](https://nodejs.org), puis dans ce dossier :

```bash
npm install
```

```bash
npm run dev
```

Ouvrez ensuite l’adresse affichée (http://localhost:5173) : chaque modification du code est visible immédiatement. Ajoutez `?debug` à l’adresse pour activer les raccourcis de test : **F1** niveau suivant, **F2** fin de manche, **F3** invincibilité, **F4** coffre, **F6** +1000 or.

Une fois satisfait, double-cliquez sur **`Compiler.bat`** (ou `npm run build`) pour mettre à jour `dist/index.html`.

**Sprites** : les PNG de `src/assets/sprites/` sont modifiables avec n’importe quel logiciel de pixel art (Aseprite, Piskel...). Gardez les mêmes dimensions (les animations sont des bandes de frames côte à côte). Pour régénérer tous les sprites depuis leurs descriptions ASCII, utilisez `npm run assets` — attention, cela écrase les PNG modifiés à la main.

**Équilibrage** : les dégâts et niveaux des armes sont dans `src/data/weapons.ts`, les manches dans `src/data/waves.ts`, et la montée en difficulté dans `src/data/balance.ts`.

## Sauvegarde

La progression est enregistrée dans le stockage local d’Edge, associé au fichier du jeu. Elle est conservée entre les lancements tant que le dossier du jeu n’est pas déplacé. L’option « Effacer la sauvegarde » se trouve dans le menu Options.
