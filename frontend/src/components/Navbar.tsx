import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ghost } from "./ui";

const link = ({ isActive }: { isActive: boolean }) =>
  `app-nav-link ${isActive ? "text-amber-400" : ""}`;

export default function Navbar() {
  const { signOut, user, isAdmin } = useAuth();
  return (
    <header className="app-header sticky top-0 z-10 flex min-h-16 flex-wrap items-center justify-between gap-2 border-b px-5 py-3 sm:px-8">
      <Link to="/" className="auth-brand text-base">
        <span className="auth-brand-mark" aria-hidden>BB</span>ByteBattles
      </Link>
      <nav className="flex flex-wrap items-center gap-4 text-sm">
        <NavLink to="/" end className={link}>Problems</NavLink>
        {isAdmin && <NavLink to="/admin" className={link}>Admin</NavLink>}
        <NavLink to="/status" className={link}>Status</NavLink>
        {user && <NavLink to="/profile" className={link}>Profile</NavLink>}
        {user && <span className="hidden text-muted sm:inline">{user.username}</span>}
        <button onClick={signOut} className={ghost}>Log out</button>
      </nav>
    </header>
  );
}
