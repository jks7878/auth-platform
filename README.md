# Auth Platform

**Refresh Token Lifecycle을 고려하고, Rotation / Reuse Detection / Race Condition / Absolute Lifetime을 포함해 설계한 인증 플랫폼**

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

## Architecture Overview

본 프로젝트는 **여러 서비스에서 공통으로 사용할 수 있는 인증 플랫폼**을 목표로 설계되었습니다. 

NestJS 기반 인증 서버가 사용자 인증과 Refresh Token의 전체 Lifecycle을 중앙에서 관리하며, 서비스 간 인증 로직 중복을 제거하고 정책을 일관되게 적용할 수 있도록 구성했습니다.

주요 설계 방향은 다음과 같습니다:

- **Stateless Access Token + Stateful Refresh Token** 조합으로 인증 비용은 최소화하면서 세션 제어 가능성을 확보
- Refresh Token Rotation과 Reuse Detection을 통해 탈취된 토큰의 위험을 적극적으로 방어
- Refresh Token의 검증과 상태 전이를 **Redis Lua Script**를 통해 atomic operation으로 처리하여 race condition 문제를 해결
- Sliding Expiration과 함께 **Absolute Refresh Token Lifetime**을 도입하여 세션의 최대 수명을 제한
- `RefreshTokenStore`를 별도로 분리하여 Refresh Token의 상태 관리를 오케스트레이션하고, `RefreshService`는 전체 흐름을 조율하는 역할을 담당

또한 httpOnly Cookie와 Axios Interceptor 기반 Silent Refresh를 적용하여 보안과 사용자 경험의 균형을 고려했으며, 단위 테스트를 통해 핵심 정책들의 상태 전이가 의도대로 동작함을 검증했습니다.

이 구조를 통해 인증 시스템의 **보안성**, **확장성**, 그리고 **운영 안정성**을 동시에 추구하였습니다.

---

## Refresh Token Lifecycle Design

본 프로젝트는 Refresh Token을 단순 저장하는 것이 아닌, **전체 Lifecycle**을 체계적으로 관리하는 데 초점을 맞췄습니다.

### 주요 문제점과 해결 전략

기존 Refresh Token Rotation 구조에서 발생할 수 있는 문제들을 다음과 같이 해결했습니다:

| 문제 | 해결 전략 |
|------|----------|
| 검증과 상태 변경 분리로 인한 Race Condition | Redis Lua Script를 통한 Atomic Operation |
| 탈취된 Refresh Token 재사용 (Replay Attack) | Reuse Detection + 즉시 세션 Revoke |
| Sliding Expiration으로 인한 무한 세션 연장 | Absolute Refresh Token Lifetime 도입 |

### Atomic State Transition

Refresh Token의 검증, Rotation, Reuse Detection을 하나의 Lua Script로 묶어 **atomic**하게 처리했습니다. 이를 통해 동시 요청 상황에서도 일관된 상태 전이(`OK` 또는 `REUSED → Revoke`)를 보장합니다.

### Session Lifetime Control

- **Sliding Expiration**: 정상 사용 시 Refresh Token 수명 연장
- **Absolute Lifetime**: 최초 발급 시점부터 최대 수명 제한 (보안 강화)

`RefreshTokenStore`를 별도 분리하여 Refresh Token의 상태 전이를 담당하게 하고, 
`RefreshService`는 토큰 발급과 Store 응답에 따른 흐름 제어를 담당합니다.

단위 테스트를 통해 모든 상태 전이 시나리오를 검증하여 안정성을 확보했습니다.

---

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

## Quick Start

### Production 환경 실행

환경변수 파일을 생성합니다.

```bash
# macOS / Linux
cp .env.example .env

# Windows (PowerShell)
Copy-Item api/.env.example api/.env
```

Docker가 설치되어 있다면 아래 명령어로 전체 서비스를 실행할 수 있습니다.

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

서비스 접속:

Web: http://localhost

초기 실행 시 Prisma migration이 자동으로 수행됩니다.

---

# 프로젝트 구조
```
auth-platform
├── api # NestJS 인증 서버
├── web # React 테스트 클라이언트
├── docker # DB init script
├── docker-compose.yml # 로컬 개발 환경 구성
└── docker-compose.prod.yml # 배포 환경 구성
```
---

## Scalability & Infrastructure Considerations

이 프로젝트는 단일 인스턴스 환경에서 동작하지만, 확장을 고려한 구조로 설계되었습니다.

### Stateless 인증 구조

access token은 stateless하게 설계되어 인증 서버 확장 시 별도의 세션 동기화가 필요 없습니다.

### 중앙화된 세션 관리

refresh token은 Redis에 저장되어 여러 인스턴스에서 동일한 세션 상태를 공유할 수 있습니다.

### 확장 전략

- Auth 서버 수평 확장 (multi-instance)
- Redis를 통한 shared session store
- API Gateway를 통한 인증 요청 라우팅
- 추후 Redis Cluster 기반 확장 가능

또한 refresh token 상태 전이를 Redis에 집중시켜 인증 서버가 stateless하게 확장될 수 있도록 설계했습니다.

### 장애 대응 고려 사항

- Redis 장애 시 refresh 기능 제한 가능
- access token은 stateless 구조로 인해 기본 인증 유지 가능
- 향후 circuit breaker 및 fallback 전략 적용 가능
