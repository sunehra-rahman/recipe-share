import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import styles from './NavBar.module.css';

const LOCAL_PROFILE_KEY = 'dev_profile';

export default function NavBar() {
  const { user, logout, token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('name');
  const navigate = useNavigate();

  // Fetch latest profile data when user changes
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !token) return;
      
      try {
        const response = await fetch('http://localhost:3000/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setProfile(data);
          localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(data));
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };

    fetchProfile();
  }, [user, token]);

  // Update profile when user changes
  useEffect(() => {
    if (!user) {
      setProfile(null);
      localStorage.removeItem(LOCAL_PROFILE_KEY);
    }
  }, [user]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/home?search=${searchTerm}&type=${searchType}`);
    }
  };

  const handleLogout = async () => {
    setProfile(null);
    localStorage.removeItem(LOCAL_PROFILE_KEY);
    logout();
    navigate('/login');
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.titleBar}>
        <div className={styles.logo}>
          <Link to="/home">RecipeShare</Link>
        </div>
      </div>
      <div className={styles.navBar}>
        <div className={styles.links}>
          <Link to="/home">Home</Link>
          <Link to="/create-recipe">Create Recipe</Link>
          <Link to="/search-users">Search Users</Link>
        </div>
        
        <form onSubmit={handleSearch} className={styles.searchContainer}>
          <div className={styles.searchBox}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search by ${searchType}...`}
              className={styles.searchInput}
            />
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className={styles.searchType}
            >
              <option value="name">Recipe Name</option>
              <option value="cuisine">Cuisine</option>
              <option value="ingredient">Ingredient</option>
            </select>
            <button type="submit" className={styles.searchButton}>
              Search
            </button>
          </div>
        </form>

        <div className={styles.links}>
          {user && (
            <div className={styles.userInfo} onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
              <img
                src={profile?.profilePicture || user?.profilePicture || 'https://cdn-icons-png.flaticon.com/512/2922/2922510.png'}
                alt="user avatar"
                className={styles.avatar}
              />
              <span className={styles.userName}>{profile?.name || user.name}</span>
            </div>
          )}
          {user && <button className={styles.logout} onClick={handleLogout}>Logout</button>}
        </div>
      </div>
    </nav>
  );
} 