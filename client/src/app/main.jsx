import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from '../store/index';
import App from './App.jsx';
import './index.css';
import { ToastProvider } from '../shared/components';
const savedTheme =
  localStorage.getItem("skillssphere.theme") || "light";

document.documentElement.classList.toggle("dark", savedTheme === "dark");
document.documentElement.classList.toggle("light", savedTheme === "light");

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
