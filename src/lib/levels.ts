export function levelTitleForXp(xp: number): string {
  if (xp < 200) return 'Novice Archivist';
  if (xp < 500) return 'Scholar';
  if (xp < 1000) return 'Senior Curator';
  return 'Master Archivist';
}
