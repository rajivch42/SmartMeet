'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  Video,
  CheckSquare,
  Settings,
  Bot,
  LogOut,
  Activity,
} from 'lucide-react';
import { DashboardProvider } from '@/lib/context/DashboardContext';

interface AuthUserData {
  email?: string;
  name?: string;
  avatarUrl?: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUserData | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const metadata = data.user.user_metadata || {};
        setCurrentUser({
          email: data.user.email,
          name: metadata.full_name || metadata.name || data.user.email?.split('@')[0],
          avatarUrl: metadata.avatar_url || metadata.picture,
        });
      }
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const metadata = session.user.user_metadata || {};
        setCurrentUser({
          email: session.user.email,
          name: metadata.full_name || metadata.name || session.user.email?.split('@')[0],
          avatarUrl: metadata.avatar_url || metadata.picture,
        });
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore sign-out errors
    }
    document.cookie = 'demo_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/meetings', label: 'Meetings', icon: Video },
    { href: '/tasks', label: 'Task tracker', icon: CheckSquare },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <DashboardProvider>
      <div className="dash-shell">
        {/* Left Vertical Sidebar matching Reference Image */}
        <aside className="dash-sidebar">
          {/* Brand Header */}
          <Link href="/dashboard" className="dash-brand-block">
            <div className="dash-brand-icon">
              <Bot size={18} color="#FFFFFF" />
            </div>
            <span className="dash-brand-name">AutoSync Meet</span>
          </Link>

          {/* Nav Items Stack */}
          <nav className="dash-nav-menu">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`dash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} className="dash-nav-icon" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Pinned Widget: Active Bot Status (Connected) */}
          <div className="dash-sidebar-footer">
            <div className="dash-bot-status-card">
              <div className="dash-bot-status-icon">
                <Activity size={14} color="#60A5FA" />
              </div>
              <div className="dash-bot-status-meta">
                <span className="dash-bot-status-title">Active Bot Status</span>
                <span className="dash-bot-status-state">
                  <span className="dash-status-dot-green" /> Connected
                </span>
              </div>
            </div>

            {/* User Row with Logout */}
            <div className="dash-user-bar">
              <div className="dash-user-info" title={currentUser?.email || 'User'}>
                <div className="dash-user-avatar">
                  {(currentUser?.name || currentUser?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="dash-user-name">
                  {currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign Out"
                className="dash-logout-btn"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Workspace Canvas */}
        <div className="dash-main-pane">
          <main className="dash-main-scroll">
            <div className="dash-page-container">{children}</div>
          </main>
        </div>
      </div>
    </DashboardProvider>
  );
}
