import React, { useState, useEffect, useCallback } from 'react';

// ============================================
// CONFIGURATION - Add your API keys here
// ============================================
const CONFIG = {
  // OpenWeatherMap API Key (Get free key at: https://openweathermap.org/api)
    WEATHER_API_KEY: '645ca30988c8625fecca9a816d901465',
  
  // Google Calendar OAuth (Set up at: https://console.cloud.google.com)
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    GOOGLE_API_KEY: '643480272020-acncgudbscopt2ppoc70pk3qgme3lopb.apps.googleusercontent.com',
  
  // Default location for weather (or use geolocation)
  DEFAULT_CITY: 'Boston',
  DEFAULT_COUNTRY: 'US',
};

// Google Calendar Scopes
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================
export default function DailyDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(null);
  const [todos, setTodos] = useState(() => {
    // Load todos from localStorage
    const saved = localStorage.getItem('dashboard-todos');
    return saved ? JSON.parse(saved) : [
      { id: 1, text: 'Set up API keys for dashboard', completed: false, time: '9:00 AM' },
    ];
  });
  const [newTodo, setNewTodo] = useState('');
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState(null);
  const [greeting, setGreeting] = useState('');
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleToken, setGoogleToken] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // ============================================
  // TIME & GREETING
  // ============================================
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, [currentTime]);

  // ============================================
  // PERSIST TODOS TO LOCALSTORAGE
  // ============================================
  useEffect(() => {
    localStorage.setItem('dashboard-todos', JSON.stringify(todos));
  }, [todos]);

  // ============================================
  // WEATHER API INTEGRATION
  // ============================================
  const fetchWeather = useCallback(async (lat, lon) => {
    setWeatherLoading(true);
    setWeatherError(null);
    
    try {
      let url;
      if (lat && lon) {
        url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${CONFIG.WEATHER_API_KEY}&units=imperial`;
      } else {
        url = `https://api.openweathermap.org/data/2.5/weather?q=${CONFIG.DEFAULT_CITY},${CONFIG.DEFAULT_COUNTRY}&appid=${CONFIG.WEATHER_API_KEY}&units=imperial`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Weather data not available');
      }
      
      const data = await response.json();
      
      setWeather({
        temp: Math.round(data.main.temp),
        condition: data.weather[0].main,
        description: data.weather[0].description,
        high: Math.round(data.main.temp_max),
        low: Math.round(data.main.temp_min),
        humidity: data.main.humidity,
        wind: Math.round(data.wind.speed),
        icon: getWeatherIcon(data.weather[0].icon),
        city: data.name,
        feelsLike: Math.round(data.main.feels_like),
      });
    } catch (error) {
      console.error('Weather fetch error:', error);
      setWeatherError('Unable to load weather. Check API key.');
      // Set fallback demo data
      setWeather({
        temp: 72,
        condition: 'Demo Mode',
        description: 'Add API key to see real weather',
        high: 78,
        low: 62,
        humidity: 45,
        wind: 8,
        icon: '⛅',
        city: 'Demo',
        feelsLike: 70,
      });
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  // Get user's location and fetch weather
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          // Location denied, use default
          fetchWeather();
        }
      );
    } else {
      fetchWeather();
    }
  }, [fetchWeather]);

  // Map OpenWeatherMap icon codes to emojis
  const getWeatherIcon = (iconCode) => {
    const iconMap = {
      '01d': '☀️', '01n': '🌙',
      '02d': '⛅', '02n': '☁️',
      '03d': '☁️', '03n': '☁️',
      '04d': '☁️', '04n': '☁️',
      '09d': '🌧️', '09n': '🌧️',
      '10d': '🌦️', '10n': '🌧️',
      '11d': '⛈️', '11n': '⛈️',
      '13d': '❄️', '13n': '❄️',
      '50d': '🌫️', '50n': '🌫️',
    };
    return iconMap[iconCode] || '🌤️';
  };

  // ============================================
  // GOOGLE CALENDAR API INTEGRATION
  // ============================================
  
  // Load Google Identity Services
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Initialize Google OAuth
  const initGoogleAuth = () => {
    if (!window.google) {
      setCalendarError('Google API not loaded. Please refresh.');
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,
      callback: (response) => {
        if (response.access_token) {
          setGoogleToken(response.access_token);
          setIsGoogleConnected(true);
          fetchCalendarEvents(response.access_token);
        }
      },
    });

    tokenClient.requestAccessToken();
  };

  // Fetch calendar events for today
  const fetchCalendarEvents = async (token) => {
    setCalendarLoading(true);
    setCalendarError(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${today.toISOString()}&` +
        `timeMax=${tomorrow.toISOString()}&` +
        `singleEvents=true&` +
        `orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }

      const data = await response.json();
      
      const events = (data.items || []).map((event, index) => {
        const startTime = event.start.dateTime 
          ? new Date(event.start.dateTime)
          : new Date(event.start.date);
        const endTime = event.end.dateTime
          ? new Date(event.end.dateTime)
          : new Date(event.end.date);
        
        const durationMs = endTime - startTime;
        const durationMins = Math.round(durationMs / 60000);
        const durationStr = durationMins >= 60 
          ? `${Math.round(durationMins / 60)} hr${durationMins >= 120 ? 's' : ''}`
          : `${durationMins} min`;

        const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#DDA0DD', '#87CEEB'];
        
        return {
          id: event.id,
          title: event.summary || 'Untitled Event',
          time: startTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          duration: durationStr,
          color: colors[index % colors.length],
          description: event.description,
          location: event.location,
        };
      });

      setCalendarEvents(events);
    } catch (error) {
      console.error('Calendar fetch error:', error);
      setCalendarError('Unable to load calendar events');
    } finally {
      setCalendarLoading(false);
    }
  };

  // Refresh calendar events
  const refreshCalendar = () => {
    if (googleToken) {
      fetchCalendarEvents(googleToken);
    }
  };

  // Disconnect Google Calendar
  const disconnectGoogle = () => {
    setIsGoogleConnected(false);
    setGoogleToken(null);
    setCalendarEvents([]);
    if (window.google) {
      window.google.accounts.oauth2.revoke(googleToken);
    }
  };

  // ============================================
  // TODO FUNCTIONS
  // ============================================
  const addTodo = () => {
    if (newTodo.trim()) {
      setTodos([...todos, {
        id: Date.now(),
        text: newTodo,
        completed: false,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      }]);
      setNewTodo('');
    }
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const completedCount = todos.filter(t => t.completed).length;
  const progress = todos.length > 0 ? (completedCount / todos.length) * 100 : 0;

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div style={styles.container}>
      {/* Animated Background */}
      <div style={styles.bgGradient}></div>
      <div style={styles.bgOrb1}></div>
      <div style={styles.bgOrb2}></div>
      
      <div style={styles.content}>
        {/* Header with Time */}
        <header style={styles.header}>
          <div style={styles.greetingSection}>
            <p style={styles.greeting}>{greeting}</p>
            <h1 style={styles.date}>{formatDate(currentTime)}</h1>
          </div>
          <div style={styles.timeSection}>
            <span style={styles.time}>{formatTime(currentTime)}</span>
          </div>
        </header>

        {/* Main Grid */}
        <div style={styles.grid}>
          {/* Weather Card */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Weather</h2>
              {weather && <span style={styles.cityBadge}>{weather.city}</span>}
            </div>
            {weatherLoading ? (
              <div style={styles.loadingState}>
                <div style={styles.spinner}></div>
                <p>Loading weather...</p>
              </div>
            ) : weather && (
              <div style={styles.weatherContent}>
                <div style={styles.weatherMain}>
                  <span style={styles.weatherIcon}>{weather.icon}</span>
                  <span style={styles.weatherTemp}>{weather.temp}°</span>
                </div>
                <p style={styles.weatherCondition}>{weather.description}</p>
                {weather.feelsLike && (
                  <p style={styles.feelsLike}>Feels like {weather.feelsLike}°</p>
                )}
                <div style={styles.weatherDetails}>
                  <div style={styles.weatherDetail}>
                    <span style={styles.detailLabel}>High</span>
                    <span style={styles.detailValue}>{weather.high}°</span>
                  </div>
                  <div style={styles.weatherDetail}>
                    <span style={styles.detailLabel}>Low</span>
                    <span style={styles.detailValue}>{weather.low}°</span>
                  </div>
                  <div style={styles.weatherDetail}>
                    <span style={styles.detailLabel}>Humidity</span>
                    <span style={styles.detailValue}>{weather.humidity}%</span>
                  </div>
                  <div style={styles.weatherDetail}>
                    <span style={styles.detailLabel}>Wind</span>
                    <span style={styles.detailValue}>{weather.wind} mph</span>
                  </div>
                </div>
                {weatherError && (
                  <p style={styles.errorHint}>{weatherError}</p>
                )}
              </div>
            )}
          </div>

          {/* Calendar Card */}
          <div style={{...styles.card, ...styles.calendarCard}}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Today's Schedule</h2>
              <div style={styles.calendarActions}>
                {isGoogleConnected && (
                  <button onClick={refreshCalendar} style={styles.refreshBtn} title="Refresh">
                    ↻
                  </button>
                )}
                {!isGoogleConnected ? (
                  <button onClick={initGoogleAuth} style={styles.connectBtn}>
                    <span style={styles.googleIcon}>G</span> Connect Google
                  </button>
                ) : (
                  <button onClick={disconnectGoogle} style={styles.disconnectBtn}>
                    Disconnect
                  </button>
                )}
              </div>
            </div>
            
            {calendarLoading ? (
              <div style={styles.loadingState}>
                <div style={styles.spinner}></div>
                <p>Loading events...</p>
              </div>
            ) : calendarError ? (
              <div style={styles.errorState}>
                <p>{calendarError}</p>
              </div>
            ) : (
              <div style={styles.calendarContent}>
                {!isGoogleConnected ? (
                  <div style={styles.emptyState}>
                    <span style={styles.emptyIcon}>📅</span>
                    <p>Connect Google Calendar to see your events</p>
                  </div>
                ) : calendarEvents.length === 0 ? (
                  <div style={styles.emptyState}>
                    <span style={styles.emptyIcon}>🎉</span>
                    <p>No events scheduled for today!</p>
                  </div>
                ) : (
                  calendarEvents.map((event, index) => (
                    <div 
                      key={event.id} 
                      style={{
                        ...styles.calendarEvent,
                        animationDelay: `${index * 0.1}s`,
                        borderLeftColor: event.color,
                      }}
                    >
                      <div style={styles.eventTime}>{event.time}</div>
                      <div style={styles.eventInfo}>
                        <span style={styles.eventTitle}>{event.title}</span>
                        <span style={styles.eventDuration}>{event.duration}</span>
                        {event.location && (
                          <span style={styles.eventLocation}>📍 {event.location}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* To-Do Card */}
          <div style={{...styles.card, ...styles.todoCard}}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>To-Do List</h2>
              <span style={styles.todoBadge}>{completedCount}/{todos.length}</span>
            </div>
            
            {/* Progress Bar */}
            <div style={styles.progressContainer}>
              <div style={{...styles.progressBar, width: `${progress}%`}}></div>
            </div>
            
            {/* Add Todo Input */}
            <div style={styles.addTodoContainer}>
              <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                placeholder="Add a new task..."
                style={styles.todoInput}
              />
              <button onClick={addTodo} style={styles.addBtn}>+</button>
            </div>
            
            {/* Todo List */}
            <div style={styles.todoList}>
              {todos.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>✨</span>
                  <p>All done! Add a new task above.</p>
                </div>
              ) : (
                todos.map((todo, index) => (
                  <div 
                    key={todo.id} 
                    style={{
                      ...styles.todoItem,
                      opacity: todo.completed ? 0.6 : 1,
                      animationDelay: `${index * 0.05}s`,
                    }}
                  >
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      style={{
                        ...styles.checkbox,
                        backgroundColor: todo.completed ? '#4ECDC4' : 'transparent',
                        borderColor: todo.completed ? '#4ECDC4' : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {todo.completed && <span style={styles.checkmark}>✓</span>}
                    </button>
                    <div style={styles.todoContent}>
                      <span style={{
                        ...styles.todoText,
                        textDecoration: todo.completed ? 'line-through' : 'none',
                      }}>
                        {todo.text}
                      </span>
                      <span style={styles.todoTime}>{todo.time}</span>
                    </div>
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      style={styles.deleteBtn}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Daily Summary Card */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Daily Summary</h2>
              <span style={styles.cardIcon}>📊</span>
            </div>
            <div style={styles.summaryContent}>
              <div style={styles.summaryItem}>
                <div style={styles.summaryIcon}>📅</div>
                <div style={styles.summaryInfo}>
                  <span style={styles.summaryValue}>{calendarEvents.length}</span>
                  <span style={styles.summaryLabel}>Meetings</span>
                </div>
              </div>
              <div style={styles.summaryItem}>
                <div style={styles.summaryIcon}>✅</div>
                <div style={styles.summaryInfo}>
                  <span style={styles.summaryValue}>{completedCount}</span>
                  <span style={styles.summaryLabel}>Completed</span>
                </div>
              </div>
              <div style={styles.summaryItem}>
                <div style={styles.summaryIcon}>⏳</div>
                <div style={styles.summaryInfo}>
                  <span style={styles.summaryValue}>{todos.length - completedCount}</span>
                  <span style={styles.summaryLabel}>Pending</span>
                </div>
              </div>
              <div style={styles.summaryItem}>
                <div style={styles.summaryIcon}>💪</div>
                <div style={styles.summaryInfo}>
                  <span style={styles.summaryValue}>{Math.round(progress)}%</span>
                  <span style={styles.summaryLabel}>Progress</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <div style={styles.setupCard}>
          <h3 style={styles.setupTitle}>🔧 API Setup Instructions</h3>
          <div style={styles.setupGrid}>
            <div style={styles.setupSection}>
              <h4 style={styles.setupSubtitle}>Weather API (OpenWeatherMap)</h4>
              <ol style={styles.setupList}>
                <li>Go to <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" style={styles.setupLink}>openweathermap.org/api</a></li>
                <li>Sign up for a free account</li>
                <li>Get your API key from the dashboard</li>
                <li>Replace <code style={styles.code}>YOUR_OPENWEATHERMAP_API_KEY</code> in CONFIG</li>
              </ol>
            </div>
            <div style={styles.setupSection}>
              <h4 style={styles.setupSubtitle}>Google Calendar API</h4>
              <ol style={styles.setupList}>
                <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" style={styles.setupLink}>console.cloud.google.com</a></li>
                <li>Create a new project</li>
                <li>Enable Google Calendar API</li>
                <li>Create OAuth 2.0 credentials (Web application)</li>
                <li>Add your domain to authorized origins</li>
                <li>Replace <code style={styles.code}>YOUR_GOOGLE_CLIENT_ID</code> in CONFIG</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer style={styles.footer}>
          <p style={styles.footerText}>Daily Dashboard • Stay Organized</p>
        </footer>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        input:focus {
          border-color: rgba(78, 205, 196, 0.5) !important;
          background: rgba(255, 255, 255, 0.08) !important;
        }
        
        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        a {
          color: #4ECDC4;
          text-decoration: none;
        }
        
        a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

// ============================================
// STYLES
// ============================================
const styles = {
  container: {
    minHeight: '100vh',
    width: '100%',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f1a 100%)',
    fontFamily: "'Outfit', sans-serif",
    position: 'relative',
    overflow: 'auto',
  },
  bgGradient: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(ellipse at 20% 20%, rgba(78, 205, 196, 0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(255, 107, 107, 0.08) 0%, transparent 50%)',
    pointerEvents: 'none',
  },
  bgOrb1: {
    position: 'fixed',
    top: '10%',
    left: '5%',
    width: '300px',
    height: '300px',
    background: 'radial-gradient(circle, rgba(78, 205, 196, 0.15) 0%, transparent 70%)',
    borderRadius: '50%',
    animation: 'float 8s ease-in-out infinite',
    pointerEvents: 'none',
  },
  bgOrb2: {
    position: 'fixed',
    bottom: '10%',
    right: '10%',
    width: '250px',
    height: '250px',
    background: 'radial-gradient(circle, rgba(255, 230, 109, 0.1) 0%, transparent 70%)',
    borderRadius: '50%',
    animation: 'float 10s ease-in-out infinite reverse',
    pointerEvents: 'none',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    padding: '40px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '40px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  greetingSection: {
    animation: 'slideIn 0.6s ease-out',
  },
  greeting: {
    fontSize: '18px',
    color: '#4ECDC4',
    fontWeight: '500',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  date: {
    fontSize: '36px',
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: '-0.5px',
  },
  timeSection: {
    animation: 'slideIn 0.6s ease-out 0.1s backwards',
  },
  time: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '48px',
    fontWeight: '500',
    color: '#ffffff',
    background: 'linear-gradient(135deg, #4ECDC4, #FFE66D)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px',
    marginBottom: '40px',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    padding: '28px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    animation: 'slideIn 0.6s ease-out backwards',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  },
  calendarCard: {
    animationDelay: '0.1s',
  },
  todoCard: {
    animationDelay: '0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: '0.5px',
  },
  cardIcon: {
    fontSize: '24px',
  },
  cityBadge: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.5)',
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '4px 10px',
    borderRadius: '12px',
  },
  
  // Loading & Error States
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: 'rgba(255, 255, 255, 0.5)',
    gap: '16px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: '#4ECDC4',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorState: {
    padding: '20px',
    textAlign: 'center',
    color: '#FF6B6B',
  },
  errorHint: {
    fontSize: '11px',
    color: '#FFE66D',
    marginTop: '16px',
    padding: '8px',
    background: 'rgba(255, 230, 109, 0.1)',
    borderRadius: '8px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    gap: '12px',
  },
  emptyIcon: {
    fontSize: '36px',
  },
  
  // Weather styles
  weatherContent: {
    textAlign: 'center',
  },
  weatherMain: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '8px',
  },
  weatherIcon: {
    fontSize: '64px',
  },
  weatherTemp: {
    fontSize: '56px',
    fontWeight: '300',
    color: '#ffffff',
  },
  weatherCondition: {
    fontSize: '16px',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'capitalize',
  },
  feelsLike: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: '24px',
  },
  weatherDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  weatherDetail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
  },
  detailLabel: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '4px',
  },
  detailValue: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#ffffff',
  },
  
  // Calendar styles
  calendarActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  connectBtn: {
    background: 'linear-gradient(135deg, #4285F4, #34A853)',
    border: 'none',
    borderRadius: '20px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  googleIcon: {
    fontWeight: '700',
    fontSize: '14px',
  },
  disconnectBtn: {
    background: 'rgba(255, 107, 107, 0.2)',
    border: '1px solid rgba(255, 107, 107, 0.3)',
    borderRadius: '20px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#FF6B6B',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  refreshBtn: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    fontSize: '16px',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  calendarEvent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '16px',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '12px',
    borderLeft: '4px solid',
    animation: 'slideIn 0.4s ease-out backwards',
    transition: 'background 0.2s ease',
  },
  eventTime: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.5)',
    minWidth: '80px',
  },
  eventInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  eventTitle: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#ffffff',
  },
  eventDuration: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  eventLocation: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: '4px',
  },
  
  // Todo styles
  todoBadge: {
    background: 'rgba(78, 205, 196, 0.2)',
    color: '#4ECDC4',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
  },
  progressContainer: {
    width: '100%',
    height: '6px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '3px',
    marginBottom: '20px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #4ECDC4, #44A08D)',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
  addTodoContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  todoInput: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '14px 18px',
    fontSize: '14px',
    color: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.2s ease, background 0.2s ease',
    fontFamily: "'Outfit', sans-serif",
  },
  addBtn: {
    width: '48px',
    height: '48px',
    background: 'linear-gradient(135deg, #4ECDC4, #44A08D)',
    border: 'none',
    borderRadius: '12px',
    fontSize: '24px',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '220px',
    overflowY: 'auto',
  },
  todoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 16px',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '12px',
    animation: 'slideIn 0.3s ease-out backwards',
    transition: 'opacity 0.3s ease, background 0.2s ease',
  },
  checkbox: {
    width: '24px',
    height: '24px',
    borderRadius: '8px',
    border: '2px solid',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  checkmark: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '700',
  },
  todoContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  todoText: {
    fontSize: '14px',
    color: '#ffffff',
    transition: 'text-decoration 0.2s ease',
  },
  todoTime: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: "'JetBrains Mono', monospace",
  },
  deleteBtn: {
    width: '28px',
    height: '28px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: '20px',
    cursor: 'pointer',
    transition: 'color 0.2s ease, background 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Summary styles
  summaryContent: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  summaryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '18px',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '16px',
    transition: 'background 0.2s ease',
  },
  summaryIcon: {
    fontSize: '28px',
  },
  summaryInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  summaryValue: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#ffffff',
  },
  summaryLabel: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  
  // Setup Instructions
  setupCard: {
    background: 'rgba(255, 230, 109, 0.05)',
    border: '1px solid rgba(255, 230, 109, 0.2)',
    borderRadius: '24px',
    padding: '28px',
    marginBottom: '40px',
  },
  setupTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#FFE66D',
    marginBottom: '20px',
  },
  setupGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
  },
  setupSection: {
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '16px',
    padding: '20px',
  },
  setupSubtitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '12px',
  },
  setupList: {
    paddingLeft: '20px',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '13px',
    lineHeight: '2',
  },
  setupLink: {
    color: '#4ECDC4',
    textDecoration: 'none',
  },
  code: {
    background: 'rgba(78, 205, 196, 0.2)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '11px',
    color: '#4ECDC4',
  },
  
  // Footer
  footer: {
    textAlign: 'center',
    paddingTop: '20px',
  },
  footerText: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: '2px',
    textTransform: 'uppercase',
  },
};
