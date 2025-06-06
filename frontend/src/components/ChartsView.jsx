import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// --- НОВЫЙ БЛОК: Кастомный плагин для текста в центре диаграммы ---
const centerTextPlugin = {
  id: 'centerText',
  beforeDraw: (chart) => {
    const { ctx, data } = chart;
    if (!data.datasets[0] || data.datasets[0].data.length === 0) return;

    // Считаем общую сумму
    const total = data.datasets[0].data.reduce((sum, value) => sum + value, 0);
    const totalAsNumber = Number(total);
    if (isNaN(totalAsNumber)) return;

    ctx.save();
    const x = chart.getDatasetMeta(0).data[0].x;
    const y = chart.getDatasetMeta(0).data[0].y;
    
    // Стили для основного текста (сумма)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillStyle = '#f0f0f0'; // text-primary
    ctx.fillText(`$${totalAsNumber.toFixed(2)}`, x, y - 10);
    ctx.fillText(`$${total.toFixed(2)}`, x, y - 10);

    // Стили для подписи
    ctx.font = '14px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // text-secondary
    ctx.fillText('Общий доход', x, y + 15);
    
    ctx.restore();
  }
};


ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler, ArcElement
);



function ChartsView({ tournaments, filters }) {
    const { t } = useTranslation();

    const chartData = useMemo(() => {
        if (!tournaments || tournaments.length === 0) return null;

        const reversedTournaments = [...tournaments].reverse();
        
        const balanceLabels = reversedTournaments.map((_, index) => index + 1);
        let currentBalance = 0;
        const balanceData = reversedTournaments.map(t => {
            let netProfit = t.prize_total - t.buyin_total;
            if (filters.includeRakeback) {
                const rakeback = t.buyin_commission * (filters.rakebackPercentage / 100);
                netProfit += rakeback;
            }
            currentBalance += netProfit;
            return currentBalance.toFixed(2);
        });
        // --- НОВАЯ ЛОГИКА: Данные для графика распределения по местам ---
        const placesCount = {};
        // Инициализируем счетчики для мест с 1 по 18
        for (let i = 1; i <= 18; i++) {
            placesCount[i] = 0;
        }

        // Считаем количество каждого места
        for (const t of tournaments) {
            const place = t.finish_place;
            if (place >= 1 && place <= 18) {
                placesCount[place]++;
            }
        }
        
        const placesLabels = Object.keys(placesCount).map(place => `Топ ${place}`);
        const placesData = Object.values(placesCount);

        const dailyProfit = {};
        for (const t of tournaments) {
            const day = new Date(t.start_time).toISOString().split('T')[0];
            const netProfit = t.prize_total - t.buyin_total;
            dailyProfit[day] = (dailyProfit[day] || 0) + netProfit;
        }


        const sortedDays = Object.keys(dailyProfit).sort((a, b) => new Date(a) - new Date(b));
        const dailyProfitLabels = sortedDays.map(day => {
            const [ , month, d] = day.split('-');
            return `${d}.${month}`;
        });
        const dailyProfitData = sortedDays.map(day => dailyProfit[day]);

        const bountyLabels = balanceLabels;
        const bountyData = reversedTournaments.map(t => t.prize_bounty);

        
        const prizeDistribution = {
            'Топ 1': 0, 'Топ 2': 0, 'Топ 3': 0,
            'Топ 4-5': 0, 'Топ 6-8': 0, 'Рейкбек': 0
        };

        for (const t of tournaments) {
            const place = t.finish_place;
            const prize = t.prize_total;
            if (place === 1) prizeDistribution['Топ 1'] += prize;
            else if (place === 2) prizeDistribution['Топ 2'] += prize;
            else if (place === 3) prizeDistribution['Топ 3'] += prize;
            else if (place >= 4 && place <= 5) prizeDistribution['Топ 4-5'] += prize;
            else if (place >= 6 && place <= 8) prizeDistribution['Топ 6-8'] += prize;
        }

        if (filters.includeRakeback) {
            const totalRakeback = tournaments.reduce((sum, t) => sum + (t.buyin_commission * (filters.rakebackPercentage / 100)), 0);
            prizeDistribution['Рейкбек'] = totalRakeback;
        }
        
        const doughnutLabels = Object.keys(prizeDistribution).filter(key => prizeDistribution[key] > 0.01);
        const doughnutData = doughnutLabels.map(key => prizeDistribution[key]);

        return { 
            balanceLabels, balanceData, 
            dailyProfitLabels, dailyProfitData, 
            bountyLabels, bountyData,
            doughnutLabels, doughnutData,
            placesLabels, placesData
        };

    }, [tournaments, filters, t]);

    if (!chartData) {
        return <div className="table-empty-state">{t('dashboard.charts.noData')}</div>;
    }

    // --- ОПРЕДЕЛЕНИЕ ПЕРЕМЕННЫХ, КОТОРЫЕ БЫЛИ ПРОПУЩЕНЫ ---

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { ticks: { color: 'rgba(255, 255, 255, 0.7)', autoSkip: true, maxTicksLimit: 15 }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
            y: { ticks: { color: 'rgba(255, 255, 255, 0.7)', callback: (value) => `$${value}` }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
        },
        plugins: {
            legend: { labels: { color: 'rgba(255, 255, 255, 0.9)', font: { size: 14 } } },
            tooltip: { callbacks: { label: (context) => `${context.dataset.label}: $${context.parsed.y.toFixed(2)}` } }
        }
    };
    
    const balanceChartData = {
        labels: chartData.balanceLabels,
        datasets: [{
            label: t('dashboard.charts.balance'),
            data: chartData.balanceData,
            borderColor: '#FF9800',
            backgroundColor: (context) => {
                const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, 'rgba(255, 152, 0, 0.4)');
                gradient.addColorStop(1, 'rgba(255, 152, 0, 0)');
                return gradient;
            },
            borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true,
        }]
    };
    
    const netProfitChartData = {
        labels: chartData.dailyProfitLabels,
        datasets: [{
            label: t('dashboard.charts.profit'),
            data: chartData.dailyProfitData,
            backgroundColor: (context) => context.raw >= 0 ? 'rgba(76, 175, 80, 0.7)' : 'rgba(244, 67, 54, 0.7)',
            barPercentage: 0.8,
            categoryPercentage: 0.8,
        }]
    };
    const netProfitOptions = { ...commonOptions, plugins: { ...commonOptions.plugins, legend: { display: false } } };
    
    const bountyChartData = {
        labels: chartData.bountyLabels,
        datasets: [{
            label: t('dashboard.charts.bounties'),
            data: chartData.bountyData,
            backgroundColor: 'rgba(33, 150, 243, 0.7)',
            barPercentage: 0.5,
            categoryPercentage: 0.5,
        }]
    };
    const bountyOptions = { ...commonOptions, plugins: { ...commonOptions.plugins, legend: { display: false } } };
    
    const doughnutChartData = {
        labels: chartData.doughnutLabels,
        datasets: [{
            label: 'Распределение призовых',
            data: chartData.doughnutData,
            backgroundColor: [
                'rgba(76, 175, 80, 0.7)',
                'rgba(33, 150, 243, 0.7)',
                'rgba(255, 152, 0, 0.7)',
                'rgba(156, 39, 176, 0.7)',
                'rgba(233, 30, 99, 0.7)',
                'rgba(0, 188, 212, 0.7)',
            ],
            borderColor: '#1e1e1e',
            borderWidth: 2,
        }]
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false, cutout: '65%',
        plugins: {
            legend: {
                position: 'right',
                labels: { color: 'rgba(255, 255, 255, 0.9)' }
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.chart.getDatasetMeta(0).total;
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(2) : 0;
                        return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                    }
                }
            }
        }
    };
    const placesChartData = {
        labels: chartData.placesLabels,
        datasets: [{
            label: 'Количество раз',
            data: chartData.placesData,
            backgroundColor: 'rgba(59, 48, 216, 0.7)', // Фиолетовый цвет
            borderColor: '#9C27B0',
        }]
    };

    const placesOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { ticks: { color: 'rgba(255, 255, 255, 0.7)' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
            y: {
                ticks: { color: 'rgba(255, 255, 255, 0.7)' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                title: { display: true, text: 'Количество', color: '#f0f0f0' }
            }
        },
        plugins: {
            legend: { display: false }, // Легенда не нужна
            tooltip: {
                callbacks: {
                    label: (context) => `Занято раз: ${context.raw}`
                }
            }
        }
    };
    // --- КОНЕЦ ОПРЕДЕЛЕНИЯ ПЕРЕМЕННЫХ ---


    return (
        <div className="charts-section">
            <div className="top-charts-grid">
                <div className="chart-container balance-chart">
                    <h3 className="chart-title">{t('dashboard.charts.balance')}</h3>
                    <div className="chart-canvas-container">
                        <Line options={commonOptions} data={balanceChartData} />
                    </div>
                </div>
                 <div className="chart-container doughnut-chart">
                    <h3 className="chart-title">Распределение дохода</h3>
                    <div className="chart-canvas-container">
                        <Doughnut data={doughnutChartData} options={doughnutOptions} plugins={[centerTextPlugin]}/>
                    </div>
                </div>
            </div>
            
            <div className="secondary-charts">
                 <div className="chart-container">
                    <h3 className="chart-title">{t('dashboard.charts.profit')}</h3>
                    <div className="chart-canvas-container">
                         <Bar options={netProfitOptions} data={netProfitChartData} />
                    </div>
                </div>
                
                 <div className="chart-container">
                    <h3 className="chart-title">{t('dashboard.charts.bounties')}</h3>
                    <div className="chart-canvas-container">
                         <Bar options={bountyOptions} data={bountyChartData} />
                    </div>
                </div>
            </div>
            <div className="chart-container places-distribution-chart">
                <h3 className="chart-title">Распределение по местам (Топ 1-18)</h3>
                <div className="chart-canvas-container">
                    <Bar options={placesOptions} data={placesChartData} />
                </div>
            </div>
        </div>
    );
}

export default ChartsView;