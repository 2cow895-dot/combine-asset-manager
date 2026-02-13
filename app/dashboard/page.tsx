'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

interface User {
  userId: string;
  userName: string;
  role: string;
  email: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      const storedSpreadsheetId = localStorage.getItem('spreadsheetId');
      if (storedSpreadsheetId) {
        setSpreadsheetId(storedSpreadsheetId);
        fetchUsers(storedSpreadsheetId);
      } else {
        setLoading(false);
      }
    }
  }, [session]);

  const fetchUsers = async (sheetId: string) => {
    try {
      const response = await fetch(`/api/users?spreadsheetId=${sheetId}`);
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUserName || !spreadsheetId) return;

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          userName: newUserName,
          role: 'User',
          email: '',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setUsers([...users, data.user]);
        setNewUserName('');
        setShowAddUserModal(false);
      }
    } catch (error) {
      console.error('Failed to add user:', error);
    }
  };

  const handleSelectUser = (userId: string) => {
    localStorage.setItem('selectedUserId', userId);
    router.push('/personal');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">로딩 중...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Combine Asset Manager
          </h1>
          <button
            onClick={() => signOut()}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* 통합 대시보드 버튼 */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/combined')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
          >
            📊 통합 대시보드 보기
          </button>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">사용자 선택</h2>
          <button
            onClick={() => setShowAddUserModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-200"
          >
            <Plus size={20} /> 사용자 추가
          </button>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">등록된 사용자가 없습니다.</p>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
            >
              첫 번째 사용자 추가
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <div
                key={user.userId}
                onClick={() => handleSelectUser(user.userId)}
                className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg hover:border-blue-500 border-2 border-transparent transition duration-200"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {user.userName}
                </h3>
                <p className="text-sm text-gray-600 mb-1">역할: {user.role}</p>
                {user.email && (
                  <p className="text-sm text-gray-600">이메일: {user.email}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 사용자 추가 모달 */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">사용자 추가</h2>
            
            <input
              type="text"
              placeholder="사용자 이름"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex gap-4">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-2 px-4 rounded-lg transition duration-200"
              >
                취소
              </button>
              <button
                onClick={handleAddUser}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
