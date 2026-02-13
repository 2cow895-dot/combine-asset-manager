/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // NextAuth.js와 useSession()을 사용하는 페이지들을 위해 동적 렌더링 활성화
  // 이는 빌드 시 정적 생성을 방지하고 요청 시마다 렌더링하도록 함
  experimental: {
    dynamicIO: true,
  },
};

module.exports = nextConfig;
