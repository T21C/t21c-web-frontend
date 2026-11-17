// tuf-search: #submissionSort #submissionManagement — sort keys for the submission queues

export const LEVEL_SUBMISSION_SORTS = [
  { value: 'submitted', type: 'time' },
  { value: 'difficulty', type: 'difficulty' },
  { value: 'ratio', type: 'ratio' },
];

export const PASS_SUBMISSION_SORTS = [
  { value: 'submitted', type: 'time' },
  { value: 'difficulty', type: 'difficulty' },
  { value: 'ratio', type: 'ratio' },
];

const DEFAULT_DIR = {
  time: 'desc',
  difficulty: 'desc',
  ratio: 'desc',
};

export function defaultSortDir(type) {
  return DEFAULT_DIR[type] || 'desc';
}

export function submissionSortOptions(kind) {
  return kind === 'passes' ? PASS_SUBMISSION_SORTS : LEVEL_SUBMISSION_SORTS;
}
