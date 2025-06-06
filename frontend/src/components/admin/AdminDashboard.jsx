import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/api';
// Мы можем переиспользовать стили от вашей основной таблицы.
// Оставляем только этот импорт, он содержит все, что нам нужно.
import '../Dashboard.css'; 

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await apiClient.get('/api/admin/users');
                setUsers(response.data.data);
            } catch (err) {
                console.error("Failed to fetch users:", err);
                setError('Не удалось загрузить список пользователей. Попробуйте обновить страницу.');
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ru-RU');
    };

    if (loading) {
        return (
            <div className="dashboard" style={{ padding: '20px' }}>
                <div className="loading-overlay" style={{ position: 'static', background: 'transparent', color: 'white' }}>
                    Загрузка пользователей...
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="dashboard" style={{ padding: '20px' }}>
                <div className="error-message">{error}</div>
            </div>
        );
    }

    return (
        <div className="dashboard" style={{ padding: '20px' }}>
            <div className="dashboard-content">
                <h1 style={{ color: 'white', marginBottom: '20px' }}>Панель администратора</h1>
                <div className="main-content-wrapper">
                    <h2 style={{ padding: '0 20px', color: 'white' }}>Список пользователей ({users.length})</h2>
                    <div className="tournament-table-container">
                        <table className="tournament-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Email</th>
                                    <th>Роль</th>
                                    <th>Дата регистрации</th>
                                    <th>Турниров</th>
                                    <th>Общий Net Profit</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>{user.id}</td>
                                        <td>{user.email}</td>
                                        <td>
                                            <span style={{ 
                                                color: user.role === 'admin' ? '#f1c40f' : '#ecf0f1',
                                                fontWeight: user.role === 'admin' ? 'bold' : 'normal'
                                            }}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>{formatDate(user.registrationDate)}</td>
                                        <td>{user.tournamentsCount}</td>
                                        <td className={user.totalNetProfit > 0 ? 'positive-value' : user.totalNetProfit < 0 ? 'negative-value' : ''}>
                                            ${(user.totalNetProfit || 0).toFixed(2)}
                                        </td>
                                        <td>
                                            <Link to={`/admin/users/${user.id}`} style={{ color: '#4C6EF5', textDecoration: 'none' }}>
                                                Посмотреть детали
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;