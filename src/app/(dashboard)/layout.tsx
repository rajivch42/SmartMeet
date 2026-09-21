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
  HelpCircle,
  Calendar,
  PlusCircle,
  LogOut,
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
    { href: '/tasks', label: 'Task Tracker', icon: CheckSquare },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <DashboardProvider>
      <div className="app-shell">
        {/* Left Sub-Navigation Sidebar (Collapses to Icon Rail on Tablet) */}
        <aside className="app-sidebar">
          {/* Brand Header (Converge AI / AutoSync Meet) */}
          <Link
            href="/dashboard"
            className="brand-container"
            style={{
              padding: '1.25rem var(--space-6)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              textDecoration: 'none',
            }}
          >
            <div
              className="brand-logo-container"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '9px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.09)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <div className="node-pulse-dot" style={{ width: '7px', height: '7px' }} />
            </div>
            <div className="sidebar-text">
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                AutoSync <span style={{ color: 'var(--blue)' }}>Meet</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>BY CONVERGE AI</div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav
            style={{
              padding: '1.25rem var(--space-3)',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-1)',
            }}
          >
            <div
              className="sidebar-heading"
              style={{
                padding: '0 var(--space-3) var(--space-2)',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`app-sidebar-nav-item ${isActive ? 'active' : ''}`}
                  title={item.label}
                >
                  <Icon
                    size={18}
                    className="sidebar-icon"
                    style={{
                      color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                      flexShrink: 0,
                    }}
                  />
                  <span className="sidebar-text">{item.label}</span>
                </Link>
              );
            })}

            <div
              className="sidebar-heading"
              style={{
                marginTop: 'var(--space-6)',
                padding: '0 var(--space-3) var(--space-2)',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              Modules
            </div>

            {/* Disabled Phase 2 Peer-Help UI placeholder per Spec */}
            <div
              className="app-sidebar-nav-item"
              style={{
                cursor: 'not-allowed',
                opacity: 0.6,
                justifyContent: 'space-between',
              }}
              title="Anonymous Peer Help is scheduled for Phase 2"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <HelpCircle size={18} style={{ flexShrink: 0 }} />
                <span className="sidebar-text">Peer Help</span>
              </div>
              <span
                className="badge badge-warning sidebar-text"
                style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}
              >
                Phase 2
              </span>
            </div>
          </nav>

          {/* User / Sign Out Footer */}
          <div
            className="user-footer"
            style={{
              padding: 'var(--space-4) var(--space-5)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                overflow: 'hidden',
                minWidth: 0,
              }}
            >
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name || 'User'}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border-default)',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    flexShrink: 0,
                  }}
                >
                  {(currentUser?.name || currentUser?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="user-details" style={{ overflow: 'hidden', minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    color: 'var(--text-primary)',
                  }}
                  title={currentUser?.name || 'Engineering Demo'}
                >
                  {currentUser?.name || 'Engineering Demo'}
                </div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                  title={currentUser?.email || 'team@company.internal'}
                >
                  {currentUser?.email || 'team@company.internal'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out"
              className="btn btn-secondary btn-sm sidebar-text"
              style={{
                padding: '0.35rem',
                borderRadius: 'var(--radius-sm)',
                flexShrink: 0,
                color: 'var(--text-muted)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--status-danger)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>

        {/* Main Content Pane */}
        <div
          className="main-content-pane"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}
        >
          {/* Top Header Bar (v2.2 Architecture) */}
          <header className="app-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span className="node-pulse-dot" title="Recall.ai Bot Engine Standby Ready" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Recall.ai Bot Engine: <strong style={{ color: 'var(--text-primary)' }}>Standby Ready</strong>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Link href="/dashboard" className="btn btn-secondary btn-sm">
                <Calendar size={14} color="var(--brand-google)" /> Sync Calendar
              </Link>
              <Link href="/meetings" className="btn btn-primary btn-sm">
                <PlusCircle size={14} /> Dispatch Bot
              </Link>
            </div>
          </header>

          {/* Page Content Centered in 1280px Container with Workstation Shell */}
          <main style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6) 0' }}>
            <div className="app-container">
              <div className="app-page-shell">{children}</div>
            </div>
          </main>
        </div>

        {/* Mobile Bottom Tab Bar (< 640px) */}
        <nav className="app-bottom-bar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-bottom-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </DashboardProvider>
  );
}
