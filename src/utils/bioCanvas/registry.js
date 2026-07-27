import { textBlockDescriptor } from "./blocks/text";
import { linkBlockDescriptor } from "./blocks/link";
import { socialBlockDescriptor } from "./blocks/social";
import { imageBlockDescriptor } from "./blocks/image";
import { embedBlockDescriptor } from "./blocks/embed";
import { featuredLevelsBlockDescriptor } from "./blocks/featuredLevels";

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
