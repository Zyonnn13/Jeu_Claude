/** Une scène possède la boucle de jeu pendant qu'elle est active (menu principal, partie...). */
export interface Scene {
  /** La partie doit continuer fenêtre réduite ou cachée (hôte d'une partie en ligne). */
  readonly runsInBackground?: boolean;
  enter(): void;
  exit(): void;
  update(dt: number): void;
  render(): void;
}
