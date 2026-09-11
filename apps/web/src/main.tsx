import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { api } from './api';
import { AgendaPage } from './pages/AgendaPage';
import { CreateEventPage } from './pages/CreateEventPage';
import { EventPage } from './pages/EventPage';
import { RegisterPage } from './pages/RegisterPage';
import './styles.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10000 }, mutations: { retry: false } } });
function App() {
  const config = useQuery({ queryKey: ['config'], queryFn: api.config });
  return <><a className="skip-link" href="#main">Skip to content</a><header className="site-header"><div className="header-inner"><Link to="/" className="brand"><span className="brand-mark" aria-hidden="true">T</span>tabletop<span className="brand-dot">.</span></Link><span className="store-name">{config.data?.store.name ?? 'Organized play'}</span><Link className="nav-link" to="/">Calendar</Link></div></header><main id="main"><Routes><Route path="/" element={<AgendaPage/>}/><Route path="/events/new" element={<CreateEventPage/>}/><Route path="/events/:id" element={<EventPage/>}/><Route path="/events/:id/register" element={<RegisterPage/>}/><Route path="*" element={<><h1>Page not found</h1><Link to="/">Back to calendar</Link></>}/></Routes></main><footer>Good games start around a table.</footer></>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><QueryClientProvider client={queryClient}><BrowserRouter><App/></BrowserRouter></QueryClientProvider></React.StrictMode>);
