import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const AdminRoute = ({ userInfo }) => {
    // Если информация о пользователе еще не загрузилась, можно показать заглушку или просто перенаправить
    if (!userInfo) {
        // Это может произойти на мгновение при перезагрузке страницы, пока идет запрос /me
        return <Navigate to="/" />; 
    }

    // Главная проверка: если роль пользователя 'admin', показываем дочерний компонент (через <Outlet />).
    // В противном случае - перенаправляем на его обычный дашборд.
    return userInfo.role === 'admin' ? <Outlet /> : <Navigate to="/dashboard" />;
};

export default AdminRoute;