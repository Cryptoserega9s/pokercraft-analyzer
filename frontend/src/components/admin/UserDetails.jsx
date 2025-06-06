import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../../services/api';

// <<< ИМПОРТИРУЕМ НУЖНЫЕ КОМПОНЕНТЫ И ХУКИ >>>
import StatsGrid from '../StatsGrid'; 
import ChartsView from '../ChartsView';
import FilterPanel from '../FilterPanel'; // Ваш готовый компонент фильтров
import '../Dashboard.css';

// <<< КОПИРУЕМ ХУК ИЗ ВАШЕГО Dashboard.jsx >>>
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

// <<< КОПИРУЕМ НАЧАЛЬНОЕ СОСТОЯНИЕ ФИЛЬТРОВ ИЗ Dashboard.jsx >>>
const INITIAL_FILTERS = {
    buyin: '', place: '', timeRange: 'all', startDate: '', endDate: '', 
    dayOfWeek: '', startTime: '', endTime: '',
    includeRakeback: false, rakebackPercentage: 30
};


const UserDetails = () => {
    const { userId } = useParams();

    // Состояния для данных
    const [userStats, setUserStats] = useState(null);
    const [chartTournaments, setChartTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // <<< НОВЫЕ СОСТОЯНИЯ ДЛЯ ФИЛЬТРОВ >>>
    const [filters, setFilters] = useState(INITIAL_FILTERS);
    const debouncedFilters = useDebounce(filters, 500); // Применяем debounce

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError('');
            try {
                // <<< ДОБАВЛЯЕМ ФИЛЬТРЫ В ПАРАМЕТРЫ ЗАПРОСА >>>
                const params = { ...debouncedFilters, limit: 10000 };

                const [statsRes, tournamentsRes] = await Promise.all([
                    apiClient.get(`/api/admin/users/${userId}/stats`, { params }),
                    apiClient.get(`/api/admin/users/${userId}/tournaments`, { params })
                ]);

                setUserStats(statsRes.data.data);
                setChartTournaments(tournamentsRes.data.data);

            } catch (err) {
                console.error(`Failed to fetch details for user ${userId}:`, err);
                setError('Не удалось загрузить данные пользователя. Возможно, по заданным фильтрам нет турниров.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    // <<< ПЕРЕЗАПУСКАЕМ ЭФФЕКТ ПРИ ИЗМЕНЕНИИ ФИЛЬТРОВ >>>
    }, [userId, debouncedFilters]);

    // <<< КОПИРУЕМ ОБРАБОТЧИКИ ФИЛЬТРОВ ИЗ Dashboard.jsx >>>
    const handleFilterChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'timeRange') {
            const today = new Date();
            const toISOFormat = (d) => d.toISOString().split('T')[0];
            let newStartDate = '', newEndDate = '';

            if (value !== 'all') {
                newEndDate = toISOFormat(today);
                if (value === 'today') newStartDate = toISOFormat(today);
                else if (value === 'lastWeek') {
                    const d = new Date();
                    d.setDate(today.getDate() - 6);
                    newStartDate = toISOFormat(d);
                }
            }
            setFilters(prev => ({ ...prev, timeRange: value, startDate: newStartDate, endDate: newEndDate }));
        } else {
            setFilters(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }
    };

    const resetFilters = () => {
        setFilters(INITIAL_FILTERS);
    };


    const statsTitle = userStats?.user?.email 
        ? `Статистика игрока: ${userStats.user.email}` 
        : `Статистика игрока ID: ${userId}`;
    
    const statsSubtitle = JSON.stringify(debouncedFilters) !== JSON.stringify(INITIAL_FILTERS)
        ? `Найдено турниров: ${userStats?.totalTournaments || 0}`
        : '';
        
    return (
        <div className="dashboard">
            <main className="dashboard-main">
                <div className="dashboard-content">
                    <Link to="/admin" style={{ color: '#4C6EF5', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
                        ← Назад к списку пользователей
                    </Link>

                    {/* <<< ДОБАВЛЯЕМ ПАНЕЛЬ ФИЛЬТРОВ >>> */}
                    <FilterPanel
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onResetFilters={resetFilters}
                    />

                    {loading ? (
                         <div className="loading-overlay" style={{position: 'relative', background: 'transparent', height: '200px', color: 'white'}}>Загрузка данных...</div>
                    ) : error ? (
                        <div className="error-message">{error}</div>
                    ) : (
                        <>
                            <StatsGrid 
                                stats={userStats} 
                                title={statsTitle}
                                subtitle={statsSubtitle}
                                showRakeback={filters.includeRakeback} 
                            />

                            <div className="main-content-wrapper" style={{ marginTop: '20px' }}>
                                {chartTournaments.length > 0 ? (
                                    <ChartsView tournaments={chartTournaments} filters={filters} />
                                ) : (
                                    <div className="table-empty-state">Нет данных для отображения графиков по заданным фильтрам.</div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default UserDetails;