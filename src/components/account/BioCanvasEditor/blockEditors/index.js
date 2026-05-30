import TextBlockEditor from "./TextBlockEditor.jsx";
import LinkBlockEditor from "./LinkBlockEditor.jsx";
import SocialBlockEditor from "./SocialBlockEditor.jsx";
import ImageBlockEditor from "./ImageBlockEditor.jsx";
import EmbedBlockEditor from "./EmbedBlockEditor.jsx";
import FeaturedLevelsBlockEditor from "./FeaturedLevelsBlockEditor.jsx";
import { BLOCK_TYPE_LABELS } from "@/utils/bioCanvas/registry.js";

export { BLOCK_TYPE_LABELS };

export const BLOCK_EDITORS = {
  text: TextBlockEditor,
  link: LinkBlockEditor,
  social: SocialBlockEditor,
  image: ImageBlockEditor,
  embed: EmbedBlockEditor,
  featuredLevels: FeaturedLevelsBlockEditor,
};

export function getBlockEditor(type) {
  return BLOCK_EDITORS[type] ?? null;
}
