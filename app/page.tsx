'use client';

import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user) {
      router.push('/dashboard');
    }
  }, [session, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">로딩 중...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Combine Asset Manager
        </h1>
        <p className="text-gray-600 mb-8">
          Google Sheets 기반 다중 사용자 자산 통합 및 잉여금 배분 시스템
        </p>
        
        <button
          onClick={() => signIn('google')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
        >
          Google로 로그인
        </button>

        <p className="text-sm text-gray-500 mt-6">
          Google Sheets API를 통해 안전하게 데이터를 관리합니다.
        </p>
      </div>
    </div>
  );
}
