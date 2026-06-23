import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import 'core-js'

import App from './App'
import store from './store'
import { AuthProvider } from './context/AuthContext'
import { I18nProvider } from './i18n'
import './scss/ibm-theme.css'

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <I18nProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </I18nProvider>
  </Provider>,
)
