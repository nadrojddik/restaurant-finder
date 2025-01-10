// src/App.jsx
import React from 'react';
import RestaurantFinder from './components/RestaurantFinder';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <RestaurantFinder />
    </div>
  );
}

export default App;

// src/components/RestaurantFinder.jsx
// [Previous RestaurantFinder component code goes here]

// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/restaurant-finder/', // Update this to match your repository name
})

// .gitignore
node_modules
dist
.env
.env.local

// package.json additions
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
