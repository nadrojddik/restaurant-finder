import React from 'react'
import ReactDOM from 'react-dom'
import App from './App.jsx'
import './index.css'

console.log('main.jsx loading...')
console.log('React version:', React.version)
console.log('Environment variables:', import.meta.env)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)