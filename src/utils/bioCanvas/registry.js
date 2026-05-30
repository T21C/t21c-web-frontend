import { textBlockDescriptor } from "./blocks/text.js";
import { linkBlockDescriptor } from "./blocks/link.js";
import { socialBlockDescriptor } from "./blocks/social.js";
import { imageBlockDescriptor } from "./blocks/image.js";
import { embedBlockDescriptor } from "./blocks/embed.js";
import { featuredLevelsBlockDescriptor } from "./blocks/featuredLevels.js";

export const BLOCK_DESCRIPTORS = [
  textBlockDescriptor,
  linkBlockDescriptor,
  socialBlockDescriptor,
  imageBlockDescriptor,
  embedBlockDescriptor,
  featuredLevelsBlockDescriptor,
];

const descriptorByType = new Map(BLOCK_DESCRIPTORS.map((d) => [d.type, d]));

export function getBlockDescriptor(type) {
  return descriptorByType.get(type);
}

export const BLOCK_TYPES = BLOCK_DESCRIPTORS.map((d) => d.type);

export const BLOCK_TYPE_LABELS = {
  text: "Text",
  link: "Link",
  social: "Social",
  image: "Image",
  embed: "Video",
  featuredLevels: "Featured",
};

export function getBlockTypeLabel(type) {
  return BLOCK_TYPE_LABELS[type] ?? type ?? "Unknown";
}

export {
  textBlockDescriptor,
  linkBlockDescriptor,
  socialBlockDescriptor,
  imageBlockDescriptor,
  embedBlockDescriptor,
  featuredLevelsBlockDescriptor,
};
