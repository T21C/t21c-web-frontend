export const MAX_DOWNLOAD_LEVEL_PAGES = 3;

export const removeDownloadedLevel = (current, id) => {
  let removed = 0;
  const pages = current.pages.map((page) => {
    const startIndex = page.startIndex == null ? page.startIndex : Math.max(0, page.startIndex - removed);
    const items = page.items.filter((item) => item.id !== Number(id));
    removed += page.items.length - items.length;
    return { ...page, startIndex, items };
  });
  if (!removed) return current;
  const totalCount = Math.max(0, current.totalCount - removed);
  return {
    ...current,
    totalCount,
    pages: pages.map((page) => ({ ...page, totalCount: page.totalCount == null ? page.totalCount : totalCount })),
  };
};

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

export const mergePositionedDownloadedLevelPage = (current, page, direction) => {
  const withoutSameRange = current.pages.filter((entry) => entry.startIndex !== page.startIndex);
  let pages = [...withoutSameRange, page].sort((left, right) => left.startIndex - right.startIndex);

  if (pages.length > MAX_DOWNLOAD_LEVEL_PAGES) {
    if (direction === 'previous') pages = pages.slice(0, MAX_DOWNLOAD_LEVEL_PAGES);
    else pages = pages.slice(pages.length - MAX_DOWNLOAD_LEVEL_PAGES);
  }

  return {
    ...current,
    pages,
    totalCount: page.totalCount,
  };
};
