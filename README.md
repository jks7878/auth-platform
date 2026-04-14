# Auth Platform

서비스 간 인증 로직을 분리하기 위한 인증 플랫폼 프로젝트입니다.  
NestJS 기반 API 서버와 React 기반 테스트 클라이언트를 통해 인증 흐름을 단계적으로 구현하고 있습니다.

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

이 구조를 통해 다음을 기대할 수 있습니다:

- 인증 로직 중복 제거
- 인증 정책 중앙 관리
- 서비스 간 인증 흐름 일관성 유지
- 확장 가능한 인증 구조 확보

---

## Backend

- NestJS 기반 인증 API 서버
- Prisma ORM + MariaDB
- bcrypt 기반 비밀번호 해싱
- DTO validation 적용 (class-validator)
- 회원가입 API 구현
- 로그인 API 구현
- CORS 설정

### 인증 흐름

회원가입

1. username 중복 확인
2. 비밀번호 bcrypt 해싱
3. 사용자 정보 DB 저장

로그인

1. username으로 사용자 조회
2. bcrypt.compare를 사용하여 비밀번호 검증
3. 인증 성공 시 사용자 정보 반환

비밀번호는 평문으로 저장되지 않으며 bcrypt 해시값으로 저장됩니다.

bcrypt 해시 문자열에는 salt 정보가 포함되어 있어 별도의 salt 컬럼 없이도 안전하게 검증할 수 있습니다.

---

## Frontend

React 기반 테스트용 인증 폼

기능:

- sign-in / sign-up 모드 전환
- 입력값 validation 분리
- 서버 에러 메시지 표시
- 로딩 상태 처리
- axios 기반 인증 요청

sign-up에서는 비밀번호 규칙 및 confirm password 검증을 수행하고  
sign-in에서는 입력값 존재 여부만 검증합니다.

---

# 기술 스택

## Backend

- NestJS
- Prisma
- MariaDB
- bcrypt
- class-validator

## Frontend

- React
- TypeScript
- axios

---

# 프로젝트 구조
```
auth-platform
├── api # NestJS 인증 서버
└── web # React 테스트 클라이언트
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

## Phase 2 (부분 완료)

JWT 기반 인증 도입

구현 완료:
- access token 발급
- refresh token 발급
- JWT access / refresh 전략 구성
- access / refresh guard 구현
- 쿠키 기반 인증 처리
- `/auth/me` 보호 API 구현
- `/auth/refresh` 수동 재발급 구현

진행 예정:
- 로그아웃 처리
- 자동 refresh 흐름
- 인증 상태 복구 흐름 정리

---

## Phase 3 (예정)

토큰 관리 전략

- refresh token rotation
- 로그아웃 처리
- 토큰 만료 정책 설계
- 토큰 저장 전략 검토 (DB 또는 Redis)

---

## Phase 4 (예정)

플랫폼 구조 개선

- 인증 서버 독립 배포 구조 정리
- 환경변수 관리
- Docker 구성
- 서비스 간 인증 흐름 예시 추가

---

# 설계 방향

이 프로젝트는 단순 로그인 기능 구현이 아니라 인증 책임을 분리하는 구조 설계를 목표로 합니다.

핵심 방향:

- 인증 로직의 독립성 확보
- 서비스 간 재사용 가능한 인증 구조
- 확장 가능한 토큰 기반 인증 방식
- 단계적 구현을 통한 구조 검증

# 참고

이 프로젝트는 인증 시스템 설계 학습 및 포트폴리오 목적으로 개발되었습니다.
