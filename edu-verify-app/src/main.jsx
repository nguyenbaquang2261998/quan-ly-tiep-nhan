import React from 'react'
import ReactDOM from 'react-dom/client'
import App, { AppWrapper } from './App.jsx'
import './index.css' // Đảm bảo dòng này có để Tailwind hoạt động

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>,
)