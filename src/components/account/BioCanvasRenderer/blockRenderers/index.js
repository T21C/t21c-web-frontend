import TextBlockRenderer from "./TextBlockRenderer.jsx";
import LinkBlockRenderer from "./LinkBlockRenderer.jsx";
import SocialBlockRenderer from "./SocialBlockRenderer.jsx";
import ImageBlockRenderer from "./ImageBlockRenderer.jsx";
import EmbedBlockRenderer from "./EmbedBlockRenderer.jsx";
import FeaturedLevelsBlockRenderer from "./FeaturedLevelsBlockRenderer.jsx";
import "../bioCanvasRenderer.css";

export { SOCIAL_ICON_MAP } from "./socialIcons.js";

export const BLOCK_RENDERERS = {
  text: TextBlockRenderer,
  link: LinkBlockRenderer,
  social: SocialBlockRenderer,
  image: ImageBlockRenderer,
  embed: EmbedBlockRenderer,
  featuredLevels: FeaturedLevelsBlockRenderer,
};

export function getBlockRenderer(type) {
  return BLOCK_RENDERERS[type] ?? null;
}
