import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';

// Predefined expense categories
export const EXPENSE_CATEGORIES = [
  { id: 'food', name: 'Food & Dining', icon: '🍔' },
  { id: 'transportation', name: 'Transportation', icon: '🚗' },
  { id: 'housing', name: 'Housing', icon: '🏠' },
  { id: 'utilities', name: 'Utilities', icon: '💡' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️' },
  { id: 'travel', name: 'Travel', icon: '✈️' },
  { id: 'education', name: 'Education', icon: '📚' },
  { id: 'personal', name: 'Personal', icon: '👤' },
  { id: 'other', name: 'Other', icon: '📦' },
];

const ExpenseContext = createContext();

export const useExpenses = () => useContext(ExpenseContext);

export const ExpenseProvider = ({ children }) => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState(EXPENSE_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    category: null,
    minAmount: null,
    maxAmount: null,
    searchTerm: '',
  });
  const [budgets, setBudgets] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchExpenses();
        fetchBudgets();
      } else {
        setExpenses([]);
        setBudgets([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch all expenses for the current user
  const fetchExpenses = async () => {
    if (!auth.currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      let expensesQuery = collection(db, `users/${auth.currentUser.uid}/expenses`);
      
      // Apply filters if they exist
      if (filters.startDate && filters.endDate) {
        expensesQuery = query(
          expensesQuery, 
          where('date', '>=', filters.startDate),
          where('date', '<=', filters.endDate)
        );
      }
      
      if (filters.category) {
        expensesQuery = query(expensesQuery, where('category', '==', filters.category));
      }
      
      // Order by date descending (newest first)
      expensesQuery = query(expensesQuery, orderBy('date', 'desc'));
      
      const querySnapshot = await getDocs(expensesQuery);
      const expenseList = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        expenseList.push({ 
          id: doc.id, 
          ...data,
          date: data.date?.toDate() || new Date(),
        });
      });
      
      // Apply client-side filters
      let filteredExpenses = expenseList;
      
      if (filters.minAmount !== null) {
        filteredExpenses = filteredExpenses.filter(exp => exp.amount >= filters.minAmount);
      }
      
      if (filters.maxAmount !== null) {
        filteredExpenses = filteredExpenses.filter(exp => exp.amount <= filters.maxAmount);
      }
      
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filteredExpenses = filteredExpenses.filter(exp => 
          exp.title.toLowerCase().includes(term) || 
          exp.notes?.toLowerCase().includes(term)
        );
      }
      
      setExpenses(filteredExpenses);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  // Add a new expense
  const addExpense = async (expenseData) => {
    if (!auth.currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Add the expense document
      const docRef = await addDoc(
        collection(db, `users/${auth.currentUser.uid}/expenses`), 
        {
          ...expenseData,
          amount: parseFloat(expenseData.amount),
          date: new Date(expenseData.date || Date.now()),
          createdAt: new Date(),
        }
      );
      
      // Refresh the expenses list
      fetchExpenses();
      return docRef.id;
    } catch (err) {
      console.error('Error adding expense:', err);
      setError('Failed to add expense');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing expense
  const updateExpense = async (expenseId, expenseData) => {
    if (!auth.currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Update the expense document
      await updateDoc(
        doc(db, `users/${auth.currentUser.uid}/expenses/${expenseId}`), 
        {
          ...expenseData,
          amount: parseFloat(expenseData.amount),
          date: new Date(expenseData.date || Date.now()),
          updatedAt: new Date(),
        }
      );
      
      // Refresh the expenses list
      fetchExpenses();
    } catch (err) {
      console.error('Error updating expense:', err);
      setError('Failed to update expense');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete an expense
  const deleteExpense = async (expenseId) => {
    if (!auth.currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await deleteDoc(doc(db, `users/${auth.currentUser.uid}/expenses/${expenseId}`));
      
      // Refresh the expenses list
      fetchExpenses();
    } catch (err) {
      console.error('Error deleting expense:', err);
      setError('Failed to delete expense');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update filters and refresh expenses
  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    fetchExpenses();
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      startDate: null,
      endDate: null,
      category: null,
      minAmount: null,
      maxAmount: null,
      searchTerm: '',
    });
    fetchExpenses();
  };

  // Fetch budgets
  const fetchBudgets = async () => {
    if (!auth.currentUser) return;
    
    try {
      const querySnapshot = await getDocs(collection(db, `users/${auth.currentUser.uid}/budgets`));
      const budgetList = [];
      
      querySnapshot.forEach((doc) => {
        budgetList.push({ id: doc.id, ...doc.data() });
      });
      
      setBudgets(budgetList);
    } catch (err) {
      console.error('Error fetching budgets:', err);
    }
  };

  // Add a new budget
  const addBudget = async (budgetData) => {
    if (!auth.currentUser) return;
    
    try {
      await addDoc(
        collection(db, `users/${auth.currentUser.uid}/budgets`), 
        {
          ...budgetData,
          amount: parseFloat(budgetData.amount),
          createdAt: new Date(),
        }
      );
      
      fetchBudgets();
    } catch (err) {
      console.error('Error adding budget:', err);
      throw err;
    }
  };

  // Update a budget
  const updateBudget = async (budgetId, budgetData) => {
    if (!auth.currentUser) return;
    
    try {
      await updateDoc(
        doc(db, `users/${auth.currentUser.uid}/budgets/${budgetId}`), 
        {
          ...budgetData,
          amount: parseFloat(budgetData.amount),
          updatedAt: new Date(),
        }
      );
      
      fetchBudgets();
    } catch (err) {
      console.error('Error updating budget:', err);
      throw err;
    }
  };

  // Delete a budget
  const deleteBudget = async (budgetId) => {
    if (!auth.currentUser) return;
    
    try {
      await deleteDoc(doc(db, `users/${auth.currentUser.uid}/budgets/${budgetId}`));
      fetchBudgets();
    } catch (err) {
      console.error('Error deleting budget:', err);
      throw err;
    }
  };

  // Get expense statistics
  const getExpenseStats = () => {
    if (!expenses.length) return { total: 0, byCategory: {} };
    
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    const byCategory = expenses.reduce((acc, expense) => {
      const category = expense.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += expense.amount;
      return acc;
    }, {});
    
    return { total, byCategory };
  };

  // Get budget status
  const getBudgetStatus = () => {
    const stats = getExpenseStats();
    
    return budgets.map(budget => {
      const spent = stats.byCategory[budget.category] || 0;
      const remaining = budget.amount - spent;
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      
      return {
        ...budget,
        spent,
        remaining,
        percentage,
        isOverBudget: remaining < 0,
      };
    });
  };

  const value = {
    expenses,
    loading,
    error,
    categories,
    filters,
    budgets,
    addExpense,
    updateExpense,
    deleteExpense,
    updateFilters,
    resetFilters,
    addBudget,
    updateBudget,
    deleteBudget,
    getExpenseStats,
    getBudgetStatus,
  };

  return (
    <ExpenseContext.Provider value={value}>
      {children}
    </ExpenseContext.Provider>
  );
};

export default ExpenseContext; 