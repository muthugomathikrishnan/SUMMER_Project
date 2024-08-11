// app.js
import React, { useState, useEffect } from 'react';
import './App.css';
import chatLogo from './assets/chat.png'; 
import profileImage from './assets/profile.jpeg';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:3001/api/user/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(response => response.json())
        .then(data => {
          setIsLoggedIn(true);
          setUser(data);
          setUpdateCount(data.update_count || 0); // Ensure to use the correct field name
        })
        .catch(error => {
          console.error('Error:', error);
          setIsLoggedIn(false);
        });
    }
  }, []);

  const handleLogin = (rollno, password) => {
    fetch('http://localhost:3001/api/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rollno, password }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.token) {
          setIsLoggedIn(true);
          setUser(data.user);
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setError('');
        } else {
          setError(data.error);
        }
      })
      .catch(error => {
        console.error('Error:', error);
        setError('Invalid login credentials. Please try again.');
      });
  };

  const handleProfileUpdate = (updatedUser) => {
    if (updateCount >= 3) {
      setError('You can only update your profile 3 times.');
      return;
    }

    fetch(`http://localhost:3001/api/user/${updatedUser.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(updatedUser),
    })
      .then(response => response.json())
      .then(data => {
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
        setUpdateCount(updateCount + 1);
        setShowProfileModal(false);
        setError('');
        // Fetch updated user data
        fetch('http://localhost:3001/api/user/me', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        })
          .then(response => response.json())
          .then(data => setUser(data))
          .catch(error => console.error('Error fetching updated user data:', error));
      })
      .catch(error => {
        console.error('Error:', error);
        setError('Failed to update profile. Please try again.');
      });
  };

  const handlePasswordChange = (newPassword, confirmPassword, oldPassword) => {
  if (newPassword !== confirmPassword) {
    alert('Passwords do not match.');
    return;
  }

  fetch(`http://localhost:3001/api/user/${user.id}/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({ oldPassword, newPassword }),
  })
    .then(response => response.json())
    .then(data => {
      if (data.message === 'Password updated successfully') {
        alert('Password updated successfully.');
        setShowProfileModal(false);
      } else {
        alert(data.error || 'Failed to update password.');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Failed to update password.');
    });
};

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
  };

  return (
    <div className="App">
      {isLoggedIn ? (
        <>
          <Dashboard user={user} onLogout={handleLogout} onProfileClick={() => setShowProfileModal(true)} />
          {showProfileModal && (
            <ProfileModal
              user={user}
              onUpdate={handleProfileUpdate}
              onClose={() => setShowProfileModal(false)}
              onPasswordChange={handlePasswordChange}
              updateCount={updateCount}
            />
          )}
        </>
      ) : (
        <AuthForm onLogin={handleLogin} error={error} />
      )}
    </div>
  );
}

function AuthForm({ onLogin, error }) {
  const [rollno, setRollno] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(rollno, password);
  };

  return (
    <div className="auth-form">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Roll No</label>
          <input
            type="text"
            value={rollno}
            onChange={(e) => setRollno(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

function Dashboard({ user, onLogout, onProfileClick }) {
  return (
    <div className="dashboard">
      <TopBar user={user} onLogout={onLogout} onProfileClick={onProfileClick} />
      <div className="main-content">
        <Sidebar />
        <div className="content-area">
          <h1>Welcome, {user.name}!</h1>
          {/* Add additional content here if needed */}
        </div>
      </div>
    </div>
  );
}

function TopBar({ user, onLogout, onProfileClick }) {
  return (
    <div className="topbar">
      <img src={chatLogo} alt="Project Logo" className="logo" />
      <div className="profile-section">
        <img src={profileImage} alt="Profile" className="profile-photo" onClick={onProfileClick} />
        <button onClick={onLogout} className="logout-button">Logout</button>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <div className="sidebar">
      <ul>
        <li><a href="#home">Home</a></li>
        <li><a href="#friends">Friends</a></li>
        <li><a href="#channels">Channels</a></li>
      </ul>
    </div>
  );
}
function ProfileModal({ user, onUpdate, onClose, onPasswordChange, updateCount }) {
  const [profileData, setProfileData] = useState(user);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  const handleChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    onUpdate(profileData);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    onPasswordChange(newPassword, confirmPassword, oldPassword);
  };

  const togglePasswordChangeVisibility = () => {
    setShowPasswordChange(prev => !prev);
  };

  return (
    <div className="profile-modal">
      <div className="modal-content">
        <h2>Profile<button className="close-topbutton" onClick={onClose}>X</button></h2>
        <form onSubmit={handleProfileSubmit}>
          <div>
            <img src={profileImage} alt="Profile" className="profile"/>
          </div>
          <div>
            <label>Name: </label>
            <input
              type="text"
              name="name"
              value={profileData.name}
              onChange={handleChange}
            />
          </div>
          <div>
            <label>Roll No: </label>
            <input
              type="text"
              name="rollno"
              value={profileData.rollno}
              onChange={handleChange}
            />
          </div>
          <div>
            <label>Mobile No: </label>
            <input
              type="text"
              name="mobile_no"
              value={profileData.mobile_no}
              onChange={handleChange}
            />
          </div>
          <div>
            <label>Course: </label>
            <input
              type="text"
              name="course"
              value={profileData.course}
              onChange={handleChange}
            />
          </div>
          <div>
            <label>Semester: </label>
            <input
              type="number"
              name="semester"
              value={profileData.semester}
              onChange={handleChange}
            />
          </div>
          <div>
            <label>Department: </label>
            <input
              type="text"
              name="dept"
              value={profileData.dept}
              onChange={handleChange}
            />
          </div>
          <div>
            <label>College Name: </label>
            <input
              type="text"
              name="collegename"
              value={profileData.collegename}
              onChange={handleChange}
            />
          </div>
          <div>
            <label>Mail ID: </label>
            <input
              type="email"
              name="mailid"
              value={profileData.mailid}
              onChange={handleChange}
            />
          </div>
          <button type="submit" className={profileData.update_count >= 3 ? "disabled" : ""} disabled={profileData.update_count >= 3}>Update</button>
          <p>Remaining profile updates: {3-profileData.update_count}</p>
        </form>
        <button onClick={togglePasswordChangeVisibility}>
          {showPasswordChange ? 'Hide Password Change' : 'Change Password'}
        </button>
        {showPasswordChange && (
          <>
            <form onSubmit={handlePasswordSubmit}>
              <h2>Change Password</h2>
              <div>
                <label>Old Password: </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>New Password: </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>Confirm New Password: </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit">Change Password</button>
            </form>
          </>
        )}
        <button className="close-button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default App;
