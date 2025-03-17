import { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const AuthForm = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      if (isSignUp) {
        // Validate passwords match
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        
        // Validate password strength
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }
        
        // Create new user
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        // Sign in existing user
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error('Authentication error:', err);
      
      // Handle specific Firebase auth errors
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('Email is already in use. Please sign in instead.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address.');
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('Invalid email or password.');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed login attempts. Please try again later.');
          break;
        default:
          setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-blue-600">ExpenseTracker</h1>
        <p className="text-gray-600 mt-2">Track your expenses with ease</p>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-bold text-center mb-6">
          {isSignUp ? 'Create an Account' : 'Sign In'}
        </h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Email"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Password"
              required
            />
          </div>
          
          {isSignUp && (
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Confirm Password"
                required
              />
            </div>
          )}
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading
                ? 'Processing...'
                : isSignUp
                ? 'Sign Up'
                : 'Sign In'}
            </button>
          </div>
        </form>
        
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-500 hover:text-blue-700 text-sm"
          >
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
      
      <div className="mt-6 text-center text-gray-500 text-xs">
        &copy; 2023 ExpenseTracker. All rights reserved.
      </div>
    </div>
  );
};

export default AuthForm; 