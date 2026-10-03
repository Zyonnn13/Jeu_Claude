/** Une scène possède la boucle de jeu pendant qu'elle est active (menu principal, partie...). */
export interface Scene {
  enter(): void;
  exit(): void;
  update(dt: number): void;
  render(): void;
}
