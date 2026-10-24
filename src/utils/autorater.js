export const AUTORATER_USER_ID = 'b19522b7-c12b-42d8-9fcd-08b0cdbf8b7e';

export const isAutoraterDetail = (detail) =>
  (detail?.userId || detail?.user?.id) === AUTORATER_USER_ID;

export function autoraterResizeHeight(event, frameWindow, origin, levelId) {
  const message = event.data;
  if (!frameWindow || event.source !== frameWindow || event.origin !== origin
    || message?.type !== 'auto-rater-cat:resize' || message.levelId !== levelId
    || typeof message.height !== 'number' || !Number.isFinite(message.height)) return null;
  return Math.min(2400, Math.max(300, Math.ceil(message.height)));
}
