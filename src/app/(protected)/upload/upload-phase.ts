/** Publish screen + pipeline (INIT → PUT → FINALIZE). */
export type UploadPagePhase =
  | 'idle'
  | 'initializing'
  | 'uploading'
  | 'finalizing'
  | 'done'
  | 'error';
