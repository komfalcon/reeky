// Asset bundle status constants
export const STATUS = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
});

// User preference constants
export const LEARNING_STYLES = Object.freeze({
  VISUAL: 'visual',
  AUDITORY: 'auditory',
  TEXTUAL: 'textual',
});

export const EXPLANATION_DEPTHS = Object.freeze({
  SIMPLE: 'simple',
  EXECUTIVE: 'executive',
  DETAILED: 'detailed',
});

export const TONES = Object.freeze({
  ACADEMIC: 'academic',
  CONVERSATIONAL: 'conversational',
  ELI5: 'elif5',
});

export const EXAM_PACING = Object.freeze({
  FAST: 'fast',
  DEEP_DIVE: 'deep-dive',
});

// HTTP status codes
export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
});