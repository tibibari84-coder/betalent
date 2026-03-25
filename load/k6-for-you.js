import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
};

const BASE = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE}/api/feed/for-you?limit=10`, {
    headers: { 'x-request-id': `k6-${__VU}-${__ITER}` },
  });

  check(res, {
    'status ok': (r) => [200, 429, 503].includes(r.status),
  });

  sleep(1);
}
