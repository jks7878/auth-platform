# Auth Platform

JWT 기반 인증 lifecycle을 설계하고 검증하기 위한 인증 플랫폼 프로젝트입니다.

NestJS 기반 API 서버와 React 기반 테스트 클라이언트를 통해 인증 구조를 단계적으로 설계하고 검증합니다.

---

# 프로젝트 목표

여러 서비스에서 공통으로 사용할 수 있는 인증 시스템을 구축합니다.

각 서비스에 인증 로직을 중복 구현하는 대신 인증 책임을 분리하여 하나의 플랫폼에서 관리하는 구조를 목표로 합니다.
```
예시 구조:
Service A
Service B
Service C
↓
Auth Platform
```
이 구조를 통해 다음과 같은 효과를 기대할 수 있습니다:

- 인증 로직 중복 제거
- 인증 정책 중앙 관리
- 서비스 간 인증 흐름 일관성 유지
- 확장 가능한 인증 구조 확보
- 보안 정책 변경 시 영향 범위 최소화

---

# Architecture Overview

NestJS 기반 인증 서버가 사용자 인증과 토큰 lifecycle을 관리하고, React 기반 테스트 클라이언트를 통해 인증 흐름이 실제로 어떻게 동작하는지 단계적으로 검증할 수 있도록 구성했습니다.

기본 인증 단계에서는 bcrypt 기반 비밀번호 해싱과 validation을 적용하여 사용자 자격 증명을 안전하게 처리합니다. 이후 인증 상태를 stateless하게 유지하기 위해 JWT 기반 access token / refresh token 구조를 도입했으며, 토큰은 httpOnly 쿠키를 통해 전달하여 XSS 환경에서의 노출 가능성을 줄였습니다.

단순 JWT 구조만으로는 refresh token 탈취 시 세션 제어가 어렵기 때문에, refresh token을 Redis에 상태 기반으로 저장하고 rotation 전략을 적용하여 토큰 재사용 공격(replay attack) 가능성을 줄였습니다. 이전 refresh token이 다시 사용될 경우 reuse detection 로직을 통해 세션을 즉시 revoke 하도록 설계하여 인증 상태를 서버에서 통제할 수 있도록 했습니다.

또한 access token 만료 시 사용자 경험이 단절되지 않도록 interceptor 기반 silent refresh를 적용했으며, 테스트 클라이언트를 통해 rotation, reuse detection, revoke 흐름을 시각적으로 확인할 수 있도록 구성했습니다. refresh token lifecycle의 핵심 정책(rotation, reuse detection, revoke)은 별도 서비스로 분리하고 단위 테스트를 통해 상태 변화가 의도한 흐름대로 동작하는지 검증했습니다.

## Tech Stack

### Backend
- NestJS
- Prisma ORM
- MariaDB
- Redis
- bcrypt
- class-validator

### Frontend (Test Client)
- React
- TypeScript
- axios
---

# 프로젝트 구조
```
auth-platform
├── api # NestJS 인증 서버
├── web # React 테스트 클라이언트
├── docker # DB init script
└── docker-compose.yml # 로컬 개발 환경 구성
```

# 개발 단계 (Roadmap)

이 프로젝트는 단계적으로 확장될 예정입니다.

---

## Phase 1 (완료)

계정 기반 인증의 최소 기능 구현

- 회원가입
- 로그인
- bcrypt 비밀번호 해싱
- 입력값 validation
- React 테스트 폼 구현
- 서버 에러 처리
- CORS 설정

---

## Phase 2 (완료)

JWT 기반 인증 도입

- JWT payload 설계
- JWT access / refresh 전략 구성
- access / refresh guard 구현
- 쿠키 기반 인증 처리
- `/auth/me` 보호 API 구현
- `/auth/refresh` 수동 재발급 구현
- `/auth/sign-out` 로그아웃 구현

---

## Phase 3 (완료)

토큰 관리 전략

- 토큰 저장 전략
- reuse detection 기반 세션 revoke 정책
- refresh token rotation
- Silent Refresh 구현
- 토큰 lifecycle 정책 검증을 위한 단위 테스트 구성

---

## Phase 4 (예정)

플랫폼 구조 개선

- 인증 서버 독립 배포 구조 정리
- 환경변수 관리
- Docker 구성
- 서비스 간 인증 흐름 예시 추가

---

# Design Principles

- 인증 책임을 서비스로부터 분리하여 재사용 가능한 구조 구성
- stateless access + stateful refresh 전략을 통한 인증 lifecycle 제어
- 보안 정책과 사용자 경험 사이의 균형 고려

# 참고

이 프로젝트는 인증 시스템 설계 학습 및 포트폴리오 목적으로 개발되었습니다.
