// frontend/src/components/Stats.jsx
import React from 'react';

function Stats({ stats }) {
  return (
    <div className="stats">
      <div>Всего турниров: {stats.totalTournaments}</div>
      <div>Бай-инов: ${stats.totalBuyins.toFixed(2)}</div>
      <div>Комиссия: ${stats.totalCommission.toFixed(2)}</div>
      <div>Награды за выбивание: ${stats.totalBounties.toFixed(2)}</div>
      <div>ROI: {stats.roiPercent}%</div>
      {stats.totalRakeback > 0 && (
        <>
          <div>Рейкбека получено: ${stats.totalRakeback.toFixed(2)}</div>
          <div>ROI с рейкбеком: {stats.adjustedROI.toFixed(2)}%</div>
        </>
      )}
    </div>
  );
}

export default Stats;