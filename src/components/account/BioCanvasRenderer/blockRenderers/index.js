import TextBlockRenderer from "./TextBlockRenderer";
import LinkBlockRenderer from "./LinkBlockRenderer";
import SocialBlockRenderer from "./SocialBlockRenderer";
import ImageBlockRenderer from "./ImageBlockRenderer";
import EmbedBlockRenderer from "./EmbedBlockRenderer";
import FeaturedLevelsBlockRenderer from "./FeaturedLevelsBlockRenderer";
import "../bioCanvasRenderer.css";

export { SOCIAL_ICON_MAP } from "./socialIcons";

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
