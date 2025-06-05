// frontend/src/components/Dashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import { format } from 'date-fns';
import ru from 'date-fns/locale/ru';
import enUS from 'date-fns/locale/en-US';

function Dashboard({ onLogout }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? ru : enUS;
  const navigate = useNavigate();
  
  // Состояния
  const [tournaments, setTournaments] = useState([]);
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [stats, setStats] = useState({
    totalTournaments: 0,
    filteredTournaments: 0,
    totalBuyins: 0,
    totalCommission: 0,
    totalBounties: 0,
    topBounties: 0,
    totalPrizes: 0,
    finalResult: 0,
    roi: 0,
    emptyKnockouts: 0,
    avgKnockoutPrice: 0,
    totalKnockouts: 0,
    totalRakeback: 0,
    rakebackPercentage: 30
  });
  const [isUploading, setIsUploading] = useState(false);
  const [filters, setFilters] = useState({
    buyin: '',
    place: '',
    startDate: '',
    endDate: '',
    dayOfWeek: '',
    includeRakeback: false,
    rakebackPercentage: 30
  });
  const [uploadDetails, setUploadDetails] = useState(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  // Новые состояния
  const [currentView, setCurrentView] = useState('charts'); // 'charts' или 'table'
  const [currentPage, setCurrentPage] = useState(1);
  const [tournamentsPerPage] = useState(20);
  const [sortField, setSortField] = useState('start_time');
  const [sortDirection, setSortDirection] = useState('desc');
  const [userInfo, setUserInfo] = useState({
    email: '',
    id: null
  });

  // Ссылки на элементы для графиков
  const balanceChartRef = useRef(null);
  const balanceChartInstance = useRef(null);
  const profitChartRef = useRef(null);
  const profitChartInstance = useRef(null);
  const bountiesChartRef = useRef(null);
  const bountiesChartInstance = useRef(null);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    // Проверка валидности токена и получение информации о пользователе
    const validateToken = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/data', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Если нужно получить информацию о пользователе
        try {
          const userResponse = await axios.get('http://localhost:3001/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (userResponse.data && userResponse.data.user) {
            setUserInfo(userResponse.data.user);
          }
        } catch (userError) {
          console.error('Ошибка получения данных пользователя:', userError);
          // Продолжаем работу даже если не удалось получить данные пользователя
        }
      } catch (error) {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('token');
          navigate('/');
        }
      }
    };
    
    validateToken();

    fetchTournaments();
    fetchStats();
  }, [navigate]);

  // Обновление графиков при изменении данных или фильтров
  useEffect(() => {
    if (currentView === 'charts') {
      console.log('Обновление графиков с отфильтрованными данными');
      renderBalanceChart();
      renderProfitChart();
      renderBountiesChart();
    }
  }, [stats, i18n.language, filters.includeRakeback, filters.rakebackPercentage, currentView]);

  // Общие настройки для графиков
  const getChartOptions = (title, chartData = []) => {
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: t('dashboard.charts.tournamentNumber'),
            color: '#ffffff',
            font: {
              size: 13,
              weight: 'bold'
            }
          },
          ticks: {
            color: '#ffffff',
            stepSize: Math.max(1, Math.floor(chartData.length / 15) || 1), // Автоматически вычисляем шаг для лучшего отображения
            maxRotation: 0,
            autoSkip: false, // Отключаем автопропуск для более точного контроля
            font: {
              size: 11,
              weight: 'bold'
            },
            padding: 6,
            callback: function(value) {
              // Номер турнира (начиная с 1 вместо 0)
              if (Math.floor(value) === value) {
                return value + 1;
              }
              return '';
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.15)',
            lineWidth: 0.5
          },
          border: {
            display: true,
            width: 1,
            color: 'rgba(255, 255, 255, 0.3)'
          }
        },
                  y: {
            title: {
              display: true,
              text: title === t('dashboard.charts.balance') ? t('dashboard.charts.dollars') : 
                   title === t('dashboard.charts.profit') ? t('dashboard.charts.profitDollars') : 
                   t('dashboard.charts.bountiesDollars'),
              color: '#ffffff',
              font: {
                size: 13,
                weight: 'bold'
              }
            },
            ticks: {
              color: '#ffffff',
              font: {
                size: 13,
                weight: 'bold'
              },
              callback: function(value) {
                return '$' + value;
              },
              padding: 6
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.15)',
              lineWidth: 0.5
            },
            border: {
              display: true,
              width: 1,
              color: 'rgba(255, 255, 255, 0.3)'
            }
          }
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#ffffff',
            font: {
              size: 14,
              weight: 'bold'
            },
            padding: 8,
            boxWidth: 15,
            boxHeight: 15
          },
          position: 'top',
          onClick: null // Отключаем интерактивность для лучшего восприятия
        },
        title: {
          display: true,
          text: chartData?.length > 0 ? 
            `${title} (${t('dashboard.stats.showing')} ${chartData.length} ${t('dashboard.stats.tournaments')})` : 
            `${title} (${t('dashboard.stats.noData')})`,
          color: '#ffffff',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 10
          }
        },
                  tooltip: {
            mode: 'index',
            intersect: false,
            displayColors: true,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            callbacks: {
              title: function(tooltipItems) {
                const dataPoint = tooltipItems[0];
                const tournament = dataPoint.dataset.data[dataPoint.dataIndex]?.tournament;
                if (tournament) {
                  const date = new Date(tournament.start_time);
                  return `${t('dashboard.table.date')}: ${format(date, 'yyyy-MM-dd HH:mm', { locale })}`;
                }
                return `${t('dashboard.charts.tournament')} ${dataPoint.dataIndex + 1}`;
              },
              label: function(context) {
                const value = context.parsed.y;
                if (value !== null && value !== undefined) {
                  const formattedValue = value.toLocaleString(i18n.language, {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  });
                  return `${context.dataset.label}: ${formattedValue}`;
                }
                return '';
              },
              afterLabel: function(context) {
                const tournament = context.dataset.data[context.dataIndex]?.tournament;
                if (tournament) {
                  const lines = [
                    `${t('dashboard.table.buyin')}: $${tournament.buyin_total.toFixed(2)}`,
                    `${t('dashboard.table.place')}: ${tournament.finish_place} ${tournament.finish_place <= 3 ? '🏆' : ''}`,
                  ];
                  
                  if (tournament.kills > 0) {
                    lines.push(`${t('dashboard.table.kills')}: ${tournament.kills} 💥`);
                  }
                  
                  return lines.join('\n');
                }
                return '';
              }
            },
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            },
            padding: 12,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1
          }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    };
    
    // Настройка высоты оси Y для графика баланса
    if (title === t('dashboard.charts.balance')) {
      options.scales.y.suggestedMax = function(context) {
        const values = context.chart.data.datasets[0].data.map(point => point.y);
        const max = Math.max(...values, 0);
        // Увеличиваем в два раза максимальное значение для оси Y
        return max * 2;
      };
    }
    
    return options;
  };

  // Получаем текущие турниры для отображения в таблице
  const getCurrentTournaments = () => {
    // Используем фильтрованные данные из статистики, если они доступны
    let dataToUse = tournaments;
    if (stats && stats.filteredStats && stats.filteredStats.filteredTournamentsData) {
      dataToUse = stats.filteredStats.filteredTournamentsData;
    }
    
    // Сортировка
    const sortedTournaments = [...dataToUse].sort((a, b) => {
      let valueA = a[sortField];
      let valueB = b[sortField];
      
      // Для дат преобразуем в объекты Date
      if (sortField === 'start_time') {
        valueA = new Date(valueA);
        valueB = new Date(valueB);
      }
      
      // Для числовых полей преобразуем в числа
      if (typeof valueA === 'string' && !isNaN(valueA)) {
        valueA = parseFloat(valueA);
      }
      if (typeof valueB === 'string' && !isNaN(valueB)) {
        valueB = parseFloat(valueB);
      }
      
      // Сортировка
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    // Пагинация
    const indexOfLastTournament = currentPage * tournamentsPerPage;
    const indexOfFirstTournament = indexOfLastTournament - tournamentsPerPage;
    return sortedTournaments.slice(indexOfFirstTournament, indexOfLastTournament);
  };

  // Функция для смены поля сортировки
  const handleSort = (field) => {
    if (sortField === field) {
      // Меняем направление, если поле то же самое
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Устанавливаем новое поле и направление по умолчанию
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Функция для смены страницы
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Функция получения турниров
  const fetchTournaments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const response = await axios.get('http://localhost:3001/api/data', {
        headers: { Authorization: `Bearer ${token}` },
        params: filters
      });

      if (response.data && response.data.data) {
        setTournaments(response.data.data);
        console.log('Получены отфильтрованные турниры:', response.data.data.length);
      }
    } catch (error) {
      console.error('Ошибка получения турниров:', error);
    }
  };

  // Функция получения статистики
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      // Получаем общую статистику (без применения фильтров)
      const totalResponse = await axios.get('http://localhost:3001/api/upload/stats', {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
          includeRakeback: filters.includeRakeback,
          rakebackPercentage: filters.rakebackPercentage
        }
      });

      // Получаем статистику с примененными фильтрами
      const filteredResponse = await axios.get('http://localhost:3001/api/upload/stats', {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
          ...filters,
          buyin: filters.buyin,
          place: filters.place,
          startDate: filters.startDate,
          endDate: filters.endDate,
          dayOfWeek: filters.dayOfWeek,
          includeRakeback: filters.includeRakeback,
          rakebackPercentage: filters.rakebackPercentage
        }
      });

      if (totalResponse.data && totalResponse.data.success && 
          filteredResponse.data && filteredResponse.data.success) {
        console.log("Данные общей статистики:", totalResponse.data.data);
        console.log("Данные фильтрованной статистики:", filteredResponse.data.data);
        
        // Проверяем наличие данных о турнирах для графиков
        if (filteredResponse.data.data.filteredTournamentsData) {
          console.log("Получены данные о турнирах для графиков:", 
            filteredResponse.data.data.filteredTournamentsData.length);
        }
        
        // Объединяем данные, сохраняя общую статистику и статистику по фильтру
        setStats({
          ...totalResponse.data.data,
          filteredStats: filteredResponse.data.data,
          filteredTournaments: filteredResponse.data.data.totalTournaments
        });
        
        // Обновляем графики при изменении статистики
        setTimeout(() => {
          renderBalanceChart();
          renderProfitChart();
          renderBountiesChart();
        }, 100);
      }
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
    }
  };

  // Обработчик загрузки файла
  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      console.error('Ошибка: файл не выбран');
      setUploadStatus({
        success: false,
        message: t('upload.error')
      });
      return;
    }

    if (!file.name.toLowerCase().endsWith('.html')) {
      console.error('Ошибка: файл не HTML:', file.name);
      setUploadStatus({
        success: false,
        message: t('upload.htmlRequired')
      });
      return;
    }

    console.log('Начало загрузки файла:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus(null);
    setUploadDetails(null);
    setShowDebugInfo(false);

    try {
      const formData = new FormData();
      formData.append('html', file);

      const token = localStorage.getItem('token');
      console.log('Токен аутентификации:', token ? 'присутствует' : 'отсутствует');
      
      console.log('Отправка запроса на загрузку файла...');
      const response = await axios.post('http://localhost:3001/api/upload/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      console.log('Ответ от сервера:', response.data);

      if (response.data && response.data.success) {
        console.log('Загрузка успешна. Данные:', response.data.data);
        setUploadStatus({
          success: true,
          message: t('upload.success'),
          stats: response.data.data
        });
        
        // Сохранение подробных данных об обработке
        if (response.data.detailedStats) {
          console.log('Детальная статистика:', response.data.detailedStats);
          setUploadDetails(response.data.detailedStats);
        }
        
        // Сохранение отладочной информации
        if (response.data.debugInfo) {
          console.log('Отладочная информация:', response.data.debugInfo);
          setUploadDetails(prev => ({
            ...prev,
            debugInfo: response.data.debugInfo
          }));
        }
        
        // Обновляем данные после успешной загрузки
        fetchTournaments();
        fetchStats();
      } else {
        console.error('Ошибка загрузки (из ответа сервера):', response.data);
        setUploadStatus({
          success: false,
          message: response.data.message || t('upload.error')
        });
        
        // Сохраняем информацию об ошибках парсинга, если она есть
        if (response.data.parsingErrors) {
          console.error('Ошибки парсинга:', response.data.parsingErrors);
          setUploadDetails({
            debugInfo: {
              parsingErrors: response.data.parsingErrors
            }
          });
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки (исключение):', error);
      console.error('Детали ошибки:', {
        message: error.message,
        responseStatus: error.response?.status,
        responseData: error.response?.data
      });
      
      setUploadStatus({
        success: false,
        message: error.response?.data?.message || t('upload.error')
      });
      
      // Сохраняем информацию об ошибке
      if (error.response?.data) {
        console.error('Данные ошибки с сервера:', error.response.data);
        setUploadDetails({
          debugInfo: {
            error: error.response.data
          }
        });
      }
    } finally {
      console.log('Завершение загрузки файла');
      setIsUploading(false);
    }
  };

  // Переключение отображения отладочной информации
  const toggleDebugInfo = () => {
    setShowDebugInfo(prev => !prev);
  };

  // Обработчик изменения фильтров
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFilters(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Применение фильтров
  const applyFilters = (e) => {
    e.preventDefault();
    fetchTournaments();
    fetchStats();
  };

  // Сброс фильтров
  const resetFilters = () => {
    setFilters({
      buyin: '',
      place: '',
      startDate: '',
      endDate: '',
      dayOfWeek: '',
      includeRakeback: filters.includeRakeback,
      rakebackPercentage: filters.rakebackPercentage
    });
    
    setTimeout(() => {
      fetchTournaments();
      fetchStats();
    }, 0);
  };

  // Смена языка
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  // Рендер графика баланса
  const renderBalanceChart = () => {
    // Уничтожаем предыдущий график перед созданием нового
    if (balanceChartInstance.current) {
      balanceChartInstance.current.destroy();
      balanceChartInstance.current = null;
    }

    if (!balanceChartRef.current) return;

    const ctx = balanceChartRef.current.getContext('2d');

    // Всегда используем данные из примененного фильтра
    let dataToUse = [];
    
    // Получаем отфильтрованные данные из stats
    if (stats && stats.filteredStats && stats.filteredStats.filteredTournamentsData) {
      dataToUse = stats.filteredStats.filteredTournamentsData;
      console.log('Используем отфильтрованные данные для графика баланса:', dataToUse.length);
    } else {
      console.log('Нет отфильтрованных данных для графика баланса');
      // Если нет отфильтрованных данных, выходим из функции
      balanceChartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [{
            label: t('dashboard.charts.balance'),
            data: [],
            borderColor: '#FF9800',
            backgroundColor: 'rgba(255, 152, 0, 0.2)',
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointBackgroundColor: '#FF9800',
            borderWidth: 4
          }]
        },
        options: getChartOptions(t('dashboard.charts.balance'), [])
      });
      return;
    }
    
    // Сортировка турниров по дате
    const sortedTournaments = [...dataToUse].sort((a, b) => 
      new Date(a.start_time) - new Date(b.start_time)
    );

    // Расчет накопительного баланса
    let balance = 0;
    const balanceData = sortedTournaments.map((tournament, index) => {
      // Расчет прибыли
      let profit = tournament.prize_total - tournament.buyin_total;
      
      // Добавляем рейкбек, если он включен
      if (filters.includeRakeback) {
        const rakeback = (tournament.buyin_commission || 0) * (filters.rakebackPercentage / 100);
        profit += rakeback;
      }
      
      // Обновляем баланс
      balance += profit;
      
      return {
        x: index,
        y: balance,
        tournament: tournament
      };
    });
    
    // Используем все точки без выборки для отображения полной последовательности
    const dataToDisplay = balanceData;
    
    if (dataToDisplay.length === 0) {
      // Отображаем пустой график, если нет данных
      balanceChartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [{
            label: t('dashboard.charts.balance'),
            data: [],
            borderColor: '#FF9800',
            backgroundColor: 'rgba(255, 152, 0, 0.2)',
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointBackgroundColor: '#FF9800',
            borderWidth: 4
          }]
        },
        options: getChartOptions(t('dashboard.charts.balance'), [])
      });
      return;
    }

    balanceChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: t('dashboard.charts.balance'),
          data: dataToDisplay,
          borderColor: '#FF9800',
          backgroundColor: 'rgba(255, 152, 0, 0.2)',
          tension: 0.4,
          fill: true,
          pointRadius: 5,
          pointBackgroundColor: '#FF9800',
          borderWidth: 4
        }]
      },
      options: getChartOptions(t('dashboard.charts.balance'), dataToDisplay)
    });
  };

  // Рендер графика прибыли
  const renderProfitChart = () => {
    // Уничтожаем предыдущий график перед созданием нового
    if (profitChartInstance.current) {
      profitChartInstance.current.destroy();
      profitChartInstance.current = null;
    }

    if (!profitChartRef.current) return;

    const ctx = profitChartRef.current.getContext('2d');

    // Всегда используем данные из примененного фильтра
    let dataToUse = [];
    
    // Получаем отфильтрованные данные из stats
    if (stats && stats.filteredStats && stats.filteredStats.filteredTournamentsData) {
      dataToUse = stats.filteredStats.filteredTournamentsData;
      console.log('Используем отфильтрованные данные для графика прибыли:', dataToUse.length);
    } else {
      console.log('Нет отфильтрованных данных для графика прибыли');
      // Если нет отфильтрованных данных, выходим из функции
      profitChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          datasets: [{
            label: t('dashboard.charts.profit'),
            data: [],
            backgroundColor: 'rgba(76, 175, 80, 0.8)',
            borderColor: 'rgba(76, 175, 80, 1)',
            borderWidth: 4,
            borderRadius: 4
          }]
        },
        options: getChartOptions(t('dashboard.charts.profit'), [])
      });
      return;
    }
    
    // Сортировка турниров по дате
    const sortedTournaments = [...dataToUse].sort((a, b) => 
      new Date(a.start_time) - new Date(b.start_time)
    );

    // Получение данных для графика прибыли
    const profitData = sortedTournaments.map((tournament, index) => {
      // Корректный расчет чистой прибыли
      let profit = 0;
      
      // Если есть поле net_profit, используем его
      if (tournament.net_profit !== undefined) {
        profit = tournament.net_profit;
      } else {
        // В противном случае рассчитываем как (призы минус бай-ины)
        profit = tournament.prize_total - tournament.buyin_total;
        
        // Добавляем рейкбек, если он включен
        if (filters.includeRakeback) {
          const rakeback = (tournament.buyin_commission || 0) * (filters.rakebackPercentage / 100);
          profit += rakeback;
        }
      }
      
      return {
        x: index,
        y: profit,
        tournament: tournament
      };
    });
    
    // Используем все точки без группировки для отображения каждого турнира
    const dataToDisplay = profitData;
    
    if (dataToDisplay.length === 0) {
      // Отображаем пустой график, если нет данных
      profitChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          datasets: [{
            label: t('dashboard.charts.profit'),
            data: [],
            backgroundColor: 'rgba(76, 175, 80, 0.8)',
            borderColor: 'rgba(76, 175, 80, 1)',
            borderWidth: 4,
            borderRadius: 4
          }]
        },
        options: getChartOptions(t('dashboard.charts.profit'), [])
      });
      return;
    }
    
    profitChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        datasets: [{
          label: t('dashboard.charts.profit'),
          data: dataToDisplay,
          backgroundColor: function(context) {
            if (!context.dataset.data[context.dataIndex]) return 'rgba(76, 175, 80, 0.8)';
            const value = context.dataset.data[context.dataIndex].y;
            return value >= 0 ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)';
          },
          borderColor: function(context) {
            if (!context.dataset.data[context.dataIndex]) return 'rgba(76, 175, 80, 1)';
            const value = context.dataset.data[context.dataIndex].y;
            return value >= 0 ? 'rgba(76, 175, 80, 1)' : 'rgba(244, 67, 54, 1)';
          },
          borderWidth: 4,
          borderRadius: 4
        }]
      },
      options: getChartOptions(t('dashboard.charts.profit'), dataToDisplay)
    });
  };

  // Рендер графика наград за выбивание
  const renderBountiesChart = () => {
    // Уничтожаем предыдущий график перед созданием нового
    if (bountiesChartInstance.current) {
      bountiesChartInstance.current.destroy();
      bountiesChartInstance.current = null;
    }

    if (!bountiesChartRef.current) return;

    const ctx = bountiesChartRef.current.getContext('2d');

    // Всегда используем данные из примененного фильтра
    let dataToUse = [];
    
    // Получаем отфильтрованные данные из stats
    if (stats && stats.filteredStats && stats.filteredStats.filteredTournamentsData) {
      dataToUse = stats.filteredStats.filteredTournamentsData;
      console.log('Используем отфильтрованные данные для графика наград:', dataToUse.length);
    } else {
      console.log('Нет отфильтрованных данных для графика наград');
      // Если нет отфильтрованных данных, выходим из функции
      bountiesChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          datasets: [{
            label: t('dashboard.charts.bounties'),
            data: [],
            backgroundColor: 'rgba(33, 150, 243, 0.85)',
            borderColor: 'rgba(0, 87, 255, 1)',
            borderWidth: 4,
            borderRadius: 4
          }]
        },
        options: getChartOptions(t('dashboard.charts.bounties'), [])
      });
      return;
    }
    
    // Сортировка турниров по дате
    const sortedTournaments = [...dataToUse].sort((a, b) => 
      new Date(a.start_time) - new Date(b.start_time)
    );

    // Получение данных для графика наград за выбивание
    const bountiesData = sortedTournaments.map((tournament, index) => {
      let prizeBounty = 0;
      
      // Корректная логика определения наград за выбивание
      if (tournament.prize_bounty) {
        // Если в данных уже есть поле prize_bounty, используем его
        prizeBounty = tournament.prize_bounty;
      } else if (tournament.finish_place > 3) {
        // Если место не входит в топ-3, то награда за выбивание = общий приз
        prizeBounty = tournament.prize_total;
      } else {
        // Если место в топ-3, то награда = общий приз - приз за место
        prizeBounty = tournament.prize_total - (tournament.prize_place || 0);
      }
      
      return {
        x: index,
        y: prizeBounty > 0 ? prizeBounty : 0,
        tournament: tournament
      };
    });
    
    // Используем все точки без группировки для отображения каждого турнира
    const dataToDisplay = bountiesData;
    
    if (dataToDisplay.length === 0) {
      // Отображаем пустой график, если нет данных
      bountiesChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          datasets: [{
            label: t('dashboard.charts.bounties'),
            data: [],
            backgroundColor: 'rgba(33, 150, 243, 0.85)',
            borderColor: 'rgba(0, 87, 255, 1)',
            borderWidth: 4,
            borderRadius: 4
          }]
        },
        options: getChartOptions(t('dashboard.charts.bounties'), [])
      });
      return;
    }
    
    bountiesChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        datasets: [{
          label: t('dashboard.charts.bounties'),
          data: dataToDisplay,
          backgroundColor: 'rgba(33, 150, 243, 0.85)',
          borderColor: 'rgba(0, 87, 255, 1)',
          borderWidth: 4,
          borderRadius: 4
        }]
      },
      options: getChartOptions(t('dashboard.charts.bounties'), dataToDisplay)
    });
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'yyyy-MM-dd HH:mm', { locale });
    } catch (e) {
      return dateString;
    }
  };

  // Форматирование числа с долларом
  const formatMoney = (value) => {
    if (value === undefined || value === null) return '-';
    return '$' + parseFloat(value).toFixed(2);
  };

  // Форматирование процентов
  const formatPercent = (value) => {
    if (value === undefined || value === null) return '-';
    return parseFloat(value).toFixed(2) + '%';
  };

  // Обработчик выхода из системы
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('token');
      navigate('/');
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-logo">PokerCraft Analyzer</div>
          <nav className="dashboard-nav">
            <div className="language-selector">
              <button
                className={`language-btn ${i18n.language === 'en' ? 'active' : ''}`}
                onClick={() => changeLanguage('en')}
              >
                EN
              </button>
              <button
                className={`language-btn ${i18n.language === 'ru' ? 'active' : ''}`}
                onClick={() => changeLanguage('ru')}
              >
                RU
              </button>
            </div>
            <div className="user-info">
              <span className="username">{userInfo.email || 'Пользователь'}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              {t('dashboard.logout')}
            </button>
          </nav>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="dashboard-header-with-upload">
            <section className="stats-section">
              <div className="stats-header">
                <h2 className="stats-title">{t('dashboard.stats.title')}</h2>
                <div className="stats-filter-info">
                  {stats.totalTournaments > 0 ? (
                    <>
                      {t('dashboard.stats.showing')} {stats.filteredTournaments} {t('dashboard.stats.of')} {stats.totalTournaments} {t('dashboard.stats.tournaments')}
                    </>
                  ) : (
                    t('dashboard.stats.noData')
                  )}
                </div>
              </div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">{t('dashboard.stats.totalTournaments')}</div>
                  <div className="stat-value">{stats.totalTournaments}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">{t('dashboard.stats.totalBuyins')}</div>
                  <div className="stat-value">{formatMoney(stats.totalBuyins)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">{t('dashboard.stats.totalCommission')}</div>
                  <div className="stat-value">{formatMoney(stats.totalCommission)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">{t('dashboard.stats.totalBounties')}</div>
                  <div className="stat-value">{formatMoney(stats.totalBounties)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">{t('dashboard.stats.topBounties')}</div>
                  <div className="stat-value">{stats.topBounties}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">{t('dashboard.stats.totalPrizes')}</div>
                  <div className="stat-value">{formatMoney(stats.totalPrizes)}</div>
                </div>
                <div className={`stat-card ${stats.finalResult >= 0 ? 'positive' : 'negative'}`}>
                  <div className="stat-label">{t('dashboard.stats.finalResult')}</div>
                  <div className="stat-value">{formatMoney(stats.finalResult)}</div>
                </div>
                <div className={`stat-card ${stats.roi >= 0 ? 'positive' : 'negative'}`}>
                  <div className="stat-label">{t('dashboard.stats.roi')}</div>
                  <div className="stat-value">{formatPercent(stats.roi)}</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-label">{t('dashboard.stats.avgKnockoutPrice')}</div>
                  <div className="stat-value">{formatMoney(stats.avgKnockoutPrice)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">{t('dashboard.stats.totalKnockouts')}</div>
                  <div className="stat-value">{stats.totalKnockouts}</div>
                </div>
                {filters.includeRakeback && (
                  <>
                    <div className="stat-card highlight">
                      <div className="stat-label">{t('dashboard.stats.totalRakeback')}</div>
                      <div className="stat-value">{formatMoney(stats.totalRakeback)}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">{t('dashboard.stats.rakebackPercentage')}</div>
                      <div className="stat-value">{filters.rakebackPercentage}%</div>
                    </div>
                  </>
                )}
              </div>
            </section>
            
            <div className="header-upload-section">
              <div className="section-title">{t('dashboard.upload.title')}</div>
              <div className="section-content">
                <form onSubmit={handleFileUpload}>
                  <div className="file-input-wrapper">
                    <input
                      type="file"
                      id="file-input"
                      className="file-input"
                      onChange={(e) => setFile(e.target.files[0])}
                      accept=".html"
                    />
                    <label htmlFor="file-input" className="file-input-label">
                      <span className="icon">📁</span>
                      {file ? file.name : t('dashboard.upload.selectFile')}
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="upload-btn"
                    disabled={!file || isUploading}
                  >
                    {isUploading ? (
                      <>
                        <span className="icon">⏳</span>
                        {t('dashboard.upload.uploading')}
                      </>
                    ) : (
                      <>
                        <span className="icon">📤</span>
                        {t('dashboard.upload.submit')}
                      </>
                    )}
                  </button>

                  {isUploading && (
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {uploadStatus && (
                    <div className={`upload-status ${uploadStatus.success ? 'success' : 'error'}`}>
                      <div className="status-message">{uploadStatus.message}</div>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
          <div className="filters-panel">
            <form onSubmit={applyFilters} className="filters-form horizontal">
              <div className="filters-group">
                <div className="filter-item">
                  <label htmlFor="buyin">{t('dashboard.filters.buyin')}</label>
                  <select
                    id="buyin"
                    name="buyin"
                    value={filters.buyin}
                    onChange={handleFilterChange}
                    className="filter-input"
                  >
                    <option value="">Все бай-ины</option>
                    <option value="0.25">0.25$</option>
                    <option value="1">1$</option>
                    <option value="3">3$</option>
                    <option value="10">10$</option>
                    <option value="25">25$</option>
                  </select>
                </div>
                <div className="filter-item">
                  <label htmlFor="place">{t('dashboard.filters.place')}</label>
                  <select
                    id="place"
                    name="place"
                    value={filters.place}
                    onChange={handleFilterChange}
                    className="filter-input"
                  >
                    <option value="">Все места</option>
                    <option value="1">Топ 1</option>
                    <option value="2">Топ 2</option>
                    <option value="3">Топ 3</option>
                    <option value="4">Топ 4</option>
                  </select>
                </div>
                <div className="filter-item">
                  <label htmlFor="startDate">{t('dashboard.filters.startDate')}</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={filters.startDate}
                    onChange={handleFilterChange}
                    className="filter-input"
                  />
                </div>
                <div className="filter-item">
                  <label htmlFor="endDate">{t('dashboard.filters.endDate')}</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={filters.endDate}
                    onChange={handleFilterChange}
                    className="filter-input"
                  />
                </div>
                <div className="filter-item">
                  <label htmlFor="dayOfWeek">{t('dashboard.filters.dayOfWeek')}</label>
                  <select
                    id="dayOfWeek"
                    name="dayOfWeek"
                    value={filters.dayOfWeek}
                    onChange={handleFilterChange}
                    className="filter-select"
                  >
                    <option value="">{t('dashboard.filters.allDays')}</option>
                    <option value="1">{t('dashboard.filters.monday')}</option>
                    <option value="2">{t('dashboard.filters.tuesday')}</option>
                    <option value="3">{t('dashboard.filters.wednesday')}</option>
                    <option value="4">{t('dashboard.filters.thursday')}</option>
                    <option value="5">{t('dashboard.filters.friday')}</option>
                    <option value="6">{t('dashboard.filters.saturday')}</option>
                    <option value="0">{t('dashboard.filters.sunday')}</option>
                  </select>
                </div>
                <div className="filter-item rakeback-container">
                  <div className="rakeback-toggle">
                    <input
                      type="checkbox"
                      id="includeRakeback"
                      name="includeRakeback"
                      checked={filters.includeRakeback}
                      onChange={(e) => handleFilterChange({ 
                        target: { 
                          name: e.target.name, 
                          value: e.target.checked 
                        } 
                      })}
                      className="rakeback-checkbox"
                    />
                    <span className="rakeback-toggle-label">{t('dashboard.filters.includeRakeback')}</span>
                  </div>

                  {filters.includeRakeback && (
                    <select
                      name="rakebackPercentage"
                      value={filters.rakebackPercentage}
                      onChange={handleFilterChange}
                      className="filter-select rakeback-percentage-select"
                    >
                      <option value="20">20%</option>
                      <option value="25">25%</option>
                      <option value="30">30%</option>
                      <option value="35">35%</option>
                      <option value="40">40%</option>
                      <option value="45">45%</option>
                      <option value="50">50%</option>
                      <option value="55">55%</option>
                      <option value="60">60%</option>
                    </select>
                  )}
                </div>
              </div>
              
              <div className="filters-actions">
                <button type="submit" className="apply-filters-btn">
                  {t('dashboard.filters.apply')}
                </button>
                <button type="button" className="reset-filters-btn" onClick={resetFilters}>
                  {t('dashboard.filters.reset')}
                </button>
              </div>
            </form>
          </div>
          
          <section className="filtered-stats-section">
            <div className="filtered-stats-header">
              <h2 className="filtered-stats-title">Статистика по фильтру</h2>
              <div className="stats-filter-info">
                {stats.filteredTournaments > 0 ? (
                  <>
                    Показано {stats.filteredTournaments} турниров
                  </>
                ) : (
                  "Нет данных по заданному фильтру"
                )}
              </div>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">{t('dashboard.stats.totalTournaments')}</div>
                <div className="stat-value">{stats.filteredTournaments || 0}</div>
              </div>
              {stats.filteredStats && (
                <>
                  <div className="stat-card">
                    <div className="stat-label">{t('dashboard.stats.totalBuyins')}</div>
                    <div className="stat-value">{formatMoney(stats.filteredStats.totalBuyins)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">{t('dashboard.stats.totalCommission')}</div>
                    <div className="stat-value">{formatMoney(stats.filteredStats.totalCommission)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">{t('dashboard.stats.totalBounties')}</div>
                    <div className="stat-value">{formatMoney(stats.filteredStats.totalBounties)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">{t('dashboard.stats.totalPrizes')}</div>
                    <div className="stat-value">{formatMoney(stats.filteredStats.totalPrizes)}</div>
                  </div>
                  <div className={`stat-card ${stats.filteredStats.finalResult >= 0 ? 'positive' : 'negative'}`}>
                    <div className="stat-label">{t('dashboard.stats.finalResult')}</div>
                    <div className="stat-value">{formatMoney(stats.filteredStats.finalResult)}</div>
                  </div>
                  <div className={`stat-card ${stats.filteredStats.roi >= 0 ? 'positive' : 'negative'}`}>
                    <div className="stat-label">{t('dashboard.stats.roi')}</div>
                    <div className="stat-value">{formatPercent(stats.filteredStats.roi)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">{t('dashboard.stats.totalKnockouts')}</div>
                    <div className="stat-value">{stats.filteredStats.totalKnockouts}</div>
                  </div>
                  {filters.includeRakeback && (
                    <>
                      <div className="stat-card highlight">
                        <div className="stat-label">{t('dashboard.stats.totalRakeback')}</div>
                        <div className="stat-value">{formatMoney(stats.filteredStats.totalRakeback)}</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">{t('dashboard.stats.rakebackPercentage')}</div>
                        <div className="stat-value">{filters.rakebackPercentage}%</div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </section>
          
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${currentView === 'charts' ? 'active' : ''}`}
              onClick={() => setCurrentView('charts')}
            >
              {t('dashboard.viewToggle.charts')}
            </button>
            <button
              className={`view-toggle-btn ${currentView === 'table' ? 'active' : ''}`}
              onClick={() => setCurrentView('table')}
            >
              {t('dashboard.viewToggle.table')}
            </button>
          </div>
          
          <div className="dashboard-layout">
            <div className="main-content-area">
              <div className="main-content-wrapper">
                <div className="main-content">
                  {currentView === 'charts' ? (
                    <section className="charts-section">
                      <div className="chart-container balance-chart" style={{ height: 'calc(300px * 1.5)' }}>
                        <div className="chart-header">
                          <div className="chart-title">{t('dashboard.charts.balance')}</div>
                        </div>
                        <div className="chart-canvas-container">
                          <canvas ref={balanceChartRef}></canvas>
                        </div>
                      </div>
                      
                      <div className="secondary-charts">
                        <div className="chart-container">
                          <div className="chart-header">
                            <div className="chart-title">{t('dashboard.charts.profit')}</div>
                          </div>
                          <div className="chart-canvas-container">
                            <canvas ref={profitChartRef}></canvas>
                          </div>
                        </div>
                        <div className="chart-container">
                          <div className="chart-header">
                            <div className="chart-title">{t('dashboard.charts.bounties')}</div>
                          </div>
                          <div className="chart-canvas-container">
                            <canvas ref={bountiesChartRef}></canvas>
                          </div>
                        </div>
                      </div>
                    </section>
                  ) : (
                    <section className="table-section">
                      <div className="table-header">
                        <h2 className="table-title">{t('dashboard.table.title')}</h2>
                      </div>
                      <div className="tournament-table-container">
                        {tournaments.length > 0 ? (
                          <>
                            <table className="tournament-table">
                              <colgroup>
                                <col style={{ width: 'auto' }} /> {/* Дата */}
                                <col style={{ width: 'auto' }} /> {/* Бай-ин */}
                                <col style={{ width: '60px' }} /> {/* Место */}
                                <col style={{ width: '60px' }} /> {/* Нокауты */}
                                <col style={{ width: '100px' }} /> {/* Длительность */}
                                <col style={{ width: 'auto' }} /> {/* Приз */}
                                <col style={{ width: 'auto' }} /> {/* Награда за выбивание */}
                                <col style={{ width: 'auto' }} /> {/* Выигранные баунти */}
                              </colgroup>
                              <thead>
                                <tr>
                                  <th onClick={() => handleSort('start_time')}>
                                    {t('dashboard.table.date')}
                                    <span className="sort-arrow">
                                      {sortField === 'start_time' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                                    </span>
                                  </th>
                                  <th onClick={() => handleSort('buyin_total')}>
                                    {t('dashboard.table.buyin')}
                                    <span className="sort-arrow">
                                      {sortField === 'buyin_total' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                                    </span>
                                  </th>
                                  <th onClick={() => handleSort('finish_place')}>
                                    {t('dashboard.table.place')}
                                    <span className="sort-arrow">
                                      {sortField === 'finish_place' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                                    </span>
                                  </th>
                                  <th onClick={() => handleSort('kills')}>
                                    {t('dashboard.table.kills')}
                                    <span className="sort-arrow">
                                      {sortField === 'kills' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                                    </span>
                                  </th>
                                  <th onClick={() => handleSort('duration')}>
                                    {t('dashboard.table.duration')}
                                    <span className="sort-arrow">
                                      {sortField === 'duration' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                                    </span>
                                  </th>
                                  <th onClick={() => handleSort('prize_total')}>
                                    {t('dashboard.table.prize')}
                                    <span className="sort-arrow">
                                      {sortField === 'prize_total' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                                    </span>
                                  </th>
                                  <th onClick={() => handleSort('prize_bounty')}>
                                    {t('dashboard.table.bounty')}
                                    <span className="sort-arrow">
                                      {sortField === 'prize_bounty' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                                    </span>
                                  </th>

                                  <th onClick={() => handleSort('kills_money')}>
                                    {t('dashboard.table.bountiesWon')}
                                    <span className="sort-arrow">
                                      {sortField === 'kills_money' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                                    </span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {getCurrentTournaments().map((tournament, index) => (
                                  <tr key={index} className={tournament.net_profit >= 0 ? 'profitable' : 'unprofitable'}>
                                    <td>{formatDate(tournament.start_time)}</td>
                                    <td>{formatMoney(tournament.buyin_total)}</td>
                                    <td>{tournament.finish_place}</td>
                                    <td>{tournament.kills}</td>
                                    <td>{tournament.duration}</td>
                                    <td>{formatMoney(tournament.prize_total) || '-'}</td>
                                    <td>{formatMoney(tournament.prize_bounty) || '-'}</td>
                                    <td>{tournament.kills_money || 0}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            
                            {tournaments.length > tournamentsPerPage && (
                              <div className="pagination">
                                {Array.from({ length: Math.ceil(tournaments.length / tournamentsPerPage) }, (_, i) => (
                                  <button
                                    key={i}
                                    onClick={() => paginate(i + 1)}
                                    className={`pagination-btn ${currentPage === i + 1 ? 'active' : ''}`}
                                  >
                                    {i + 1}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="table-empty-state">
                            <div className="table-empty-state-icon">📊</div>
                            <div className="table-empty-state-text">
                              {t('dashboard.table.noData')}
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;