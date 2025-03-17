import { useState, useEffect } from 'react';
import { useExpenses, EXPENSE_CATEGORIES } from '../context/ExpenseContext';

const BudgetForm = ({ budget = null, onSubmit, onCancel }) => {
  const { addBudget, updateBudget } = useExpenses();
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    period: 'monthly',
    notes: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // If editing an existing budget, populate the form
  useEffect(() => {
    if (budget) {
      setFormData({
        category: budget.category || '',
        amount: budget.amount?.toString() || '',
        period: budget.period || 'monthly',
        notes: budget.notes || '',
      });
    }
  }, [budget]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError(null);
      setLoading(true);
      
      // Validate form
      if (!formData.category) {
        setError('Please select a category');
        return;
      }
      
      if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
        setError('Please enter a valid amount');
        return;
      }
      
      // Submit the form
      if (budget) {
        // Update existing budget
        await updateBudget(budget.id, formData);
      } else {
        // Add new budget
        await addBudget(formData);
      }
      
      // Call the onSubmit callback
      if (onSubmit) {
        onSubmit();
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
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
          Budget Amount *
        </label>
        <input
          type="number"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Budget Amount"
          step="0.01"
          min="0"
          required
        />
      </div>
      
      <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Period
        </label>
        <select
          name="period"
          value={formData.period}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      
      <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Add notes about this budget"
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
          {loading ? 'Saving...' : budget ? 'Update Budget' : 'Add Budget'}
        </button>
      </div>
    </form>
  );
};

export default BudgetForm; 