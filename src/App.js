import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ExpenseProvider } from './context/ExpenseContext';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import ExpenseList from './components/ExpenseList';
import ExpenseForm from './components/ExpenseForm';
import BudgetList from './components/BudgetList';
import Reports from './components/Reports';
import AuthForm from './components/AuthForm';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowAddExpense(true);
  };

  const handleDeleteExpense = (expense) => {
    if (window.confirm(`Are you sure you want to delete "${expense.title}"?`)) {
      // The actual deletion is handled in the ExpenseList component
    }
  };

  const handleFormSubmit = () => {
    setShowAddExpense(false);
    setEditingExpense(null);
  };

  const handleFormCancel = () => {
    setShowAddExpense(false);
    setEditingExpense(null);
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render auth form if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <AuthForm />
      </div>
    );
  }

  // Render main application
  return (
    <ExpenseProvider>
      <div className="min-h-screen bg-gray-100">
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {activeTab === 'expenses' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
                <button
                  onClick={() => {
                    setEditingExpense(null);
                    setShowAddExpense(!showAddExpense);
                  }}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  {showAddExpense ? 'Cancel' : 'Add Expense'}
                </button>
              </div>
              
              {showAddExpense && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold mb-4">
                    {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                  </h2>
                  <ExpenseForm
                    expense={editingExpense}
                    onSubmit={handleFormSubmit}
                    onCancel={handleFormCancel}
                  />
                </div>
              )}
              
              <ExpenseList
                onEditExpense={handleEditExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            </div>
          )}
          
          {activeTab === 'dashboard' && <Dashboard />}
          
          {activeTab === 'budgets' && <BudgetList />}
          
          {activeTab === 'reports' && <Reports />}
        </main>
      </div>
    </ExpenseProvider>
  );
}

export default App;
