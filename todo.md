# Combine Asset Manager - TODO

## Phase 1: 프로젝트 초기화 및 Google Sheets API 통합 설정
- [x] Next.js 프로젝트 생성
- [x] 필수 패키지 설치 (next-auth, googleapis, tailwindcss 등)
- [x] TypeScript 설정
- [x] Tailwind CSS 설정
- [x] Google Sheets API 유틸리티 작성
- [x] NextAuth.js 설정
- [x] 홈 페이지 및 로그인 페이지 작성

## Phase 2: Google Sheets 자동 스키마 생성 로직 구현
- [x] Meta_Users 탭 자동 생성 및 초기화
- [x] Meta_Accounts 탭 자동 생성 및 초기화
- [x] Meta_Categories 탭 자동 생성 및 초기화
- [x] Config_Allocation 탭 자동 생성 및 초기화
- [x] Ledger 탭 자동 생성 및 초기화
- [x] 자동 생성 로직 테스트

## Phase 3: 사용자 관리 및 개인 대시보드 구현
- [x] 사용자 선택 페이지 (User Selector)
- [x] 사용자 추가 기능 (Add User Modal)
- [x] 개인 대시보드 페이지
- [x] 계좌 목록 조회 및 표시
- [x] 계좌 추가 기능 (Add Account Modal)
- [ ] 계좌 편집/삭제 기능

## Phase 4: 거래 입력 및 Ledger 관리 기능
- [ ] 거래 입력 폼 (Transaction Form)
- [ ] 거래 생성 API
- [ ] 거래 목록 조회 및 표시
- [ ] 거래 편집 기능
- [ ] 거래 삭제 기능
- [ ] 카테고리 추가 기능

## Phase 5: 통합 대시보드 및 잉여금 배분 시뮬레이션
- [x] 통합 대시보드 페이지
- [x] 월별 총 잉여금 계산 (Income - Expense)
- [x] 잉여금 배분 비율 설정 (Slider/Input)
- [x] 배분 결과 카드 표시
- [x] Config_Allocation 탭 업데이트 (Debounce 적용)

## Phase 6: 데이터 시각화 및 CSV 내보내기
- [x] Pie Chart (개인별 지출 비중)
- [x] Bar Chart (카테고리별 지출 분포)
- [x] CSV 내보내기 기능
- [x] 필터링 기능 (날짜, 사용자, 카테고리)

## Phase 7: 최종 테스트 및 배포
- [ ] 전체 기능 테스트
- [ ] 성능 최적화
- [ ] Vercel 배포 설정
- [ ] 환경 변수 설정
- [ ] 최종 검증
