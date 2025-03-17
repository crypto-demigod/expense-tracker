import { useState } from 'react';
import { useExpenses, EXPENSE_CATEGORIES } from '../context/ExpenseContext';
import BudgetForm from './BudgetForm';

const BudgetList = () => {
  const { budgets, deleteBudget, getBudgetStatus } = useExpenses();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const budgetStatus = getBudgetStatus();
  
  // Format amount
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  // Get category name from ID
  const getCategoryName = (categoryId) => {
    const category = EXPENSE_CATEGORIES.find(cat => cat.id === categoryId);
    return category ? `${category.icon} ${category.name}` : 'Uncategorized';
  };
  
  // Handle delete budget
  const handleDeleteBudget = async (budgetId) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        setLoading(true);
        setError(null);
        await deleteBudget(budgetId);
      } catch (err) {
        setError('Failed to delete budget');
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Handle edit budget
  const handleEditBudget = (budget) => {
    setEditingBudget(budget);
    setShowAddForm(true);
  };
  
  // Handle form submission
  const handleFormSubmit = () => {
    setShowAddForm(false);
    setEditingBudget(null);
  };
  
  // Handle form cancel
  const handleFormCancel = () => {
    setShowAddForm(false);
    setEditingBudget(null);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Budgets</h2>
        <button
          onClick={() => {
            setEditingBudget(null);
            setShowAddForm(!showAddForm);
          }}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          {showAddForm ? 'Cancel' : 'Add Budget'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">
            {editingBudget ? 'Edit Budget' : 'Add New Budget'}
          </h3>
          <BudgetForm
            budget={editingBudget}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading budgets...</p>
        </div>
      ) : budgetStatus.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="mt-2 text-gray-600">No budgets found</p>
          <p className="text-sm text-gray-500">Create a budget to track your spending</p>
        </div>
      ) : (
        <div className="space-y-4">
          {budgetStatus.map((budget) => (
            <div key={budget.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg">{getCategoryName(budget.category)}</h3>
                  <p className="text-sm text-gray-500">
                    {budget.period ? `${budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} budget` : 'Budget'}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditBudget(budget)}
                    className="text-blue-600 hover:text-blue-900"
                    title="Edit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteBudget(budget.id)}
                    className="text-red-600 hover:text-red-900"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-1">
                <div className="text-lg font-bold">{formatAmount(budget.amount)}</div>
                <div className={`text-sm font-medium ${budget.isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                  {budget.isOverBudget
                    ? `${formatAmount(Math.abs(budget.remaining))} over`
                    : `${formatAmount(budget.remaining)} left`}
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div
                  className={`h-2.5 rounded-full ${
                    budget.isOverBudget ? 'bg-red-600' : budget.percentage > 80 ? 'bg-yellow-500' : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                ></div>
              </div>
              
              <div className="text-sm text-gray-600">
                <span>{formatAmount(budget.spent)} spent</span>
                <span className="mx-2">•</span>
                <span>{budget.percentage.toFixed(1)}% of budget</span>
              </div>
              
              {budget.notes && (
                <div className="mt-2 text-sm text-gray-500 border-t pt-2">
                  {budget.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BudgetList; 