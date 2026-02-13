'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus, ArrowLeft, Trash2 } from 'lucide-react';

interface Transaction {
  txId: string;
  date: string;
  userId: string;
  accountId: string;
  categoryId: string;
  amount: number;
  description: string;
  timestamp: string;
}

interface Category {
  categoryId: string;
  categoryName: string;
  type: string;
}

export default function TransactionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
    amount: 0,
    description: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      const storedUserId = localStorage.getItem('selectedUserId');
      const storedAccountId = localStorage.getItem('selectedAccountId');
      const storedSpreadsheetId = localStorage.getItem('spreadsheetId');

      if (storedUserId && storedAccountId && storedSpreadsheetId) {
        setUserId(storedUserId);
        setAccountId(storedAccountId);
        setSpreadsheetId(storedSpreadsheetId);
        fetchTransactions(storedSpreadsheetId, storedUserId);
        fetchCategories(storedSpreadsheetId);
      } else {
        router.push('/personal');
      }
    }
  }, [session, router]);

  const fetchTransactions = async (sheetId: string, uid: string) => {
    try {
      const response = await fetch(`/api/ledger?spreadsheetId=${sheetId}&userId=${uid}`);
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (sheetId: string) => {
    try {
      const response = await fetch(`/api/categories?spreadsheetId=${sheetId}`);
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleAddTransaction = async () => {
    if (!formData.categoryId || formData.amount === 0) return;

    try {
      const response = await fetch('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          date: formData.date,
          userId,
          accountId,
          categoryId: formData.categoryId,
          amount: parseFloat(formData.amount.toString()),
          description: formData.description,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setTransactions([...transactions, data.transaction]);
        setFormData({
          date: new Date().toISOString().split('T')[0],
          categoryId: '',
          amount: 0,
          description: '',
        });
        setShowAddTransactionModal(false);
      }
    } catch (error) {
      console.error('Failed to add transaction:', error);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm('이 거래를 삭제하시겠습니까?')) return;

    try {
      // 삭제 API 구현 필요
      console.log('Delete transaction:', txId);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
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

  const totalIncome = transactions
    .filter((tx) => {
      const category = categories.find((c) => c.categoryId === tx.categoryId);
      return category?.type === 'Income';
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpense = transactions
    .filter((tx) => {
      const category = categories.find((c) => c.categoryId === tx.categoryId);
      return category?.type === 'Expense';
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/personal')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">거래 관리</h1>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-green-50 border-l-4 border-green-500 rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">총 수입</h3>
            <p className="text-2xl font-bold text-green-600">
              ₩{totalIncome.toLocaleString('ko-KR')}
            </p>
          </div>
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">총 지출</h3>
            <p className="text-2xl font-bold text-red-600">
              ₩{totalExpense.toLocaleString('ko-KR')}
            </p>
          </div>
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">잉여금</h3>
            <p className="text-2xl font-bold text-blue-600">
              ₩{(totalIncome - totalExpense).toLocaleString('ko-KR')}
            </p>
          </div>
        </div>

        {/* 거래 섹션 */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">거래 내역</h2>
          <button
            onClick={() => setShowAddTransactionModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-200"
          >
            <Plus size={20} /> 거래 추가
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600 mb-4">등록된 거래가 없습니다.</p>
            <button
              onClick={() => setShowAddTransactionModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
            >
              첫 번째 거래 추가
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    날짜
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    카테고리
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    설명
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    금액
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const category = categories.find((c) => c.categoryId === tx.categoryId);
                  const isIncome = category?.type === 'Income';

                  return (
                    <tr key={tx.txId} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{tx.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {category?.categoryName || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {tx.description || '-'}
                      </td>
                      <td
                        className={`px-6 py-4 text-sm font-semibold text-right ${
                          isIncome ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {isIncome ? '+' : '-'}₩{Math.abs(tx.amount).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDeleteTransaction(tx.txId)}
                          className="text-red-600 hover:text-red-900 transition duration-200"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* 거래 추가 모달 */}
      {showAddTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">거래 추가</h2>

            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={formData.categoryId}
              onChange={(e) =>
                setFormData({ ...formData, categoryId: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">카테고리 선택</option>
              {categories.map((cat) => (
                <option key={cat.categoryId} value={cat.categoryId}>
                  {cat.categoryName} ({cat.type})
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="금액"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="text"
              placeholder="설명 (선택사항)"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex gap-4">
              <button
                onClick={() => setShowAddTransactionModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-2 px-4 rounded-lg transition duration-200"
              >
                취소
              </button>
              <button
                onClick={handleAddTransaction}
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
