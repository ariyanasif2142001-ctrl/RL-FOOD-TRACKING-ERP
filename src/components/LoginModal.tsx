import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, UserRole } from '../types';
import { apiLogin } from '../services/apiClient';
import { INITIAL_USERS } from '../services/storage';
import { 
  Shield, ShoppingBag, Warehouse, Truck, User as UserIcon, AlertCircle, X, 
  Loader2, Eye, EyeOff, Lock, CheckCircle2, Sparkles, Leaf, ArrowRight,
  Utensils, Check, Smartphone, Download, Share, Crown
} from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User | null;
  onLogin: (user: User, rememberMe?: boolean) => void;
  onAuditLog?: (action: string, details: string, user?: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onLogin,
  onAuditLog
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('rl_remember_me') !== 'false';
  });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [redirectNotice, setRedirectNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'credentials' | 'quick'>('credentials');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [hoverCategory, setHoverCategory] = useState<string | null>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleTriggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      const savedUsername = localStorage.getItem('rl_remembered_username');
      if (savedUsername && !usernameInput) {
        setUsernameInput(savedUsername);
      }
    }
  }, [isOpen]);

  const saveRememberMePreference = (usernameToSave: string) => {
    localStorage.setItem('rl_remember_me', rememberMe ? 'true' : 'false');
    if (rememberMe) {
      localStorage.setItem('rl_remembered_username', usernameToSave);
    } else {
      localStorage.removeItem('rl_remembered_username');
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const q = usernameInput.trim().toLowerCase();
    if (!q || !passwordInput) {
      setLoginError('Please enter both username and password.');
      return;
    }

    setIsAuthenticating(true);

    // Authenticate via Supabase API backend
    const apiRes = await apiLogin(q, passwordInput);

    if (apiRes.success && apiRes.data?.user) {
      const authUser: User = {
        ...apiRes.data.user,
        token: apiRes.data.user.token || (apiRes.data as { token?: string })?.token
      };
      saveRememberMePreference(usernameInput);
      setRedirectNotice(`Authenticated! Redirecting to ${authUser.role.toUpperCase()} Portal...`);
      onAuditLog?.('User Login', `Successfully authenticated via API credentials as ${authUser.name} (${authUser.role})`, authUser);
      
      setTimeout(() => {
        setIsAuthenticating(false);
        setRedirectNotice(null);
        onLogin(authUser, rememberMe);
        setPasswordInput('');
        onClose();
      }, 400);
      return;
    }

    setIsAuthenticating(false);
    const errMsg = apiRes.message || 'Invalid username or password.';
    setLoginError(errMsg);
    onAuditLog?.('Login Failure', `Failed login attempt for username/email: "${usernameInput}"`);
  };

  const handleQuickLogin = (user: User) => {
    if (!user.active || user.status === 'Inactive') {
      setLoginError('Your account is disabled. Inactive users cannot login.');
      onAuditLog?.('Login Blocked', `Blocked quick-login attempt for inactive user: "${user.name}"`);
      return;
    }

    const userWithToken: User = {
      ...user,
      token: user.token || ("SESS-QUICK-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8).toUpperCase())
    };

    saveRememberMePreference(user.username || user.email || user.name);
    setRedirectNotice(`Auto-redirecting to ${user.role.toUpperCase()} View (${user.name})...`);
    onAuditLog?.('User Quick Login', `Switched active user session to ${user.name} (${user.role.toUpperCase()})`, userWithToken);

    setTimeout(() => {
      setRedirectNotice(null);
      onLogin(userWithToken, rememberMe);
      onClose();
    }, 300);
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return <Crown className="w-5 h-5 text-amber-600" />;
      case 'admin': return <Shield className="w-5 h-5 text-purple-600" />;
      case 'purchaser': return <ShoppingBag className="w-5 h-5 text-blue-600" />;
      case 'warehouse': return <Warehouse className="w-5 h-5 text-amber-600" />;
      case 'dispatch': return <Truck className="w-5 h-5 text-emerald-600" />;
    }
  };

  // Food Category Showcase Items
  const foodCategories = [
    { id: 'veg', label: 'Vegetables', icon: '🥬', color: 'hover:bg-emerald-100 hover:text-emerald-900', img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=300&q=80' },
    { id: 'meat', label: 'Meat', icon: '🥩', color: 'hover:bg-rose-100 hover:text-rose-900', img: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=300&q=80' },
    { id: 'fish', label: 'Fish', icon: '🐟', color: 'hover:bg-cyan-100 hover:text-cyan-900', img: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=300&q=80' },
    { id: 'bakery', label: 'Bakery', icon: '🍞', color: 'hover:bg-amber-100 hover:text-amber-900', img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80' },
    { id: 'fruit', label: 'Fruits', icon: '🍎', color: 'hover:bg-red-100 hover:text-red-900', img: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=300&q=80' },
    { id: 'grocery', label: 'Grocery', icon: '🛒', color: 'hover:bg-lime-100 hover:text-lime-900', img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80' },
  ];

  const defaultAccounts: User[] = users.length > 0 ? users : INITIAL_USERS;

  const filteredAccounts = defaultAccounts.filter(u => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter || (roleFilter === 'admin' && u.role === 'super_admin');
    const query = userSearchQuery.trim().toLowerCase();
    const matchesQuery = !query || 
      u.name.toLowerCase().includes(query) || 
      (u.username && u.username.toLowerCase().includes(query)) ||
      u.role.toLowerCase().includes(query);
    return matchesRole && matchesQuery;
  });

  const isSuperAdmin = currentUser?.isSuperAdmin === true;
  const effectiveTab = isSuperAdmin ? activeTab : 'credentials';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-emerald-100/80 overflow-hidden relative flex flex-col my-auto"
          >
            {/* Top Organic Header Banner */}
            <div className="relative bg-gradient-to-br from-[#1B5E20] via-[#2E7D32] to-[#43A047] text-white pt-6 pb-10 px-6 overflow-hidden">
              {/* Background Fresh Leaf Pattern & Organic Curves */}
              <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay">
                <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                  <path d="M0,0 C150,90 250,-40 400,60 L400,0 L0,0 Z" fill="#81C784" />
                  <circle cx="350" cy="40" r="90" fill="#A5D6A7" opacity="0.4" />
                  <circle cx="50" cy="120" r="70" fill="#1B5E20" opacity="0.4" />
                </svg>
              </div>

              {/* Install Mobile App Button */}
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(true)}
                className="absolute top-3.5 left-3.5 px-2.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-extrabold text-[10px] sm:text-xs flex items-center gap-1.5 transition backdrop-blur-xs cursor-pointer shadow-xs border border-white/20 z-20 active:scale-95"
                title="Install RL Food Mobile App"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-200" />
                <span>Install Mobile App</span>
              </button>

              {/* Close Button (if user logged in) */}
              {currentUser && (
                <button
                  onClick={onClose}
                  className="absolute top-3.5 right-3.5 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition z-20 backdrop-blur-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Top Company Badge & Logo */}
              <div className="relative z-10 flex flex-col items-center text-center space-y-2.5">
                {/* Central Circular Fresh Produce Showcase with Logo */}
                <div className="relative mt-1">
                  {/* Rotating Animated Background Glow Ring */}
                  <motion.div 
                    className="absolute -inset-2 rounded-full bg-gradient-to-tr from-amber-300 via-lime-300 to-emerald-400 opacity-80 blur-xs"
                    animate={{ rotate: 360, scale: [1, 1.04, 1] }}
                    transition={{ 
                      rotate: { repeat: Infinity, duration: 12, ease: "linear" },
                      scale: { repeat: Infinity, duration: 3, ease: "easeInOut" }
                    }}
                  />

                  {/* Main Floating Container */}
                  <motion.div 
                    className="relative z-10"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                  >
                    {/* Outer Border Circle */}
                    <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full p-1 bg-white/90 shadow-2xl relative">
                      <div className="w-full h-full rounded-full overflow-hidden bg-emerald-950 relative group">
                        {/* Fresh Produce Showcase Photo matching input_file_1.png */}
                        <img 
                          src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80" 
                          alt="RL Fresh Produce - Vegetables, Meat, Fish & Grocery" 
                          className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition" />
                      </div>
                    </div>

                    {/* Floating Food Badges */}
                    <motion.div 
                      className="absolute -top-1 -left-2 bg-white text-emerald-800 p-1.5 rounded-full shadow-md text-xs border border-emerald-200"
                      animate={{ y: [0, -3, 0] }}
                      transition={{ repeat: Infinity, duration: 2.5 }}
                    >
                      🥬
                    </motion.div>
                    <motion.div 
                      className="absolute -top-1 -right-2 bg-white text-rose-800 p-1.5 rounded-full shadow-md text-xs border border-rose-200"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 3, delay: 0.2 }}
                    >
                      🥩
                    </motion.div>
                    <motion.div 
                      className="absolute -bottom-1 -left-2 bg-white text-cyan-800 p-1.5 rounded-full shadow-md text-xs border border-cyan-200"
                      animate={{ y: [0, -3, 0] }}
                      transition={{ repeat: Infinity, duration: 2.8, delay: 0.4 }}
                    >
                      🐟
                    </motion.div>
                    <motion.div 
                      className="absolute -bottom-1 -right-2 bg-white text-amber-800 p-1.5 rounded-full shadow-md text-xs border border-amber-200"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 3.2, delay: 0.6 }}
                    >
                      🍎
                    </motion.div>
                  </motion.div>
                </div>

                {/* Company Logo Badge */}
                <motion.div 
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-3.5 py-1 bg-white/95 rounded-full border border-emerald-300 shadow-md inline-flex items-center justify-center"
                >
                  <CompanyLogo size="xs" showText={true} />
                </motion.div>

                {/* Welcome Title matching input_file_1.png */}
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-1.5 drop-shadow-xs">
                    <span>🍃</span>
                    <span>Welcome Back</span>
                    <span>🍃</span>
                  </h2>
                  <p className="text-xs text-emerald-100 font-semibold mt-0.5">
                    Sign in to <span className="font-extrabold text-white">RL Food Company</span>
                  </p>
                </div>
              </div>

              {/* Bottom Curved Wave Divider */}
              <div className="absolute bottom-0 left-0 right-0 h-5 overflow-hidden pointer-events-none">
                <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="h-full w-full">
                  <path d="M0,0 C150,90 350,-40 500,60 L500,150 L0,150 Z" className="fill-white"></path>
                </svg>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-5 sm:p-6 pt-1 space-y-4 relative z-10 flex-1">

              {/* Super Admin Tab Switcher */}
              {isSuperAdmin && (
                <div className="grid grid-cols-2 gap-1 bg-emerald-50/80 p-1 rounded-2xl text-xs font-bold border border-emerald-100">
                  <button
                    onClick={() => { setActiveTab('credentials'); setLoginError(null); }}
                    className={`py-2 rounded-xl transition-all ${
                      effectiveTab === 'credentials' 
                        ? 'bg-[#2E7D32] text-white shadow-sm' 
                        : 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/50'
                    }`}
                  >
                    Username & Password
                  </button>
                  <button
                    onClick={() => { setActiveTab('quick'); setLoginError(null); }}
                    className={`py-2 rounded-xl transition-all ${
                      effectiveTab === 'quick' 
                        ? 'bg-[#2E7D32] text-white shadow-sm' 
                        : 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/50'
                    }`}
                  >
                    ⭐ Quick Select Role
                  </button>
                </div>
              )}

              {/* Redirect / Auth Success Notice */}
              {redirectNotice && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 font-bold flex items-center gap-2.5 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{redirectNotice}</span>
                </div>
              )}

              {/* Login Error Alert */}
              {loginError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 font-semibold flex items-center gap-2.5 shadow-2xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Tab 1: Username & Password Login Form */}
              {effectiveTab === 'credentials' && (
                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  {/* Username Field */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Username or Email
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-3.5 text-[#2E7D32] shrink-0">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder="Enter username (e.g. RL TAKMIL)"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 focus:border-[#43A047] focus:bg-white rounded-2xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 transition-all shadow-2xs placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                        Password
                      </label>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Default: 123
                      </span>
                    </div>
                    <div className="relative">
                      <div className="absolute left-3.5 top-3.5 text-[#2E7D32] shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Enter password (e.g. 123)"
                        className="w-full pl-10 pr-10 py-3 bg-slate-50/80 border border-slate-200 focus:border-[#43A047] focus:bg-white rounded-2xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 transition-all shadow-2xs placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-[#2E7D32] transition p-0.5 rounded-md"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded-md border-slate-300 text-[#2E7D32] focus:ring-[#2E7D32] cursor-pointer"
                      />
                      <span>Remember Me</span>
                    </label>

                    <span className="text-slate-500 hover:text-[#2E7D32] text-[11px] font-medium cursor-pointer">
                      Forgot Password?
                    </span>
                  </div>

                  {/* Login Button with Rich Green Gradient matching input_file_1.png */}
                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="w-full py-3.5 px-6 bg-gradient-to-r from-[#2E7D32] via-[#388E3C] to-[#43A047] hover:from-[#1B5E20] hover:to-[#2E7D32] active:scale-[0.99] text-white font-black text-sm rounded-2xl transition-all duration-200 shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-75 tracking-wider uppercase"
                  >
                    {isAuthenticating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <span>LOGIN</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  {/* Center Leaf Accent Divider */}
                  <div className="flex justify-center pt-1">
                    <span className="text-emerald-600 text-sm animate-bounce">🍃</span>
                  </div>
                </form>
              )}

              {/* Tab 2: Quick Select Role (Super Admin) */}
              {effectiveTab === 'quick' && isSuperAdmin && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search user account by name..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#43A047] outline-none"
                  />

                  {/* Role filter pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-bold no-scrollbar">
                    <button
                      onClick={() => setRoleFilter('all')}
                      className={`px-2.5 py-1 rounded-xl transition whitespace-nowrap ${
                        roleFilter === 'all' ? 'bg-[#2E7D32] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All ({defaultAccounts.length})
                    </button>
                    <button
                      onClick={() => setRoleFilter('admin')}
                      className={`px-2.5 py-1 rounded-xl transition whitespace-nowrap ${
                        roleFilter === 'admin' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                      }`}
                    >
                      Admin
                    </button>
                    <button
                      onClick={() => setRoleFilter('purchaser')}
                      className={`px-2.5 py-1 rounded-xl transition whitespace-nowrap ${
                        roleFilter === 'purchaser' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      Purchaser
                    </button>
                    <button
                      onClick={() => setRoleFilter('warehouse')}
                      className={`px-2.5 py-1 rounded-xl transition whitespace-nowrap ${
                        roleFilter === 'warehouse' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      Receiver
                    </button>
                    <button
                      onClick={() => setRoleFilter('dispatch')}
                      className={`px-2.5 py-1 rounded-xl transition whitespace-nowrap ${
                        roleFilter === 'dispatch' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      Dispatch
                    </button>
                  </div>

                  {/* Scrollable User List */}
                  <div className="overflow-y-auto pr-1 space-y-2 max-h-[220px]">
                    {filteredAccounts.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No accounts matching search.
                      </div>
                    ) : (
                      filteredAccounts.map((u, idx) => (
                        <button
                          key={u.id ? `${u.id}-${idx}` : `u-${idx}`}
                          onClick={() => handleQuickLogin(u)}
                          className="w-full p-2.5 bg-emerald-50/40 hover:bg-emerald-100/60 border border-emerald-100/80 hover:border-emerald-300 rounded-2xl text-left flex items-center justify-between transition group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 bg-white rounded-xl shadow-2xs border border-emerald-100 shrink-0">
                              {u.avatar ? (
                                <img src={u.avatar} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                              ) : (
                                getRoleIcon(u.role)
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 group-hover:text-[#2E7D32] truncate flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {u.isSuperAdmin && (
                                  <span className="px-1.5 py-0.2 bg-gradient-to-r from-amber-500 to-emerald-600 text-white text-[9px] font-extrabold rounded-md tracking-wider uppercase shrink-0">
                                    ⭐ Super Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 capitalize truncate">{u.role} ({u.username || 'user'})</div>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-[#2E7D32] group-hover:underline shrink-0 ml-2">Select</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* 4 Value Proposition Badges matching input_file_1.png */}
              <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100">
                <div className="p-2 bg-emerald-50/60 border border-emerald-100 rounded-xl text-center flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#2E7D32] flex items-center justify-center text-xs font-black mb-1">
                    🍃
                  </div>
                  <span className="text-[10px] font-black text-slate-900 block leading-none">FRESH</span>
                  <span className="text-[8px] font-medium text-slate-500 block leading-tight mt-0.5">Always Fresh</span>
                </div>

                <div className="p-2 bg-emerald-50/60 border border-emerald-100 rounded-xl text-center flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#2E7D32] flex items-center justify-center text-xs font-black mb-1">
                    🛡️
                  </div>
                  <span className="text-[10px] font-black text-slate-900 block leading-none">QUALITY</span>
                  <span className="text-[8px] font-medium text-slate-500 block leading-tight mt-0.5">Premium Quality</span>
                </div>

                <div className="p-2 bg-emerald-50/60 border border-emerald-100 rounded-xl text-center flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#2E7D32] flex items-center justify-center text-xs font-black mb-1">
                    🤝
                  </div>
                  <span className="text-[10px] font-black text-slate-900 block leading-none">TRUST</span>
                  <span className="text-[8px] font-medium text-slate-500 block leading-tight mt-0.5">100% Trusted</span>
                </div>

                <div className="p-2 bg-emerald-50/60 border border-emerald-100 rounded-xl text-center flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#2E7D32] flex items-center justify-center text-xs font-black mb-1">
                    🚚
                  </div>
                  <span className="text-[10px] font-black text-slate-900 block leading-none">DELIVERY</span>
                  <span className="text-[8px] font-medium text-slate-500 block leading-tight mt-0.5">On-Time Delivery</span>
                </div>
              </div>

              {/* Install Mobile App Banner / Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsInstallModalOpen(true)}
                  className="w-full py-2.5 px-3.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-emerald-700 hover:from-blue-600 hover:to-emerald-600 text-white font-extrabold text-xs rounded-2xl flex items-center justify-between shadow-md hover:shadow-lg transition active:scale-98 cursor-pointer border border-blue-400/30"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/20 rounded-xl">
                      <Smartphone className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <span className="block font-extrabold leading-tight">Install Mobile App</span>
                      <span className="block text-[9.5px] font-medium text-blue-100">Android & iOS Home Screen App</span>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-xl text-[10px] font-black flex items-center gap-1 uppercase tracking-wide">
                    <Download className="w-3 h-3" />
                    <span>Install</span>
                  </div>
                </button>
              </div>

              {/* Footer matching input_file_1.png */}
              <div className="pt-2 border-t border-slate-100 text-center">
                <p className="text-[11px] font-black text-slate-800 tracking-wide">
                  © 2025 RL FOOD COMPANY
                </p>
                <p className="text-[10px] font-bold text-[#2E7D32] flex items-center justify-center gap-1.5 mt-0.5">
                  <span>Fresh</span>
                  <span className="text-emerald-400">•</span>
                  <span>Quality</span>
                  <span className="text-emerald-400">•</span>
                  <span>Trust</span>
                </p>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}

      {/* MOBILE APP INSTALLATION MODAL */}
      {isInstallModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 text-slate-900 overflow-y-auto"
          onClick={() => setIsInstallModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 my-8 animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-md">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">Install Mobile App</h3>
                  <p className="text-xs text-slate-500 font-medium">RL Food Purchase Tracking System PWA App</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsInstallModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Direct One-Click Install Button if supported */}
            {deferredPrompt ? (
              <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm">One-Click Installation Available!</h4>
                    <p className="text-xs text-blue-100">Direct PWA install supported on your browser.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTriggerInstall}
                    className="px-4 py-2 bg-white text-blue-700 font-extrabold text-xs rounded-xl shadow-md hover:bg-blue-50 transition active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install Now</span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* Detailed Instructions for Android & iOS */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                Step-by-Step Installation Guide
              </h4>

              {/* Android Chrome */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] shrink-0">1</span>
                  <span>Android (Google Chrome Browser):</span>
                </div>
                <ol className="text-xs text-slate-600 space-y-1.5 pl-7 list-disc font-medium">
                  <li>Open this website in <strong>Google Chrome Browser</strong> on your Android phone.</li>
                  <li>Tap the <strong>3 dots menu (⋮)</strong> in the top-right corner.</li>
                  <li>Select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.</li>
                  <li>An app icon will be added to your mobile home screen.</li>
                </ol>
              </div>

              {/* iPhone Safari */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] shrink-0">2</span>
                  <span>iPhone / iOS (Safari Browser):</span>
                </div>
                <ol className="text-xs text-slate-600 space-y-1.5 pl-7 list-disc font-medium">
                  <li>Open this link in <strong>Safari Browser</strong> on your iPhone.</li>
                  <li>Tap the <strong>Share</strong> button (<Share className="w-3 h-3 inline text-blue-600" />) at the bottom toolbar.</li>
                  <li>Scroll down and tap <strong>"Add to Home Screen" (+)</strong>.</li>
                  <li>Tap <strong>Add</strong> in the top-right corner.</li>
                </ol>
              </div>

              {/* Offline & App Benefits */}
              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100 space-y-1 text-xs text-blue-900">
                <span className="font-bold block text-blue-950">💡 App Features:</span>
                <p className="text-slate-700 leading-relaxed">
                  Once installed, the application runs full-screen like a native app without requiring Play Store or App Store downloads, with fast offline support!
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(false)}
                className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

