import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Login from '../pages/Login.jsx'
import Register from '../pages/Register.jsx'
import HotelEdit from '../pages/HotelEdit.jsx'
import HotelReviewList from '../pages/HotelReviewList.jsx'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/hotel/edit" element={<HotelEdit />} />
        <Route path="/hotel/review" element={<HotelReviewList />} />
        {/* 默认跳到登录页，后续可按登录态调整 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

