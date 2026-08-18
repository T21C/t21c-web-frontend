export const MAX_DOWNLOAD_LEVEL_PAGES = 3;

export const mergeDownloadedLevelPage = (current, page, direction) => {
  const retainedIds = new Set(current.pages.flatMap((entry) => entry.items.map((item) => item.id)));
  const uniquePage = { ...page, items: page.items.filter((item) => !retainedIds.has(item.id)) };
  let pages;
  let firstItemIndex = current.firstItemIndex;

  if (direction === 'previous') {
    pages = [uniquePage, ...current.pages];
    firstItemIndex -= uniquePage.items.length;
    if (pages.length > MAX_DOWNLOAD_LEVEL_PAGES) pages.pop();
  } else {
    pages = [...current.pages, uniquePage];
    if (pages.length > MAX_DOWNLOAD_LEVEL_PAGES) {
      const removed = pages.shift();
      firstItemIndex += removed.items.length;
    }
  }

  return { ...current, pages, firstItemIndex };
};
