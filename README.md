# Auth Platform

다수 서비스에서 공통으로 사용할 수 있는 **인증 플랫폼(Auth Server)** 을 설계하고 구현한 프로젝트입니다.

단일 서비스에 종속된 인증 구조에서 벗어나  
서비스 간 인증을 공유할 수 있는 구조를 목표로 설계했습니다.

특히 **JWT 기반 인증 + Refresh 전략 + 서비스 분리 구조** 를 중심으로  
실무에서 재사용 가능한 인증 플랫폼 형태를 지향합니다.

---

## 프로젝트 목표

기존 구조:

서비스마다 개별 인증 로직 존재  
→ 로그인 로직 중복  
→ 인증 정책 변경 시 전체 수정 필요  
→ 서비스 확장 시 인증 구조 재설계 필요

개선 목표:

인증/유저 관리 기능을 별도 플랫폼으로 분리  
다수 서비스에서 공통으로 사용할 수 있는 인증 구조 설계  
JWT 기반 인증을 통한 stateless 구조 구성  
신규 서비스 추가 시 인증 로직 재사용 가능하도록 설계  

---

## 주요 기능

### 인증

회원가입 / 로그인
JWT 기반 인증
Access Token / Refresh Token 전략
로그아웃 처리
토큰 재발급(silent refresh)

### 유저 관리

유저 정보 관리
서비스 공통 사용자 관리 구조

### 서비스 확장 고려

초기 단계에서는 username 기반 인증으로 단순화했으며, email 기반 인증 및 소셜 로그인 확장을 고려하여 구조를 설계했습니다.
서비스 간 인증 공유(SSO 형태)
신규 서비스 추가 시 인증 구조 재사용 가능
서비스와 인증 로직 분리

---

## 기술 스택

Backend

Node.js
TypeScript
NestJS
Prisma
MariaDB

Infra

Docker
NGINX
GitHub Actions

---

## 아키텍처

서비스 구조를 단일 서비스에서 분리하여 구성했습니다.

Auth Platform

인증 처리
JWT 발급 및 검증
유저 관리

Service API

비즈니스 로직 처리
Auth Platform 토큰 검증

Database

유저 정보 저장
Refresh Token 관리

---

## 인증 전략

### JWT 사용 이유

서버 상태 저장 없이 인증 가능(stateless)
서비스 간 인증 공유 용이
확장성 있는 구조 구성 가능

### Access Token

짧은 만료 시간
API 요청 인증에 사용

### Refresh Token

Access Token 재발급 용도
DB에 저장하여 관리
토큰 탈취 대응 고려

### 인증 흐름

로그인 시 Access Token + Refresh Token 발급
Access Token 만료 시 Refresh Token으로 재발급
로그아웃 시 Refresh Token 제거

---

## 주요 설계 포인트

인증 로직과 서비스 로직 분리
서비스 간 인증 공유 구조 고려
확장 가능한 인증 플랫폼 구조 설계
중복 로그인 로직 제거
유지보수 용이성 개선

---

## 실행 방법

```bash
# install
npm install

# run
npm run start:dev