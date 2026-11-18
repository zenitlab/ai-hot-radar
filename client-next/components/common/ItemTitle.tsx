/**
 * An item's title in both forms: the Chinese translation and the source's
 * original. Which one shows is decided by CSS from `data-title-mode` on
 * <html> (see TitleModeToggle and globals.css), so it works the same in
 * server components and needs no client JS. Items whose title is already
 * Chinese render once.
 */
export function ItemTitle({ item }: { item: { title: string; titleZh?: string | null } }) {
  const zh = item.titleZh?.trim();
  if (!zh || zh === item.title.trim()) return <>{item.title}</>;
  return (
    <>
      <span className="title-zh">{zh}</span>
      <span className="title-orig">{item.title}</span>
    </>
  );
}
