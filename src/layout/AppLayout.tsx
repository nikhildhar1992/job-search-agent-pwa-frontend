import { NavLink, Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="app-frame">
      <header className="top-nav">
        <div className="top-nav-inner">
          <p className="top-nav-brand">Job Search Agent</p>
          <nav className="top-nav-links" aria-label="Main navigation">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `top-nav-link${isActive ? " is-active" : ""}`}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/search"
              className={({ isActive }) => `top-nav-link${isActive ? " is-active" : ""}`}
            >
              Search Job
            </NavLink>
          </nav>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
