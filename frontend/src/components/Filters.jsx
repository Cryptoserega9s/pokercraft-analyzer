// frontend/src/components/Filters.jsx
import React from 'react';

function Filters({ filters, onFilterChange }) {
  return (
    <div className="filters">
      <select
        value={filters.buyin}
        onChange={(e) => onFilterChange('buyin', e.target.value)}
      >
        <option value="">Все бай-ины</option>
        <option value="0.25">$0.25</option>
        <option value="1">$1</option>
        <option value="3">$3</option>
        <option value="10">$10</option>
        <option value="25">$25</option>
      </select>

      <select
        value={filters.place}
        onChange={(e) => onFilterChange('place', e.target.value)}
      >
        <option value="">Все места</option>
        <option value="top3">Топ-3</option>
        <option value="non_itm">Проигрыш (4–18)</option>
        {[...Array(18)].map((_, i) => (
          <option key={i + 1} value={`place-${i + 1}`}>{i + 1}-е место</option>
        ))}
      </select>

      <input
        type="date"
        value={filters.startDate}
        onChange={(e) => onFilterChange('startDate', e.target.value)}
      />
      <input
        type="date"
        value={filters.endDate}
        onChange={(e) => onFilterChange('endDate', e.target.value)}
      />

      <select
        value={filters.dayOfWeek}
        onChange={(e) => onFilterChange('dayOfWeek', e.target.value)}
      >
        <option value="">Все дни</option>
        <option value="0">Воскресенье</option>
        <option value="1">Понедельник</option>
        <option value="2">Вторник</option>
        <option value="3">Среда</option>
        <option value="4">Четверг</option>
        <option value="5">Пятница</option>
        <option value="6">Суббота</option>
      </select>
    </div>
  );
}

export default Filters;