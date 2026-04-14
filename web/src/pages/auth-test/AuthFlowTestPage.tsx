import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

type AuthUser = {
  userId: number;
  username: string;
} | null;

const api = axios.create({
  baseURL: "http://localhost:3000",
  withCredentials: true,
});

export default function AuthFlowTestPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<AuthUser>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  async function fetchMe() {
    const response = await api.get("/auth/me", { withCredentials: true });
    
    return response.data;
  }

  async function checkAuthStatus() {
    setError("");

    try {
      const me = await fetchMe();
    
      setUser(me);
      setMessage("로그인된 사용자 상태를 확인했습니다.");
    } catch {
      setUser(null);
      setMessage("");
    } finally {
      setIsCheckingAuth(false);
    }
  }

  useEffect(() => {
    checkAuthStatus();
  }, []);

  async function handleGetMe() {
    setMessage("");
    setError("");

    try {
      const me = await fetchMe();
      
      setUser(me);
      setMessage("인증된 사용자 정보 조회 성공");
    } catch {
      setUser(null);
      setError("인증되지 않은 사용자입니다.");
    }
  }

  async function handleRefresh() {
    setMessage("");
    setError("");

    try {
      await api.post("/auth/refresh");
      const me = await fetchMe();

      setUser(me);
      setMessage("토큰 재발급 성공");
    } catch {
      setUser(null);
      setError("refresh 실패");
    }
  }

  async function handleLogout() {
    setMessage("");
    setError("");

    try {
      await api.post("/auth/logout");
      setUser(null);
      setMessage("로그아웃 성공");
    } catch {
      setError("로그아웃 실패");
    }
  }

  async function handleSilentRefreshTest() {
    setMessage("");
    setError("");

    try {
      const me = await fetchMe();
      setUser(me);
      setMessage("access token 유효");
    } catch {
      try {
        await api.post("/auth/refresh");
        const me = await fetchMe();

        setUser(me);
        setMessage("refresh 후 인증 성공");
      } catch {
        setUser(null);
        setError("refresh 실패 → 재로그인 필요");
      }
    }
  }

  return (
    <div style={{ padding: 40, maxWidth: 700, margin: "0 auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: 24 }}>
        Auth Flow Test Page
      </h2>

      <section
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          marginBottom: 32,
          flexWrap: "wrap",
        }}
      >
        <button onClick={() => navigate('/')}>Back</button>
        <button onClick={handleGetMe}>Get Me (access token 검증)</button>
        <button onClick={handleRefresh}>Refresh Token</button>
        {/* <button onClick={handleLogout}>Logout</button>
        <button onClick={handleSilentRefreshTest}>Silent Refresh Test</button> */}
      </section>

      <section style={{ textAlign: "center" }}>
        <h3 style={{ marginBottom: 20 }}>현재 상태</h3>

        {isCheckingAuth ? (
          <div>인증 상태 확인 중...</div>
        ) : user ? (
          <div>
            <div style={{ marginBottom: 8, color: "green" }}>로그인되어 있음</div>
            <div>userId: {user.userId}</div>
            <div>username: {user.username}</div>
          </div>
        ) : (
          <div>로그인되지 않음</div>
        )}
      </section>

      <section style={{ marginTop: 24, textAlign: "center" }}>
        {message && <div style={{ color: "green" }}>{message}</div>}
        {error && <div style={{ color: "red" }}>{error}</div>}
      </section>
    </div>
  );
}
