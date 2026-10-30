import { useEffect, useRef, useState, useContext } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import { homeFor } from '../utils/roles';

const VerifyEmail = () => {
  const [params] = useSearchParams();
  const { user } = useContext(AuthContext);
  const [state, setState] = useState({ status: 'working', message: 'Verifying your email...' });
  const started = useRef(false);

  useEffect(() => {
    // The token is single-use, so guard against React StrictMode's double effect.
    if (started.current) return;
    started.current = true;
    const token = params.get('token');
    if (!token) {
      setState({ status: 'error', message: 'This link is missing its token.' });
      return;
    }
    api.post('/auth/verify-email', { token })
      .then(res => setState({ status: 'done', message: res.data.message }))
      .catch(err => setState({ status: 'error', message: err.response?.data?.message || 'Verification failed' }));
  }, [params]);

  return (
    <AuthShell title="Email verification">
      <p className={`text-sm ${state.status === 'error' ? 'text-red-700' : 'text-gray-700'}`}>{state.message}</p>
      {state.status !== 'working' && (
        <Link to={user ? homeFor(user.role) : '/'} className="mt-6 w-full btn-primary">
          {user ? 'Go to dashboard' : 'Sign in'}
        </Link>
      )}
    </AuthShell>
  );
};

export default VerifyEmail;
