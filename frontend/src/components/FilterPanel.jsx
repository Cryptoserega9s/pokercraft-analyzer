import React from 'react';
import { useTranslation } from 'react-i18next';

// Вспомогательный компонент для фильтра по времени
const TimeFilter = ({ label, value, onChange }) => {
    // value приходит в формате "ЧЧ:ММ" или пустой строкой
    const [hour = '00', minute = '00'] = value ? value.split(':') : [];

    const handleHourChange = (e) => {
        const newHour = e.target.value;
        onChange(`${newHour}:${minute}`);
    };
    
    const handleMinuteChange = (e) => {
        const newMinute = e.target.value;
        onChange(`${hour}:${newMinute}`);
    };

    // Генерируем опции для часов и минут
    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minutes = Array.from({ length: 6 }, (_, i) => String(i * 10).padStart(2, '0'));

    return (
        <div className="filter-item time-filter">
            <label>{label}</label>
            <div className="time-inputs">
                <select value={hour} onChange={handleHourChange}>
                    {hours.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <span>:</span>
                <select value={minute} onChange={handleMinuteChange}>
                    {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>
        </div>
    );
};


// Основной компонент панели фильтров
function FilterPanel({ filters, onFilterChange, onResetFilters }) {
    const { t } = useTranslation();

    // Восстанавливаем список дней недели
    const daysOfWeek = [
        { value: "1", label: t('days.mon') },
        { value: "2", label: t('days.tue') },
        { value: "3", label: t('days.wed') },
        { value: "4", label: t('days.thu') },
        { value: "5", label: t('days.fri') },
        { value: "6", label: t('days.sat') },
        { value: "0", label: t('days.sun') },
    ];
    
    const rakebackOptions = [20, 25, 30, 35, 40, 45, 50, 55, 60];

    // Функция-обработчик для TimeFilter
    const handleTimeChange = (name, timeValue) => {
        const event = { target: { name, value: timeValue, type: 'text' } };
        onFilterChange(event);
    };

    return (
        <div className="filters-panel">
            {/* Убираем тег <form> */}
            <div className="filters-form">
                <div className="filters-group">
                    {/* Фильтр по бай-ину */}
                    <div className="filter-item">
                        <label htmlFor="buyin">{t('dashboard.filters.buyin')}</label>
                        <select id="buyin" name="buyin" value={filters.buyin} onChange={onFilterChange} className="filter-input">
                             <option value="">{t('dashboard.filters.all')}</option>
                             <option value="0.25">$0.25</option>
                             <option value="1">$1.00</option>
                             <option value="3">$3.00</option>
                             <option value="10">$10.00</option>
                             <option value="25">$25.00</option>
                        </select>
                    </div>
                    {/* Фильтр по месту */}
                    <div className="filter-item">
                        <label htmlFor="place">{t('dashboard.filters.place')}</label>
                        <select id="place" name="place" value={filters.place} onChange={onFilterChange} className="filter-input">
                            <option value="">{t('dashboard.filters.all')}</option>
                            <option value="1">Топ 1</option>
                            <option value="2">Топ 2</option>
                            <option value="3">Топ 3</option>
                            <option value="4">Топ 4</option>
                            <option value="top4-6">Топ 4-6</option>
                            <option value="itm">ITM (В деньгах)</option>
                            <option value="no_itm">Не ITM</option>
                        </select>
                    </div>
                    {/* Фильтр по дате */}
                    <div className="filter-item">
                        <label htmlFor="startDate">{t('dashboard.filters.startDate')}</label>
                        <input type="date" id="startDate" name="startDate" value={filters.startDate} onChange={onFilterChange} className="filter-input" />
                    </div>
                    <div className="filter-item">
                        <label htmlFor="endDate">{t('dashboard.filters.endDate')}</label>
                        <input type="date" id="endDate" name="endDate" value={filters.endDate} onChange={onFilterChange} className="filter-input" />
                    </div>
                </div>
                <div className="filters-group-secondary">
                    {/* Фильтр по дню недели */}
                    <div className="filter-item">
                        <label htmlFor="dayOfWeek">{t('dashboard.filters.dayOfWeek')}</label>
                        <select id="dayOfWeek" name="dayOfWeek" value={filters.dayOfWeek} onChange={onFilterChange} className="filter-select">
                            <option value="">{t('dashboard.filters.all')}</option>
                            {daysOfWeek.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
                        </select>
                    </div>
                    
                    {/* Фильтры по времени */}
                    <TimeFilter label="С" value={filters.startTime} onChange={(time) => handleTimeChange('startTime', time)} />
                    <TimeFilter label="До" value={filters.endTime} onChange={(time) => handleTimeChange('endTime', time)} />
                    
                    {/* Фильтр по рейкбеку */}
                    <div className="filter-item rakeback-container">
                        <div className="rakeback-toggle">
                            <input type="checkbox" id="includeRakeback" name="includeRakeback" checked={filters.includeRakeback} onChange={onFilterChange} />
                            <label htmlFor="includeRakeback">{t('dashboard.filters.includeRakeback')}</label>
                        </div>
                        <select 
                            name="rakebackPercentage" 
                            value={filters.rakebackPercentage} 
                            onChange={onFilterChange} 
                            className="filter-select rakeback-percentage-select"
                            disabled={!filters.includeRakeback}
                        >
                             {rakebackOptions.map(p => <option key={p} value={p}>{p}%</option>)}
                        </select>
                    </div>

                    {/* Кнопка сброса */}
                    <div className="filters-actions">
                        <button type="button" className="reset-filters-btn" onClick={onResetFilters}>{t('dashboard.filters.reset')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FilterPanel;