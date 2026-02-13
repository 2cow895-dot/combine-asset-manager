'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

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

interface User {
  userId: string;
  userName: string;
  role: string;
  email: string;
}

interface Allocation {
  allocType: string;
  targetPercent: number;
  description: string;
}

export default function CombinedDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));

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
        fetchAllData(storedSpreadsheetId);
      } else {
        setLoading(false);
      }
    }
  }, [session]);

  const fetchAllData = async (sheetId: string) => {
    try {
      const [transRes, catRes, userRes, allocRes] = await Promise.all([
        fetch(`/api/ledger?spreadsheetId=${sheetId}&month=${currentMonth}`),
        fetch(`/api/categories?spreadsheetId=${sheetId}`),
        fetch(`/api/users?spreadsheetId=${sheetId}`),
        fetch(`/api/allocation?spreadsheetId=${sheetId}`),
      ]);

      const [transData, catData, userData, allocData] = await Promise.all([
        transRes.json(),
        catRes.json(),
        userRes.json(),
        allocRes.json(),
      ]);

      setTransactions(transData.transactions || []);
      setCategories(catData.categories || []);
      setUsers(userData.users || []);
      setAllocations(allocData.allocations || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSurplus = useCallback(() => {
    const income = transactions
      .filter((tx) => {
        const category = categories.find((c) => c.categoryId === tx.categoryId);
        return category?.type === 'Income';
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    const expense = transactions
      .filter((tx) => {
        const category = categories.find((c) => c.categoryId === tx.categoryId);
        return category?.type === 'Expense';
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    return income - expense;
  }, [transactions, categories]);

  const handleAllocationChange = async (index: number, newPercent: number) => {
    const updatedAllocations = [...allocations];
    updatedAllocations[index].targetPercent = newPercent;

    // 합계가 100을 초과하지 않도록 조정
    const total = updatedAllocations.reduce((sum, a) => sum + a.targetPercent, 0);
    if (total > 100) {
      updatedAllocations[index].targetPercent = newPercent - (total - 100);
    }

    setAllocations(updatedAllocations);

    // 서버에 저장
    try {
      await fetch('/api/allocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          allocations: updatedAllocations,
        }),
      });
    } catch (error) {
      console.error('Failed to update allocation:', error);
    }
  };

  const getCategoryExpenseData = () => {
    const expenseByCategory: Record<string, number> = {};

    transactions.forEach((tx) => {
      const category = categories.find((c) => c.categoryId === tx.categoryId);
      if (category?.type === 'Expense') {
        expenseByCategory[category.categoryName] =
          (expenseByCategory[category.categoryName] || 0) + tx.amount;
      }
    });

    return Object.entries(expenseByCategory).map(([name, value]) => ({
      name,
      value,
    }));
  };

  const getUserComparisonData = () => {
    const userStats: Record<string, { income: number; expense: number }> = {};

    users.forEach((user) => {
      userStats[user.userName] = { income: 0, expense: 0 };
    });

    transactions.forEach((tx) => {
      const user = users.find((u) => u.userId === tx.userId);
      const category = categories.find((c) => c.categoryId === tx.categoryId);

      if (user && category) {
        if (category.type === 'Income') {
          userStats[user.userName].income += tx.amount;
        } else if (category.type === 'Expense') {
          userStats[user.userName].expense += tx.amount;
        }
      }
    });

    return Object.entries(userStats).map(([name, stats]) => ({
      name,
      수입: stats.income,
      지출: stats.expense,
    }));
  };

  const handleExportCSV = () => {
    const headers = ['거래ID', '날짜', '사용자', '계좌', '카테고리', '금액', '설명', '타임스탬프'];
    const rows = transactions.map((tx) => {
      const user = users.find((u) => u.userId === tx.userId);
      const category = categories.find((c) => c.categoryId === tx.categoryId);
      return [
        tx.txId,
        tx.date,
        user?.userName || '',
        tx.accountId,
        category?.categoryName || '',
        tx.amount,
        tx.description,
        tx.timestamp,
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `ledger_${currentMonth}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const surplus = calculateSurplus();
  const categoryExpenseData = getCategoryExpenseData();
  const userComparisonData = getUserComparisonData();
  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

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
            <h1 className="text-3xl font-bold text-gray-900">통합 대시보드</h1>
          </div>
          <button
            onClick={handleExportCSV}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-200"
          >
            <Download size={20} /> CSV 내보내기
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* 월 선택 */}
        <div className="mb-8">
          <input
            type="month"
            value={currentMonth}
            onChange={(e) => {
              setCurrentMonth(e.target.value);
              setLoading(true);
              fetchAllData(spreadsheetId);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 총 잉여금 카드 */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-lg font-semibold mb-2">이번 달 총 잉여금</h2>
          <p className="text-5xl font-bold">
            ₩{surplus.toLocaleString('ko-KR')}
          </p>
        </div>

        {/* 배분 설정 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">잉여금 배분 설정</h2>

          <div className="space-y-6">
            {allocations.map((alloc, index) => (
              <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {alloc.allocType}
                    </h3>
                    <p className="text-sm text-gray-600">{alloc.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {alloc.targetPercent}%
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      ₩{((surplus * alloc.targetPercent) / 100).toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={alloc.targetPercent}
                  onChange={(e) =>
                    handleAllocationChange(index, parseFloat(e.target.value))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600">
              합계: {allocations.reduce((sum, a) => sum + a.targetPercent, 0)}%
            </p>
          </div>
        </div>

        {/* 시각화 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 파이 차트 */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              카테고리별 지출 분포
            </h2>
            {categoryExpenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryExpenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) =>
                      `${name}: ₩${value.toLocaleString('ko-KR')}`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryExpenseData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      `₩${(value as number).toLocaleString('ko-KR')}`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-600">데이터가 없습니다.</p>
            )}
          </div>

          {/* 바 차트 */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              사용자별 수입/지출 비교
            </h2>
            {userComparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) =>
                      `₩${(value as number).toLocaleString('ko-KR')}`
                    }
                  />
                  <Legend />
                  <Bar dataKey="수입" fill="#10b981" />
                  <Bar dataKey="지출" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-600">데이터가 없습니다.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
