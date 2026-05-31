import { routes } from "@/api/routes";

/** @typedef {'player' | 'creator'} BioCanvasProfileKind */

/**
 * API routes for saving bio canvas (player or creator profile).
 * @param {BioCanvasProfileKind} profileKind
 */
export function getBioCanvasApiRoutes(profileKind) {
  if (profileKind === "creator") {
    return {
      patchCanvas: routes.creatorsV3.meBioCanvas,
      postImage: routes.creatorsV3.meBioCanvasImage,
    };
  }
  return {
    patchCanvas: routes.playersV3.meBioCanvas,
    postImage: routes.playersV3.meBioCanvasImage,
  };
}
