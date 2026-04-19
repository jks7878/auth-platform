import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import axios from "axios";

type Mode = "sign-in" | "sign-up";

type FormState = {
  username: string;
  password: string;
  confirmPassword: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;
type TouchedState = Record<keyof FormState, boolean>;

function validateSignIn(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.username.trim()) {
    errors.username = "username을 입력해주세요.";
  }

  if (!form.password.trim()) {
    errors.password = "password를 입력해주세요.";
  }

  return errors;
}

function validateSignUp(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.username.trim()) {
    errors.username = "username을 입력해주세요.";
  }

  if (!form.password.trim()) {
    errors.password = "password를 입력해주세요.";
  } else if (form.password.length < 8) {
    errors.password = "password는 8자 이상이어야 합니다.";
  }

  if (!form.confirmPassword.trim()) {
    errors.confirmPassword = "confirm password를 입력해주세요.";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "비밀번호가 일치하지 않습니다.";
  }

  return errors;
}

function validate(mode: Mode, form: FormState): FormErrors {
  return mode === "sign-in" ? validateSignIn(form) : validateSignUp(form);
}

const initialForm: FormState = {
  username: "",
  password: "",
  confirmPassword: "",
};

const initialTouched: TouchedState = {
  username: false,
  password: false,
  confirmPassword: false,
};

export default function SignForm() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("sign-in");
  const [form, setForm] = useState<FormState>(initialForm);
  const [touched, setTouched] = useState<TouchedState>(initialTouched);
  const [loading, setLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState("");

  const errors = useMemo(() => validate(mode, form), [mode, form]);
  const isValid = Object.keys(errors).length === 0;

  function updateField(key: keyof FormState, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    setServerMessage("");
  }

  function handleBlur(key: keyof FormState) {
    setTouched((prev) => ({
      ...prev,
      [key]: true,
    }));
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setServerMessage("");
    setTouched(initialTouched);
    setForm((prev) => ({
      ...prev,
      password: "",
      confirmPassword: "",
    }));
  }

  async function submitSignForm() {
    if (mode === "sign-in") {
      return axios.post("http://localhost:3000/auth/sign-in", 
        {
            username: form.username,
            password: form.password,
        },
        {
            withCredentials: true
        });
    }

    return axios.post("http://localhost:3000/auth/sign-up", {
      username: form.username,
      password: form.password,
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setTouched({
      username: true,
      password: true,
      confirmPassword: mode === "sign-up",
    });

    setServerMessage("");

    if (!isValid) return;

    setLoading(true);

    try {
      const response = await submitSignForm();

      console.log("success:", response.data)

      if (mode === "sign-up") {
        setServerMessage("회원가입이 완료되었습니다. 로그인해주세요.");
        setMode("sign-in");
        setForm({
          username: form.username,
          password: "",
          confirmPassword: "",
        });
        setTouched(initialTouched);
        return;
      }

      navigate('/auth-test', { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;

        setServerMessage(
          typeof message === "string"
            ? message
            : "요청 처리 중 오류가 발생했습니다."
        );
      } else {
        setServerMessage("알 수 없는 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "520px",
        margin: "0 auto",
        padding: "32px",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "32px" }}>
        {mode === "sign-in" ? "Sign In" : "Sign Up"}
      </h1>

      <p
        style={{
          textAlign: "center",
          color: "#666",
          marginBottom: "24px",
        }}
      >
        인증 흐름 테스트용 기본 폼
      </p>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
        }}
      >
        <button
          type="button"
          onClick={() => changeMode("sign-in")}
          disabled={loading}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "10px",
            border: "1px solid #d9dce1",
            backgroundColor: mode === "sign-in" ? "#0b1736" : "#eef1f5",
            color: mode === "sign-in" ? "#fff" : "#111",
            cursor: "pointer",
          }}
        >
          Sign In
        </button>

        <button
          type="button"
          onClick={() => changeMode("sign-up")}
          disabled={loading}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "10px",
            border: "1px solid #d9dce1",
            backgroundColor: mode === "sign-up" ? "#0b1736" : "#eef1f5",
            color: mode === "sign-up" ? "#fff" : "#111",
            cursor: "pointer",
          }}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "16px" }}>
          <input
            type="text"
            placeholder="username"
            value={form.username}
            onChange={(e) => updateField("username", e.target.value)}
            onBlur={() => handleBlur("username")}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: "10px",
              border: "1px solid #cfd4dc",
              fontSize: "16px",
              boxSizing: "border-box",
            }}
          />
          {touched.username && errors.username && (
            <p
              style={{
                marginTop: "8px",
                color: "red",
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              {errors.username}
            </p>
          )}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <input
            type="password"
            placeholder="password"
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
            onBlur={() => handleBlur("password")}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: "10px",
              border: "1px solid #cfd4dc",
              fontSize: "16px",
              boxSizing: "border-box",
            }}
          />
          {touched.password && errors.password && (
            <p
              style={{
                marginTop: "8px",
                color: "red",
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              {errors.password}
            </p>
          )}
        </div>

        {mode === "sign-up" && (
          <div style={{ marginBottom: "16px" }}>
            <input
              type="password"
              placeholder="confirm password"
              value={form.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              onBlur={() => handleBlur("confirmPassword")}
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "10px",
                border: "1px solid #cfd4dc",
                fontSize: "16px",
                boxSizing: "border-box",
              }}
            />
            {touched.confirmPassword && errors.confirmPassword && (
              <p
                style={{
                  marginTop: "8px",
                  color: "red",
                  fontSize: "14px",
                  textAlign: "center",
                }}
              >
                {errors.confirmPassword}
              </p>
            )}
          </div>
        )}

        {serverMessage && (
          <p
            style={{
              marginBottom: "16px",
              color: serverMessage.includes("성공") || serverMessage.includes("완료")
                ? "green"
                : "red",
              fontSize: "14px",
              textAlign: "center",
            }}
          >
            {serverMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: "#0b1736",
            color: "#fff",
            fontSize: "18px",
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? "처리 중..."
            : mode === "sign-in"
            ? "Sign In"
            : "Sign Up"}
        </button>
      </form>
    </div>
  );
}
