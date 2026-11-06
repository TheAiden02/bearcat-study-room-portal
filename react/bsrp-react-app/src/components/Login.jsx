import { useState } from 'react';
import { ADMIN_CREDENTIALS, STUDENT_PASSWORD, students } from '../data/DummyData';

// Sign-in page with hard-coded credentials
function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Validate credentials against dummy data
  const handleSubmit = (event) => {
    event.preventDefault();
    const enteredName = username.trim().toLowerCase();

    // Bearcat/Admin signs in as the first student so reservations have an owner
    if (enteredName === ADMIN_CREDENTIALS.username.toLowerCase() && password === ADMIN_CREDENTIALS.password) {
      onLogin(students[0]);
      return;
    }

    // Student login name is firstName + "Admin" (e.g. ElijahAdmin); the ER Username also works
    const student = students.find(
      (item) =>
        enteredName === `${item.FirstName}Admin`.toLowerCase() || enteredName === item.Username
    );
    if (student && password === STUDENT_PASSWORD) {
      onLogin(student);
      return;
    }
    setError('Username or password is incorrect.');
  };

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Bearcat Study Portal</h1>
        <p className="muted">Sign in to reserve a study room.</p>

        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          autoComplete="username"
          onChange={(event) => setUsername(event.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary">Sign in</button>
      </form>
    </main>
  );
}

export default Login;