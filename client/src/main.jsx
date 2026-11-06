import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LearnPage from './pages/LearnPage';
import QuizPage from './pages/QuizPage';
import GamesPage from './pages/GamesPage';
import ProgressPage from './pages/ProgressPage';
import TeacherPage from './pages/TeacherPage';
import './styles.css';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/belajar" element={<LearnPage />} />
          <Route path="/kuis" element={<QuizPage />} />
          <Route path="/permainan" element={<GamesPage />} />
          <Route path="/progres" element={<ProgressPage />} />
          <Route path="/guru" element={<TeacherPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
