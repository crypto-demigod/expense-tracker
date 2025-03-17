import { useState, useEffect } from 'react';
import { useExpenses, EXPENSE_CATEGORIES } from '../context/ExpenseContext';

const ExpenseForm = ({ expense = null, onSubmit, onCancel }) => {
  const { addExpense, updateExpense, loading } = useExpenses();
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    isRecurring: false,
    recurringFrequency: 'monthly',
    notes: '',
  });
  const [error, setError] = useState(null);

  // If editing an existing expense, populate the form
  useEffect(() => {
    if (expense) {
      setFormData({
        title: expense.title || '',
        amount: expense.amount?.toString() || '',
        category: expense.category || '',
        date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        isRecurring: expense.isRecurring || false,
        recurringFrequency: expense.recurringFrequency || 'monthly',
        notes: expense.notes || '',
      });
    }
  }, [expense]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
    
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError(null);
      
      // Validate form
      if (!formData.title.trim()) {
        setError('Title is required');
        return;
      }
      
      if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
        setError('Please enter a valid amount');
        return;
      }
      
      if (!formData.category) {
        setError('Please select a category');
        return;
      }
      
      // Submit the form
      if (expense) {
        // Update existing expense
        await updateExpense(expense.id, formData);
      } else {
        // Add new expense
        await addExpense(formData);
      }
      
      // Call the onSubmit callback
      if (onSubmit) {
        onSubmit();
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Title *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Expense Title"
          required
        />
      </div>
      
      <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Amount *
        </label>
        <input
          type="number"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Amount"
          step="0.01"
          min="0"
          required
        />
      </div>
      
      <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Category *
        </label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        >
          <option value="">Select a category</option>
          {EXPENSE_CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Date *
        </label>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        />
      </div>
      
      <div className="flex items-center mb-4">
        <input
          type="checkbox"
          name="isRecurring"
          checked={formData.isRecurring}
          onChange={handleChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label className="ml-2 block text-gray-700 text-sm font-bold">
          Recurring Expense
        </label>
      </div>
      
      {formData.isRecurring && (
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Frequency
          </label>
          <select
            name="recurringFrequency"
            value={formData.recurringFrequency}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      )}
      
      <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Add notes about this expense"
          rows="3"
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Saving...' : expense ? 'Update Expense' : 'Add Expense'}
        </button>
      </div>
    </form>
  );
};

export default ExpenseForm; 