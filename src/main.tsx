import React from 'react';
import ReactDOM from 'react-dom/client';
import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom';
import './styles/index.css';
import { Shell } from './components/Shell';
import { FacilityLadder } from './pages/FacilityLadder';
import { GapRegister } from './pages/GapRegister';
import { GapDetail } from './pages/GapDetail';
import { NotFound } from './pages/NotFound';

// Hash routing: no server rewrites needed, so dist/ works on a Netlify
// drag-and-drop deploy and when opened from a local folder.
const router = createHashRouter([
  {
    element: <Shell />,
    children: [
      { path: '/', element: <Navigate to="/facility/GC-24?period=2027-Q2" replace /> },
      { path: '/facility/:id', element: <FacilityLadder /> },
      { path: '/gaps', element: <GapRegister /> },
      { path: '/gaps/:id', element: <GapDetail /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
