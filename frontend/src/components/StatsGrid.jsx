import React from 'react';
import { useTranslation } from 'react-i18next';

// --- ВОССТАНАВЛИВАЕМ НЕДОСТАЮЩИЕ ФУНКЦИИ-ПОМОЩНИКИ ---
const formatMoney = (value) => {
    if (value === undefined || value === null) return '-';
    const className = value > 0 ? 'positive-value' : value < 0 ? 'negative-value' : '';
    return <span className={className}>${parseFloat(value).toFixed(2)}</span>;
};

const formatPercent = (value) => {
    if (value === undefined || value === null) return '-';
    const className = value > 0 ? 'positive-value' : value < 0 ? 'negative-value' : '';
    return <span className={className}>{parseFloat(value).toFixed(2)}%</span>;
};

const formatNumber = (value) => (value === undefined || value === null) ? '-' : value;
// -------------------------------------------------------------

function StatsGrid({ stats, title, subtitle, showRakeback }) {
    const { t } = useTranslation();

    const statItems = [
        { key: 'totalTournaments', label: t('dashboard.stats.totalTournaments'), value: formatNumber(stats.totalTournaments) },
        { key: 'totalBuyins', label: t('dashboard.stats.totalBuyins'), value: formatMoney(stats.totalBuyins) },
        { key: 'totalPrizes', label: t('dashboard.stats.totalPrizes'), value: formatMoney(stats.totalPrizes) },
        { key: 'finalResult', label: t('dashboard.stats.finalResult'), value: formatMoney(stats.finalResult), highlight: true },
        { key: 'roi', label: t('dashboard.stats.roi'), value: formatPercent(stats.roi), highlight: true },
        { key: 'totalCommission', label: t('dashboard.stats.totalCommission'), value: formatMoney(stats.totalCommission) },
        { key: 'totalBounties', label: t('dashboard.stats.totalBounties'), value: formatMoney(stats.totalBounties) },
        { key: 'totalKnockouts', label: t('dashboard.stats.totalKnockouts'), value: formatNumber(stats.totalKnockouts) },
        { key: 'topKnockouts', label: t('dashboard.stats.topKnockouts'), value: formatNumber(stats.topKnockouts) },
    ];
    
    if (showRakeback) {
        const roiIndex = statItems.findIndex(item => item.key === 'roi');
        if (roiIndex !== -1) {
            const rakebackStats = [
                { key: 'roiWithRakeback', label: t('dashboard.stats.roiWithRakeback'), value: formatPercent(stats.roiWithRakeback), highlight: true },
                { key: 'rakebackReceived', label: t('dashboard.stats.rakebackReceived'), value: formatMoney(stats.rakebackReceived), highlight: true },
                { key: 'rakebackPercentage', label: t('dashboard.stats.rakebackPercentage'), value: `${stats.rakebackPercentage || 0}%` },
            ];
            statItems.splice(roiIndex + 1, 0, ...rakebackStats);
        }
    }
    
    return (
        <section className="stats-section">
            <div className="stats-header">
                <h2 className="stats-title">{title}</h2>
                {subtitle && <p className="stats-subtitle">{subtitle}</p>}
            </div>
            <div className="stats-grid">
                {statItems.map(item => (
                    <div key={item.key} className={`stat-card ${item.highlight ? 'highlight' : ''}`}>
                        <div className="stat-label">{item.label}</div>
                        <div className="stat-value">{item.value}</div>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default StatsGrid;