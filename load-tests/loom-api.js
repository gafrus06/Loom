import http from 'k6/http';
import { check, group, sleep } from 'k6';
import exec from 'k6/execution';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:12717';
const PROFILE = __ENV.PROFILE || 'load';
const USER_COUNT = Number(__ENV.USER_COUNT || '500');
const PASSWORD = __ENV.PASSWORD || 'LoadTest123!';
const EMAIL_DOMAIN = __ENV.EMAIL_DOMAIN || 'load.local';
const RUN_ID = __ENV.RUN_ID || `${Date.now()}`;
const SKIP_REGISTER = (__ENV.SKIP_REGISTER || 'false').toLowerCase() === 'true';
const AUTH_ONLY = (__ENV.AUTH_ONLY || 'false').toLowerCase() === 'true';
const SUMMARY_FORMAT = (__ENV.SUMMARY_FORMAT || 'text').toLowerCase();
const SETUP_WAIT_SECONDS = Number(__ENV.SETUP_WAIT_SECONDS || '0');

const commonThresholds = {
  http_req_failed: ['rate<0.05'],
  http_req_duration: ['p(95)<1500', 'p(99)<3000'],
  checks: ['rate>0.95'],
};

const profiles = {
  // Normal expected traffic. Use this as the main baseline in the diploma.
  load: {
    stages: [
      { duration: '1m', target: 50 },
      { duration: '3m', target: 50 },
      { duration: '1m', target: 0 },
    ],
    thresholds: commonThresholds,
  },

  // Gradually goes above the expected capacity to find the breaking point.
  stress: {
    stages: [
      { duration: '2m', target: 50 },
      { duration: '3m', target: 100 },
      { duration: '3m', target: 200 },
      { duration: '3m', target: 300 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.10'],
      http_req_duration: ['p(95)<3000', 'p(99)<6000'],
      checks: ['rate>0.90'],
    },
  },

  // Short sudden peak. Shows how the system reacts to traffic spikes.
  spike: {
    stages: [
      { duration: '30s', target: 20 },
      { duration: '30s', target: 300 },
      { duration: '1m', target: 300 },
      { duration: '30s', target: 20 },
      { duration: '1m', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.15'],
      http_req_duration: ['p(95)<4000', 'p(99)<8000'],
      checks: ['rate>0.85'],
    },
  },

  // Long stable load. For a real diploma run it for 1-2 hours or more.
  soak: {
    stages: [
      { duration: '5m', target: 50 },
      { duration: __ENV.SOAK_DURATION || '30m', target: 50 },
      { duration: '5m', target: 0 },
    ],
    thresholds: commonThresholds,
  },
};

export const options = {
  discardResponseBodies: false,
  noConnectionReuse: false,
  setupTimeout: `${SETUP_WAIT_SECONDS + 120}s`,
  stages: profiles[PROFILE]?.stages || profiles.load.stages,
  thresholds: profiles[PROFILE]?.thresholds || profiles.load.thresholds,
};

export function setup() {
  const users = [];

  for (let i = 0; i < USER_COUNT; i += 1) {
    const email = `k6-${RUN_ID}-${i}@${EMAIL_DOMAIN}`;
    users.push({ email, password: PASSWORD });

    if (!SKIP_REGISTER) {
      const res = http.post(
        `${BASE_URL}/api/auth/register`,
        JSON.stringify({ email, password: PASSWORD }),
        { headers: { 'Content-Type': 'application/json' }, tags: { name: 'POST /api/auth/register' } },
      );

      check(res, {
        'register status is 200 or 409': (r) => r.status === 200 || r.status === 409,
      });
    }
  }

  if (!AUTH_ONLY && !SKIP_REGISTER && SETUP_WAIT_SECONDS > 0) {
    sleep(SETUP_WAIT_SECONDS);
  }

  return { users };
}

export default function (data) {
  const user = data.users[(exec.vu.idInTest - 1) % data.users.length];

  group('health', () => {
    const res = http.get(`${BASE_URL}/actuator/health`, { tags: { name: 'GET /actuator/health' } });
    check(res, {
      'health is 200': (r) => r.status === 200,
    });
  });

  let accessToken;

  group('auth login', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify(user),
      { headers: { 'Content-Type': 'application/json' }, tags: { name: 'POST /api/auth/login' } },
    );

    accessToken = readJsonField(res, 'accessToken');

    check(res, {
      'login is 200': (r) => r.status === 200,
      'access token exists': () => Boolean(accessToken),
    });
  });

  if (!AUTH_ONLY && accessToken) {
    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    group('user profile', () => {
      const profile = http.get(`${BASE_URL}/api/users/profile`, {
        headers: authHeaders,
        tags: { name: 'GET /api/users/profile' },
      });

      check(profile, {
        'profile is 200': (r) => r.status === 200,
      });

      const completion = http.get(`${BASE_URL}/api/users/profile/completion-status`, {
        headers: authHeaders,
        tags: { name: 'GET /api/users/profile/completion-status' },
      });

      check(completion, {
        'completion status is 200': (r) => r.status === 200,
      });
    });

    group('news feed', () => {
      const feed = http.get(`${BASE_URL}/api/feed/my-feed?filter=all&page=0&size=20`, {
        headers: authHeaders,
        tags: { name: 'GET /api/feed/my-feed' },
      });

      check(feed, {
        'news feed is 200': (r) => r.status === 200,
      });
    });
  }

  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  const jsonSummary = JSON.stringify(data, null, 2);

  return {
    [`load-tests/results/${PROFILE}-summary.json`]: jsonSummary,
    stdout: SUMMARY_FORMAT === 'json' ? `${jsonSummary}\n` : textSummary(data),
  };
}

function textSummary(data) {
  const metrics = data.metrics;
  const duration = metrics.http_req_duration;
  const failed = metrics.http_req_failed;
  const requests = metrics.http_reqs;

  return [
    '',
    `k6 profile: ${PROFILE}`,
    `base url: ${BASE_URL}`,
    `requests: ${requests?.count || 0}`,
    `failed rate: ${failed?.rate || 0}`,
    `http p95: ${duration?.percentiles?.['95'] || 0} ms`,
    `http p99: ${duration?.percentiles?.['99'] || 0} ms`,
    '',
  ].join('\n');
}

function readJsonField(response, field) {
  try {
    return response.json(field);
  } catch {
    return null;
  }
}
