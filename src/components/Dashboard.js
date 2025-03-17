import { useState } from 'react';
import { useExpenses, EXPENSE_CATEGORIES } from '../context/ExpenseContext';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Dashboard = () => {
  const { expenses, budgets, getExpenseStats, getBudgetStatus } = useExpenses();
  const [timeRange, setTimeRange] = useState('month'); // 'week', 'month', 'year'
  
  // Get expense statistics
  const stats = getExpenseStats();
  const budgetStatus = getBudgetStatus();
  
  // Filter expenses by time range
  const getFilteredExpenses = () => {
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
    }
    
    return expenses.filter(expense => new Date(expense.date) >= startDate);
  };
  
  // Calculate statistics for filtered expenses
  const getFilteredStats = () => {
    const filteredExpenses = getFilteredExpenses();
    
    if (!filteredExpenses.length) return { total: 0, byCategory: {} };
    
    const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    const byCategory = filteredExpenses.reduce((acc, expense) => {
      const category = expense.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += expense.amount;
      return acc;
    }, {});
    
    return { total, byCategory };
  };
  
  const filteredStats = getFilteredStats();
  
  // Format amount
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  // Prepare data for pie chart
  const pieChartData = {
    labels: Object.keys(filteredStats.byCategory).map(catId => {
      const category = EXPENSE_CATEGORIES.find(c => c.id === catId);
      return category ? `${category.icon} ${category.name}` : 'Uncategorized';
    }),
    datasets: [
      {
        data: Object.values(filteredStats.byCategory),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
          '#FF9F40', '#8AC926', '#1982C4', '#6A4C93', '#F94144',
          '#F3722C', '#F8961E', '#F9C74F', '#90BE6D', '#43AA8B',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Prepare data for bar chart (top 5 expenses by category)
  const barChartData = {
    labels: Object.entries(filteredStats.byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([catId]) => {
        const category = EXPENSE_CATEGORIES.find(c => c.id === catId);
        return category ? `${category.icon} ${category.name}` : 'Uncategorized';
      }),
    datasets: [
      {
        label: 'Spending by Category',
        data: Object.entries(filteredStats.byCategory)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([, amount]) => amount),
        backgroundColor: '#36A2EB',
      },
    ],
  };
  
  // Chart options
  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const percentage = ((value / filteredStats.total) * 100).toFixed(1);
            return `${label}: ${formatAmount(value)} (${percentage}%)`;
          },
        },
      },
    },
  };
  
  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw || 0;
            return `${formatAmount(value)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatAmount(value),
        },
      },
    },
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Dashboard</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              timeRange === 'week'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              timeRange === 'month'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              timeRange === 'year'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Year
          </button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
          <p className="text-2xl font-bold text-gray-800">{formatAmount(filteredStats.total)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {timeRange === 'week' ? 'Last 7 days' : timeRange === 'month' ? 'Last 30 days' : 'Last 12 months'}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Average Per Day</h3>
          <p className="text-2xl font-bold text-gray-800">
            {formatAmount(
              filteredStats.total / (timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365)
            )}
          </p>
          <p className="text-xs text-gray-500 mt-1">Daily average</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Number of Expenses</h3>
          <p className="text-2xl font-bold text-gray-800">{getFilteredExpenses().length}</p>
          <p className="text-xs text-gray-500 mt-1">Total transactions</p>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Spending by Category</h3>
          {Object.keys(filteredStats.byCategory).length > 0 ? (
            <div className="h-64">
              <Pie data={pieChartData} options={pieChartOptions} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500">No data available</p>
            </div>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Top Categories</h3>
          {Object.keys(filteredStats.byCategory).length > 0 ? (
            <div className="h-64">
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500">No data available</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Budget Status */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Budget Status</h3>
        {budgetStatus.length > 0 ? (
          <div className="space-y-4">
            {budgetStatus.map((budget) => (
              <div key={budget.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                <div className="flex justify-between items-center mb-1">
                  <div>
                    <span className="font-medium">
                      {(() => {
                        const category = EXPENSE_CATEGORIES.find(c => c.id === budget.category);
                        return category ? `${category.icon} ${category.name}` : 'Uncategorized';
                      })()}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      {formatAmount(budget.spent)} of {formatAmount(budget.amount)}
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${budget.isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                    {budget.isOverBudget
                      ? `${formatAmount(Math.abs(budget.remaining))} over`
                      : `${formatAmount(budget.remaining)} left`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      budget.isOverBudget ? 'bg-red-600' : budget.percentage > 80 ? 'bg-yellow-500' : 'bg-green-600'
                    }`}
                    style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No budgets set</p>
            <p className="text-sm text-gray-400">Set budgets to track your spending</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 