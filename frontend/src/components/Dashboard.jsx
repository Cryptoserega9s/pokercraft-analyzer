import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api';

import DashboardHeader from './DashboardHeader';
import StatsGrid from './StatsGrid';
import FilterPanel from './FilterPanel';
import FileUpload from './FileUpload';
import ChartsView from './ChartsView';
import TableView from './TableView';

// --- ХУК ДЛЯ "АНТИ-ДРЕБЕЗГА" ---
// Позволяет избежать отправки запроса на каждое изменение фильтра
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

// Начальное состояние для всех фильтров
const INITIAL_FILTERS = {
    buyin: '', 
    place: '', 
    startDate: '', 
    endDate: '', 
    dayOfWeek: '',
    startTime: '', // Формат "ЧЧ:ММ"
    endTime: '',   // Формат "ЧЧ:ММ"
    includeRakeback: false, 
    rakebackPercentage: 30
};

function Dashboard({ onLogout }) {
    const { t } = useTranslation();

    // --- ОСНОВНЫЕ СОСТОЯНИЯ КОМПОНЕНТА ---
    const [userInfo, setUserInfo] = useState({ email: '' });
    const [overallStats, setOverallStats] = useState({});
    const [filteredStats, setFilteredStats] = useState({});
    
    // Данные для отображения (разделены для производительности)
    const [tableTournaments, setTableTournaments] = useState([]); // Для таблицы (постранично)
    const [chartTournaments, setChartTournaments] = useState([]); // Для графиков (все отфильтрованные)
    
    // Управление фильтрами и таблицей
    const [filters, setFilters] = useState(INITIAL_FILTERS);
    const debouncedFilters = useDebounce(filters, 500); // Применяем debounce с задержкой в 500мс
    const [sort, setSort] = useState({ field: 'start_time', direction: 'desc' });
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalCount: 0 });
    const [tournamentsPerPage, setTournamentsPerPage] = useState(10);
    
    // Состояния интерфейса
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [currentView, setCurrentView] = useState('charts');


    // --- ЛОГИКА ЗАГРУЗКИ ДАННЫХ ---

    // Единая функция для загрузки данных
    const fetchData = useCallback(async (isFilterChange = false) => {
        setIsLoading(true);
        try {
            // Если это изменение фильтра, сбрасываем страницу на первую
            const currentPage = isFilterChange ? 1 : pagination.currentPage;

            // Параметры для таблицы (с пагинацией)
            const tableParams = {
                ...debouncedFilters,
                page: currentPage,
                limit: tournamentsPerPage,
                sortField: sort.field,
                sortDirection: sort.direction,
            };

            // Запросы, которые выполняются всегда
            const requests = [
                apiClient.get('/api/data', { params: tableParams }),
                apiClient.get('/api/data/stats', { params: debouncedFilters })
            ];
            
            // Если это изменение фильтра, дополнительно запрашиваем все данные для графиков
            if (isFilterChange) {
                const chartParams = {
                    ...debouncedFilters,
                    sortField: 'start_time',
                    sortDirection: 'asc',
                    limit: 10000,
                    page: 1,
                };
                requests.push(apiClient.get('/api/data', { params: chartParams }));
            }
            
            const [tableResponse, statsResponse, chartResponse] = await Promise.all(requests);
            
            // Обновляем данные таблицы
            setTableTournaments(tableResponse.data.data);
            setPagination({
                currentPage,
                totalPages: tableResponse.data.totalPages,
                totalCount: tableResponse.data.total
            });
            
            // Обновляем статистику
            setFilteredStats(statsResponse.data);

            // Если был запрос для графиков, обновляем их
            if (chartResponse) {
                setChartTournaments(chartResponse.data.data);
            }

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
            if(isInitialLoad) setIsInitialLoad(false);
        }
    }, [debouncedFilters, pagination.currentPage, tournamentsPerPage, sort, isInitialLoad]);


    // Первоначальная загрузка всех данных
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                 const [userRes, overallStatsRes, chartRes, tableRes] = await Promise.all([
                    apiClient.get('/api/auth/me'),
                    apiClient.get('/api/data/stats'),
                    apiClient.get('/api/data', { params: { sortField: 'start_time', sortDirection: 'asc', limit: 10000, page: 1 } }),
                    apiClient.get('/api/data', { params: { sortField: 'start_time', sortDirection: 'desc', limit: tournamentsPerPage, page: 1 } })
                ]);
                
                if (userRes.data?.user) setUserInfo(userRes.data.user);
                setOverallStats(overallStatsRes.data);
                setFilteredStats(overallStatsRes.data);
                setChartTournaments(chartRes.data.data);
                setTableTournaments(tableRes.data.data);
                setPagination({
                    currentPage: 1,
                    totalPages: tableRes.data.totalPages,
                    totalCount: tableRes.data.total,
                });
            } catch (error) {
                console.error("Error loading initial data:", error);
            } finally {
                setIsLoading(false);
                setIsInitialLoad(false);
            }
        };
        loadInitialData();
    }, []); // Выполняется один раз


    // Этот useEffect срабатывает при изменении debouncedFilters (т.е. после задержки)
    useEffect(() => {
        if (!isInitialLoad) {
            fetchData(true); // true означает, что это изменение фильтра
        }
    }, [debouncedFilters, isInitialLoad]);
    
    // Этот useEffect срабатывает при смене страницы, сортировки или кол-ва на странице
    useEffect(() => {
        if (!isInitialLoad) {
             fetchData(false); // false означает, что это не изменение фильтра
        }
    }, [pagination.currentPage, sort, tournamentsPerPage]);


    // --- ОБРАБОТЧИКИ СОБЫТИЙ ---
    
    const handleFilterChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFilters(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        // Не сбрасываем пагинацию здесь, это произойдет при вызове fetchData
    };
    
    const resetFilters = () => {
        setFilters(INITIAL_FILTERS);
    };

    const handleSort = (field) => {
        setPagination(p => ({ ...p, currentPage: 1 }));
        setSort(s => ({ field, direction: (s.field === field && s.direction === 'asc') ? 'desc' : 'asc' }));
    };

    const handlePageChange = (pageNumber) => {
        setPagination(prev => ({ ...prev, currentPage: pageNumber }));
    };

    const handlePerPageChange = (e) => {
        setPagination(prev => ({ ...prev, currentPage: 1 }));
        setTournamentsPerPage(Number(e.target.value));
    };
    
    const handleUploadSuccess = () => {
        alert(t('dashboard.upload.successMessage'));
        window.location.reload();
    }
    
    // --- ВСПОМОГАТЕЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ РЕНДЕРА ---
    
    const areFiltersApplied = JSON.stringify(debouncedFilters) !== JSON.stringify(INITIAL_FILTERS);
    const statsTitle = areFiltersApplied ? t('dashboard.stats.titleFiltered') : t('dashboard.stats.titleOverall');
    const statsSubtitle = areFiltersApplied 
        ? t('dashboard.stats.subtitle', { count: pagination.totalCount || 0, total: overallStats.totalTournaments || 0 }) 
        : '';
    const noDataAtAll = !overallStats || overallStats.totalTournaments === 0;

    return (
        <div className="dashboard">
            <DashboardHeader onUploadSuccess={handleUploadSuccess} userInfo={userInfo} onLogout={onLogout} />
            <main className="dashboard-main">
                <div className="dashboard-content">
                    <div className="dashboard-top-panel">
                         <div className="dashboard-top-panel-main">
                            <FilterPanel
                                filters={filters}
                                onFilterChange={handleFilterChange}
                                onResetFilters={resetFilters}
                            />
                            <StatsGrid 
                                stats={areFiltersApplied ? filteredStats : overallStats} 
                                title={statsTitle}
                                subtitle={statsSubtitle}
                                showRakeback={filters.includeRakeback} 
                            />
                        </div>
                       
                    </div>
                    
                    <div className="main-content-wrapper">
                        <div className="view-toggle">
                            <button className={`view-toggle-btn ${currentView === 'charts' ? 'active' : ''}`} onClick={() => setCurrentView('charts')}>{t('dashboard.viewToggle.charts')}</button>
                            <button className={`view-toggle-btn ${currentView === 'table' ? 'active' : ''}`} onClick={() => setCurrentView('table')}>{t('dashboard.viewToggle.table')}</button>
                        </div>

                        <div className="main-content">
                            {isLoading && <div className="loading-overlay">{t('loading')}</div>}
                            
                            {noDataAtAll && !isLoading && (
                                <div className="table-empty-state">{t('dashboard.noData')}</div>
                            )}

                            {!noDataAtAll && !isLoading && (
                                (currentView === 'charts' && chartTournaments.length > 0) ? (
                                    <ChartsView tournaments={chartTournaments} filters={filters}/>
                                ) : (currentView === 'table' && tableTournaments.length > 0) ? (
                                    <TableView
                                        tournaments={tableTournaments}
                                        sort={sort} onSort={handleSort}
                                        pagination={pagination} onPageChange={handlePageChange}
                                        tournamentsPerPage={tournamentsPerPage} onPerPageChange={handlePerPageChange}
                                    />
                                ) : (
                                     <div className="table-empty-state">{t('dashboard.noDataForFilter')}</div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Dashboard;