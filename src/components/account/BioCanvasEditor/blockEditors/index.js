import TextBlockEditor from "./TextBlockEditor";
import LinkBlockEditor from "./LinkBlockEditor";
import SocialBlockEditor from "./SocialBlockEditor";
import ImageBlockEditor from "./ImageBlockEditor";
import EmbedBlockEditor from "./EmbedBlockEditor";
import FeaturedLevelsBlockEditor from "./FeaturedLevelsBlockEditor";
import { BLOCK_TYPE_LABELS } from "@/utils/bioCanvas/registry";

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
