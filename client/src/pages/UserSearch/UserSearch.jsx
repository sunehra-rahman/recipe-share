import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './UserSearch.module.css';

function UserSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [followStatus, setFollowStatus] = useState({});
  const { token, user } = useAuth();
  const navigate = useNavigate();

  // Filter out current user from results
  const filterCurrentUser = (users) => {
    return users.filter(userData => userData._id !== user._id);
  };

  // Load initial users when component mounts
  useEffect(() => {
    if (!searchTerm.trim()) {
      loadInitialUsers();
    }
  }, []);

  // Check follow status for all users
  const checkFollowStatus = async (users) => {
    const statusPromises = users.map(async (user) => {
      try {
        const response = await fetch(
          `http://localhost:3000/api/users/${user._id}/is-following`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        if (response.ok) {
          const { isFollowing } = await response.json();
          return [user._id, isFollowing];
        }
        return [user._id, false];
      } catch (err) {
        console.error(`Error checking follow status for user ${user._id}:`, err);
        return [user._id, false];
      }
    });

    const statuses = await Promise.all(statusPromises);
    return Object.fromEntries(statuses);
  };

  // Debounce search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch();
      } else {
        loadInitialUsers();
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const loadInitialUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:3000/api/users/initial?page=1&limit=9`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const data = await response.json();
      // Filter out current user and sort
      const filteredUsers = filterCurrentUser(data.users);
      const sortedUsers = filteredUsers.sort((a, b) => a.name.localeCompare(b.name));
      setUsers(sortedUsers);
      
      // Check follow status for all users
      const newFollowStatus = await checkFollowStatus(sortedUsers);
      setFollowStatus(newFollowStatus);
      
      setHasMore(data.hasMore);
      setCurrentPage(data.currentPage);
    } catch (err) {
      setError('Failed to load users. Please try again.');
      console.error('Load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadInitialUsers();
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentPage(1);

    try {
      const response = await fetch(
        `http://localhost:3000/api/users/search?query=${encodeURIComponent(searchTerm)}&page=1&limit=9`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to search users');
      }

      const data = await response.json();
      // Filter out current user and sort
      const filteredUsers = filterCurrentUser(data.users);
      const sortedUsers = filteredUsers.sort((a, b) => a.name.localeCompare(b.name));
      setUsers(sortedUsers);
      
      // Check follow status for all users
      const newFollowStatus = await checkFollowStatus(sortedUsers);
      setFollowStatus(newFollowStatus);
      
      setHasMore(data.hasMore);
      setCurrentPage(data.currentPage);
    } catch (err) {
      setError('Failed to search users. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (userId, e) => {
    e.stopPropagation();
    if (!user || user._id === userId) return;

    try {
      const isFollowing = followStatus[userId];
      const endpoint = isFollowing ? 'unfollow' : 'follow';
      const response = await fetch(`http://localhost:3000/api/users/${userId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to ${endpoint} user`);
      }

      // Update follow status
      setFollowStatus(prev => ({
        ...prev,
        [userId]: !isFollowing
      }));

      // Update user's follower count in the list
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u._id === userId
            ? {
                ...u,
                followerCount: isFollowing
                  ? (u.followerCount || 0) - 1
                  : (u.followerCount || 0) + 1
              }
            : u
        )
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const loadMore = async () => {
    if (!hasMore || isLoading) return;

    setIsLoading(true);
    const nextPage = currentPage + 1;

    try {
      const endpoint = searchTerm.trim()
        ? `http://localhost:3000/api/users/search?query=${encodeURIComponent(searchTerm)}&page=${nextPage}&limit=9`
        : `http://localhost:3000/api/users/initial?page=${nextPage}&limit=9`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load more users');
      }

      const data = await response.json();
      // Filter out current user from new results
      const filteredNewUsers = filterCurrentUser(data.users);
      // Simply append new users to the existing list without sorting
      setUsers(prevUsers => [...prevUsers, ...filteredNewUsers]);
      
      // Check follow status for new users
      const newFollowStatus = await checkFollowStatus(filteredNewUsers);
      setFollowStatus(prev => ({...prev, ...newFollowStatus}));
      
      setHasMore(data.hasMore);
      setCurrentPage(data.currentPage);
    } catch (err) {
      setError('Failed to load more users. Please try again.');
      console.error('Load more error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserClick = (userId) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div className={styles.container}>
      <h1>Search Users</h1>
      
      <div className={styles.searchForm}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by username or name..."
          className={styles.searchInput}
        />
      </div>

      {isLoading && users.length === 0 && <p>Loading...</p>}
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.results}>
        {users.length === 0 && !isLoading ? (
          <p>No users found</p>
        ) : (
          <>
            {users.map(user => (
              <div 
                key={user._id} 
                className={styles.userCard}
                onClick={() => handleUserClick(user._id)}
              >
                <img 
                  src={user.profilePicture || 'https://cdn-icons-png.flaticon.com/512/2922/2922510.png'} 
                  alt={user.name}
                  className={styles.avatar}
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = 'https://cdn-icons-png.flaticon.com/512/2922/2922510.png';
                  }}
                />
                <div className={styles.userInfo}>
                  <h3>{user.name}</h3>
                  <p className={styles.username}>{user.email}</p>
                  {user.bio && <p className={styles.bio}>{user.bio}</p>}
                </div>
                <button 
                  className={followStatus[user._id] ? styles.unfollowButton : styles.followButton}
                  onClick={(e) => handleFollow(user._id, e)}
                >
                  {followStatus[user._id] ? 'Unfollow' : 'Follow'}
                </button>
              </div>
            ))}
            {hasMore && (
              <button 
                onClick={loadMore} 
                className={styles.loadMoreButton}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Load More'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default UserSearch; 