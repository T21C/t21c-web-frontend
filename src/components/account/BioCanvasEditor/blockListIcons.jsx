import {
  FaFont,
  FaImage,
  FaLink,
  FaPlay,
  FaShareAlt,
  FaStar,
} from "react-icons/fa";

export const BLOCK_LIST_ICONS = {
  text: FaFont,
  link: FaLink,
  social: FaShareAlt,
  image: FaImage,
  embed: FaPlay,
  featuredLevels: FaStar,
};

export function BlockListIcon({ type }) {
  const Icon = BLOCK_LIST_ICONS[type] ?? FaImage;
  return <Icon aria-hidden="true" />;
}
