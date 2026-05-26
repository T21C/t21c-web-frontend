/** Discord-aligned username rules — keep in sync with server/src/misc/utils/auth/username.ts */

export const USERNAME_MIN_LEN = 2;
export const USERNAME_MAX_LEN = 32;

export const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/;

export function usernameHasConsecutivePeriods(username) {
  return username.includes('..');
}

export function getUsernameFormatError(username) {
  if (username.length < USERNAME_MIN_LEN || username.length > USERNAME_MAX_LEN) {
    return { type: 'length' };
  }
  if (!USERNAME_REGEX.test(username)) {
    return { type: 'characters' };
  }
  if (usernameHasConsecutivePeriods(username)) {
    return { type: 'consecutivePeriods' };
  }
  return null;
}

export function validateUsername(username) {
  if (!username) {
    return {
      isValid: false,
      message: '',
      invalidChar: '',
      invalidCharIndex: -1,
      errorType: '',
    };
  }

  const formatError = getUsernameFormatError(username);
  if (formatError?.type === 'length') {
    return {
      isValid: false,
      message: '',
      invalidChar: '',
      invalidCharIndex: -1,
      errorType: 'length',
    };
  }
  if (formatError?.type === 'consecutivePeriods') {
    return {
      isValid: false,
      message: '',
      invalidChar: '.',
      invalidCharIndex: username.indexOf('..'),
      errorType: 'consecutivePeriods',
    };
  }
  if (formatError?.type === 'characters') {
    for (let i = 0; i < username.length; i++) {
      if (!/^[a-zA-Z0-9_.]$/.test(username[i])) {
        return {
          isValid: false,
          message: '',
          invalidChar: username[i],
          invalidCharIndex: i,
          errorType: 'characters',
        };
      }
    }
  }

  return {
    isValid: true,
    message: '',
    invalidChar: '',
    invalidCharIndex: -1,
    errorType: '',
  };
}

/** Strip disallowed characters while typing (Discord charset). */
export function sanitizeUsernameInput(value) {
  let next = value.replace(/[^a-zA-Z0-9_.]/g, '');
  while (next.includes('..')) {
    next = next.replace(/\.\./g, '.');
  }
  return next.slice(0, USERNAME_MAX_LEN);
}
