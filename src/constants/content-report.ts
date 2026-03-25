/**
 * Content reporting: report types and labels for fake performance, copyright, etc.
 */

export type ContentReportTypeKey = 'FAKE_PERFORMANCE' | 'COPYRIGHT' | 'INAPPROPRIATE' | 'OTHER';

export const CONTENT_REPORT_TYPE_LABELS: Record<ContentReportTypeKey, string> = {
  FAKE_PERFORMANCE: 'Fake performance',
  COPYRIGHT: 'Copyright issue',
  INAPPROPRIATE: 'Inappropriate content',
  OTHER: 'Other',
};

export const CONTENT_REPORT_TYPE_DESCRIPTIONS: Record<ContentReportTypeKey, string> = {
  FAKE_PERFORMANCE: 'Playback, lip-sync, or non-live performance',
  COPYRIGHT: 'Copyright infringement or unauthorized use',
  INAPPROPRIATE: 'Inappropriate or harmful content',
  OTHER: 'Other violation of platform rules',
};
