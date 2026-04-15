import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Login from '../pages/Login.jsx'
import Register from '../pages/Register.jsx'
import HotelEdit from '../pages/HotelEdit.jsx'
import HotelReviewList from '../pages/HotelReviewList.jsx'
import HotelList from '../pages/HotelList.jsx'
import MerchantLayout from '../layouts/MerchantLayout.jsx'
import AdminLayout from '../layouts/AdminLayout.jsx'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 商户端布局 + 子路由 */}
        <Route path="/merchant" element={<MerchantLayout />}>
          <Route index element={<HotelList />} />
          <Route path="hotels" element={<HotelList />} />
          <Route path="hotels/new" element={<HotelEdit />} />
          <Route path="hotels/:id" element={<HotelEdit />} />
        </Route>

        {/* 管理员端布局 + 子路由 */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/review" replace />} />
          <Route path="review" element={<HotelReviewList />} />
        </Route>

        {/* 向下兼容旧地址，直接跳到管理员审核 */}
        <Route path="/hotel/review" element={<Navigate to="/admin/review" replace />} />

        {/* 兼容旧地址，暂时保留直达编辑页 */}
        <Route path="/hotel/edit" element={<HotelEdit />} />

        {/* 演示部署先进登录页选角色；本地默认进登录 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

