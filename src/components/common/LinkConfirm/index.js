export { LinkConfirmProvider, useLinkConfirm, useExternalLink } from "./LinkConfirmProvider";
export { ExternalLink } from "./ExternalLink";
export {
  APPROVED_EXTERNAL_HOSTS,
  getUnapprovedExternalUrl,
  isApprovedNavigationUrl,
  resolveNavigationUrl,
} from "@/utils/externalNavigation";
export { navigateExternal, confirmExternalNavigation } from "@/utils/externalNavigationGate";
