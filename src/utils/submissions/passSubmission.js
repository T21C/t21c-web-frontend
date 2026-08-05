// tuf-search: #passSubmission #submissions
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { throwFromError } from '@/utils/submissions/formErrors';

/**
 * Pass submission client. The pass branch is pure JSON — no files, no
 * multipart, no upload orchestration. The one-shot endpoint at
 * `/v2/form/pass/submit` handles everything server-side.
 */

export async function submitPass(payload, { signal } = {}) {
  try {
    const res = await api.post(routes.form.pass.submit(), payload, { signal });
    return res.data;
  } catch (err) {
    throwFromError(err, 'Pass submission failed');
  }
}
