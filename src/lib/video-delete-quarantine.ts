/**
 * Back-compat re-exports. New code should import from `@/lib/video-global-filter`.
 */
export {
  EXCLUDE_DELETED,
  EXCLUDE_QUARANTINE,
  GLOBAL_VIDEO_FILTER,
  QUARANTINE_FLAG_REASONS,
} from './video-global-filter';

import { GLOBAL_VIDEO_FILTER } from './video-global-filter';

/** @deprecated Same as {@link GLOBAL_VIDEO_FILTER} (soft-delete + integrity quarantine). */
export const excludeStorageDeleteQuarantine = GLOBAL_VIDEO_FILTER;
