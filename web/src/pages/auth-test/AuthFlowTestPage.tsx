import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '@/api/axios';
import type { RetryableRequestConfig } from '@/api/types';

type AuthUser = {
  userId: number;
  username: string;
} | null;

type CaptureRefreshTokenResponse = {
  success: boolean;
  refreshToken: string;
};

type TokenHistoryItem = {
  label: string;
  refreshToken: string;
};

type AuthFlowLogItem = {
  id: number;
  message: string;
  timestamp: number;
};

const ACCESS_TOKEN_EXPIRES_SECONDS = 5;

export default function AuthFlowTestPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<AuthUser>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [tokenHistory, setTokenHistory] = useState<TokenHistoryItem[]>([]);

  const [silentRefreshLogs, setSilentRefreshLogs] = useState<AuthFlowLogItem[]>([]);
  const visibleSilentRefreshLogs = silentRefreshLogs.slice(0, 3);
  const [accessExpiresIn, setAccessExpiresIn] = useState<number | null>(null);
  const [accessTimerStartedAt, setAccessTimerStartedAt] = useState<number | null>(null);

  function nextLabel(counter: number) {
    return String.fromCharCode(65 + counter); // A, B, C...
  }

  function maskToken(token: string) {
    if (!token) return '';
    if (token.length <= 12) return token;
    return `${token.slice(0, 6)} ... ${token.slice(-6)}`;
  }

  function resetStatus() {
    setMessage('');
    setError('');
  }

  function pushToken(refreshToken: string) {
    setTokenHistory((prev) => {
      const newIndex = prev.length;
      const label = nextLabel(newIndex);

      return [
        ...prev,
        {
          label,
          refreshToken,
        },
      ];
    });
  }

  const currentToken = useMemo(() => {
    if (tokenHistory.length === 0) return null;
    return tokenHistory[tokenHistory.length - 1];
  }, [tokenHistory]);

  const previousToken = useMemo(() => {
    if (tokenHistory.length < 2) return null;
    return tokenHistory[tokenHistory.length - 2];
  }, [tokenHistory]);

  async function checkAuthStatus(showMessage = true) {
    if (showMessage) resetStatus();

    try {
      const { data } = await api.get<AuthUser>('/auth/me');
      setUser(data);
      resetAccessExpiryCountdown();

      if (showMessage) {
        setMessage('현재 인증 상태를 확인했습니다.');
      }
    } catch (err: any) {
      setUser(null);

      if (showMessage) {
        setError(
          err?.response?.status === 401
            ? '비로그인 상태입니다.'
            : '인증 상태 확인 중 오류가 발생했습니다.',
        );
      }
    }
  }

  async function handleCaptureRefreshToken() {
    resetStatus();

    try {
      const { data } =
        await api.post<CaptureRefreshTokenResponse>('/auth/test/capture-refresh-token');

      if (!data?.refreshToken) {
        setError('캡처된 refresh token이 없습니다.');
        return;
      }

      const alreadyExists = tokenHistory.some(
        (item) => item.refreshToken === data.refreshToken,
      );

      if (alreadyExists) {
        setMessage('현재 refresh token은 이미 이력에 저장되어 있습니다.');
        return;
      }

      pushToken(data.refreshToken);
      setMessage('현재 쿠키의 refresh token을 저장했습니다.');
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          'refresh token 저장 요청에 실패했습니다.',
      );
    }
  }

  async function handleRefresh() {
    resetStatus();

    try {
      await api.post('/auth/refresh');
      resetAccessExpiryCountdown();
      setMessage(
        '정상 refresh가 수행되었습니다. 이제 Capture Refresh Token으로 새 토큰을 저장하세요.',
      );
      await checkAuthStatus(false);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? 'refresh 요청에 실패했습니다.',
      );
    }
  }

  async function handleReplayPreviousToken() {
    resetStatus();

    if (!previousToken) {
      setError('재사용 테스트를 위한 previous token이 없습니다.');
      return;
    }

    try {
      await api.post('/auth/test/replay-refresh-token', 
      {
        refreshToken: previousToken.refreshToken,
      },
      {
        skipSilentRefresh: true,
        skipAuthRedirect: true,
      } as RetryableRequestConfig);

      setMessage('previous token 재사용 요청이 수행되었습니다.');
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          'previous token 재사용 요청이 실패했습니다.',
      );
    } finally {
      await checkAuthStatus(false);
    }
  }

  async function handleLogout() {
    resetStatus();
    setAccessTimerStartedAt(null);
    setAccessExpiresIn(null);

    try {
      await api.post('/auth/sign-out');
      setUser(null);
      setMessage('로그아웃 요청 처리 완료');
      await checkAuthStatus(false);
    } catch {
      setError('로그아웃 요청 처리 실패');
    }
  }

  function handleResetHistory() {
    resetStatus();
    setTokenHistory([]);
    setMessage('토큰 이력을 초기화했습니다.');
  }

  function pushSilentRefreshLog(message: string) {
    setSilentRefreshLogs((prev) => [
      {
        id: Date.now() + Math.random(),
        message,
        timestamp: Date.now(),
      },
      ...prev,
    ]);
  }

  function resetAccessExpiryCountdown() {
    setAccessTimerStartedAt(Date.now());
    setAccessExpiresIn(ACCESS_TOKEN_EXPIRES_SECONDS);
  }

  useEffect(() => {
    checkAuthStatus(false);
  }, []);

  useEffect(() => {
    function handleAuthFlowEvent(
      event: Event,
    ) {
      const customEvent = event as CustomEvent<{
        type: string;
        message: string;
        timestamp: number;
      }>;

      pushSilentRefreshLog(customEvent.detail.message);

      if (customEvent.detail.type === 'silent_refresh_succeeded') {
        resetAccessExpiryCountdown();
      }
    }

    window.addEventListener('auth-flow-event', handleAuthFlowEvent);

    return () => {
      window.removeEventListener('auth-flow-event', handleAuthFlowEvent);
    };
  }, []);

  useEffect(() => {
    if (!accessTimerStartedAt) return;

    const interval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - accessTimerStartedAt) / 1000);
      const remaining = Math.max(ACCESS_TOKEN_EXPIRES_SECONDS - elapsed, 0);
      setAccessExpiresIn(remaining);
    }, 250);

    return () => window.clearInterval(interval);
  }, [accessTimerStartedAt]);

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>Auth Flow Test Page</h1>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: '24px',
        }}
      >
        <button onClick={() => navigate('/')}>Back</button>
        <button onClick={() => checkAuthStatus()}>Get Me (access token 검증)</button>
        <button onClick={handleCaptureRefreshToken}>Capture Refresh Token</button>
        <button onClick={handleRefresh}>Refresh Token</button>
        <button onClick={handleReplayPreviousToken}>Replay Previous Token</button>
        <button onClick={handleResetHistory}>Reset Token History</button>
        <button onClick={handleLogout}>Logout</button>
      </div>

      <section style={{ marginTop: '48px', textAlign: 'center' }}>
        <h2>현재 상태</h2>
        <p>{user ? `로그인됨: ${user.username} (#${user.userId})` : '로그인되지 않음'}</p>

        {message && <p style={{ color: 'green' }}>{message}</p>}
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
      </section>

      <section style={{ marginTop: '24px' }}>
        <h2>Silent Refresh Logs</h2>
        <p>
          Access Token TTL (demo): <strong>{ACCESS_TOKEN_EXPIRES_SECONDS}s</strong>
        </p>
        <p>
          Access Expires In:{' '}
          <strong>{accessExpiresIn === null ? '-' : `${accessExpiresIn}s`}</strong>
        </p>
        <p style={{ color: '#666' }}>
          5초가 지난 뒤 <code>Get Me</code>를 누르면 silent refresh가 자동으로 시도됩니다.
        </p>
        {visibleSilentRefreshLogs.length === 0 ? (
          <p>아직 silent refresh 로그가 없습니다.</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {visibleSilentRefreshLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '14px',
                }}
              >
                <div>
                  <strong>{new Date(log.timestamp).toLocaleTimeString()}</strong>
                </div>

                <div>{log.message}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: '40px' }}>
        <h2>Rotation 상태</h2>
        <p>Current Token: {currentToken?.label ?? '-'}</p>
        <p>Previous Token: {previousToken?.label ?? '-'}</p>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h2>토큰 이력</h2>

        {tokenHistory.length === 0 ? (
          <p>아직 저장된 refresh token 이력이 없습니다.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {tokenHistory.map((item, index) => {
              const role =
                item.label === currentToken?.label
                  ? 'current'
                  : item.label === previousToken?.label
                    ? 'previous'
                    : 'older / expired';

              return (
                <div
                  key={index}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '12px 16px',
                  }}
                >
                  <div><strong>Label:</strong> {item.label}</div>
                  <div><strong>Token:</strong> {maskToken(item.refreshToken)}</div>
                  <div><strong>Role:</strong> {role}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ marginTop: '32px' }}>
        <h2>권장 검증 시나리오</h2>
        <ol>
          <li>로그인 직후 <code>Capture Refresh Token</code>으로 A를 저장한다.</li>
          <li><code>Refresh Token</code> 실행 후 다시 <code>Capture Refresh Token</code>으로 B를 저장한다.</li>
          <li>한 번 더 <code>Refresh Token</code> 실행 후 다시 <code>Capture Refresh Token</code>으로 C를 저장한다.</li>
          <li>이제 current는 C, previous는 B 상태가 된다.</li>
          <li><code>Replay Previous Token</code>으로 B를 다시 보내 reuse detection을 확인한다.</li>
          <li>이후 <code>Get Me</code>, <code>Refresh Token</code>, <code>Logout</code> 등을 통해 revoke 결과를 확인한다.</li>
        </ol>
      </section>
    </div>
  );
}
