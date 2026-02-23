import './App.css'
import { App as AntdApp } from 'antd'
import { AppRouter } from './router/index.jsx'

function App() {
  return (
    <AntdApp>
      <div className="app-root">
        <AppRouter />
      </div>
    </AntdApp>
  )
}

export default App
