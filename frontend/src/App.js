import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [claimResult, setClaimResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Fetch users and rankings
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users`);
      const data = await response.json();
      setUsers(data);
      // Auto-select first user if none selected
      if (!selectedUserId && data.length > 0) {
        setSelectedUserId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Fetch claim history
  const fetchHistory = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/history`);
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  // Add new user
  const addUser = async (e) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newUserName.trim() }),
      });
      
      if (response.ok) {
        setNewUserName('');
        fetchUsers();
      } else {
        const error = await response.json();
        alert(error.detail || 'Error adding user');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Error adding user');
    } finally {
      setLoading(false);
    }
  };

  // Claim points
  const claimPoints = async () => {
    if (!selectedUserId) return;
    
    setLoading(true);
    setClaimResult(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: selectedUserId }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setClaimResult(result);
        fetchUsers(); // Refresh rankings
        if (showHistory) {
          fetchHistory(); // Refresh history if visible
        }
      } else {
        const error = await response.json();
        alert(error.detail || 'Error claiming points');
      }
    } catch (error) {
      console.error('Error claiming points:', error);
      alert('Error claiming points');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getRankColor = (rank) => {
    if (rank === 1) return 'text-yellow-600';
    if (rank === 2) return 'text-gray-600';
    if (rank === 3) return 'text-amber-600';
    return 'text-gray-700';
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  useEffect(() => {
    fetchUsers();
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">🏆 Task Ranking System</h1>
            <p className="text-gray-600">Claim random points and climb the leaderboard!</p>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column - Actions */}
            <div className="space-y-6">
              
              {/* User Selection & Claim */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">🎯 Claim Points</h2>
                
                {/* User Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select User:
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a user...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.total_points} points)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Claim Button */}
                <button
                  onClick={claimPoints}
                  disabled={!selectedUserId || loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-md transition-colors duration-200 text-lg"
                >
                  {loading ? 'Claiming...' : '🎲 Claim Random Points (1-10)'}
                </button>

                {/* Claim Result */}
                {claimResult && (
                  <div className="mt-4 p-4 bg-green-100 border border-green-400 rounded-md">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-2xl">🎉</span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">
                          {claimResult.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Add New User */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">👤 Add New User</h2>
                <form onSubmit={addUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      User Name:
                    </label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Enter user name"
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-md transition-colors duration-200"
                  >
                    {loading ? 'Adding...' : '➕ Add User'}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column - Leaderboard */}
            <div className="space-y-6">
              
              {/* Leaderboard */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">🏅 Leaderboard</h2>
                <div className="space-y-3">
                  {users.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No users found</p>
                  ) : (
                    users.map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 ${
                          selectedUserId === user.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className={`text-2xl font-bold ${getRankColor(user.rank)}`}>
                            {getRankIcon(user.rank)}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-800">{user.name}</p>
                            <p className="text-sm text-gray-500">Rank {user.rank}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">{user.total_points}</p>
                          <p className="text-sm text-gray-500">points</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* History Toggle */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold text-gray-800">📊 Recent Activity</h2>
                  <button
                    onClick={() => {
                      setShowHistory(!showHistory);
                      if (!showHistory) fetchHistory();
                    }}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {showHistory ? 'Hide' : 'Show'} History
                  </button>
                </div>
                
                {showHistory && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {history.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No activity yet</p>
                    ) : (
                      history.slice(0, 10).map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                        >
                          <div>
                            <p className="font-medium text-gray-800">
                              {record.user_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(record.timestamp)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-green-600">
                              +{record.points_awarded}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;