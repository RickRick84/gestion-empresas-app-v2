import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function Login() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoadingForm(true);

    if (isRegistering && password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setLoadingForm(false);
      return;
    }

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        toast.success('Registro exitoso. Redirigiendo...');
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        toast.success('Bienvenido de nuevo');
      }
    } catch (err) {
      console.error(err);
      setError('Email o contraseña incorrectos.');
    } finally {
      setLoadingForm(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (loading) {
    return <p className="text-white text-center mt-10">Cargando sesión...</p>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black bg-opacity-90 px-4">
      <ToastContainer />
      {user ? (
        <div className="text-center bg-white bg-opacity-10 p-6 rounded-lg shadow-lg text-white">
          <p className="text-green-400 text-lg mb-4">
            Bienvenido, {user.email}
          </p>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
          >
            Salir
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleFormSubmit}
          className="bg-white bg-opacity-5 backdrop-blur-lg p-6 rounded-xl shadow-lg w-full max-w-sm text-white"
        >
          <h2 className="text-xl font-semibold mb-4">
            {isRegistering ? 'Registrarse' : 'Iniciar sesión'}
          </h2>

          {error && <p className="text-red-400 mb-3">{error}</p>}

          <input
            type="email"
            placeholder="Correo electrónico"
            className="w-full p-3 rounded mb-3 bg-gray-900 text-white placeholder-gray-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Contraseña"
            className="w-full p-3 rounded mb-3 bg-gray-900 text-white placeholder-gray-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {isRegistering && (
            <small className="text-gray-400 mb-2 block">
              Mínimo 6 caracteres. Se recomienda usar mayúsculas y números.
            </small>
          )}

          <button
            type="submit"
            disabled={loadingForm}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
          >
            {loadingForm
              ? isRegistering
                ? 'Registrando...'
                : 'Ingresando...'
              : isRegistering
              ? 'Registrarse'
              : 'Entrar'}
          </button>

          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm text-green-300 hover:underline mt-4 w-full"
          >
            {isRegistering
              ? '¿Ya tenés cuenta? Iniciá sesión'
              : '¿No tenés cuenta? Registrate'}
          </button>
        </form>
      )}
    </div>
  );
}

export default Login;
