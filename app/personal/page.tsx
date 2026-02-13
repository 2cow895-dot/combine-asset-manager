'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus, ArrowLeft } from 'lucide-react';

interface Account {
  accountId: string;
  userId: string;
  bankName: string;
  accountAlias: string;
  balance: number;
}

export default function PersonalDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [formData, setFormData] = useState({
    bankName: '',
    accountAlias: '',
    balance: 0,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      const storedUserId = localStorage.getItem('selectedUserId');
      const storedSpreadsheetId = localStorage.getItem('spreadsheetId');

      if (storedUserId && storedSpreadsheetId) {
        setUserId(storedUserId);
        setSpreadsheetId(storedSpreadsheetId);
        fetchAccounts(storedSpreadsheetId, storedUserId);
      } else {
        router.push('/dashboard');
      }
    }
  }, [session, router]);

  const fetchAccounts = async (sheetId: string, uid: string) => {
    try {
      const response = await fetch(
        `/api/accounts?spreadsheetId=${sheetId}&userId=${uid}`
      );
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    if (!formData.bankName || !formData.accountAlias) return;

    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          userId,
          bankName: formData.bankName,
          accountAlias: formData.accountAlias,
          balance: parseFloat(formData.balance.toString()),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAccounts([...accounts, data.account]);
        setFormData({ bankName: '', accountAlias: '', balance: 0 });
        setShowAddAccountModal(false);
      }
    } catch (error) {
      console.error('Failed to add account:', error);
    }
  };

  const handleSelectAccount = (accountId: string) => {
    localStorage.setItem('selectedAccountId', accountId);
    router.push('/personal/transactions');
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

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">개인 대시보드</h1>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* 총 잔액 카드 */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-lg font-semibold mb-2">총 잔액</h2>
          <p className="text-4xl font-bold">
            ₩{totalBalance.toLocaleString('ko-KR')}
          </p>
        </div>

        {/* 계좌 섹션 */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">내 계좌</h2>
          <button
            onClick={() => setShowAddAccountModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-200"
          >
            <Plus size={20} /> 계좌 추가
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600 mb-4">등록된 계좌가 없습니다.</p>
            <button
              onClick={() => setShowAddAccountModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
            >
              첫 번째 계좌 추가
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <div
                key={account.accountId}
                onClick={() => handleSelectAccount(account.accountId)}
                className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg border-2 border-transparent hover:border-blue-500 transition duration-200"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {account.accountAlias}
                </h3>
                <p className="text-sm text-gray-600 mb-4">{account.bankName}</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₩{account.balance.toLocaleString('ko-KR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 계좌 추가 모달 */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">계좌 추가</h2>

            <input
              type="text"
              placeholder="은행명 (예: 국민은행)"
              value={formData.bankName}
              onChange={(e) =>
                setFormData({ ...formData, bankName: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="text"
              placeholder="계좌 별칭 (예: 급여 계좌)"
              value={formData.accountAlias}
              onChange={(e) =>
                setFormData({ ...formData, accountAlias: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="number"
              placeholder="초기 잔액"
              value={formData.balance}
              onChange={(e) =>
                setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex gap-4">
              <button
                onClick={() => setShowAddAccountModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-2 px-4 rounded-lg transition duration-200"
              >
                취소
              </button>
              <button
                onClick={handleAddAccount}
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
