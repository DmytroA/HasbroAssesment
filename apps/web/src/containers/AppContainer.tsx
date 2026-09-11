import { useQuery } from '@tanstack/react-query';
import { Link, Route, Routes } from 'react-router-dom';
import { api } from '../helpers/api';
import { AgendaPage } from '../pages/AgendaPage';
import { CreateEventPage } from '../pages/CreateEventPage';
import { EventPage } from '../pages/EventPage';
import { RegisterPage } from '../pages/RegisterPage';

export function AppContainer() {
  const config = useQuery({ queryKey: ['config'], queryFn: api.config });
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand">
            <img className="brand-mark" src="/calendar.svg" alt="" width="40" height="40" />
            <span className="brand-name">Game Event Calendar</span>
          </Link>
          <span className="store-name">{config.data?.store.name ?? 'Organized play'}</span>
          <Link className="nav-link" to="/">
            Calendar
          </Link>
        </div>
      </header>
      <main id="main">
        <Routes>
          <Route path="/" element={<AgendaPage />} />
          <Route path="/events/new" element={<CreateEventPage />} />
          <Route path="/events/:id" element={<EventPage />} />
          <Route path="/events/:id/register" element={<RegisterPage />} />
          <Route
            path="*"
            element={
              <>
                <h1>Page not found</h1>
                <Link to="/">Back to calendar</Link>
              </>
            }
          />
        </Routes>
      </main>
      <footer>Good games start around a table.</footer>
    </>
  );
}
