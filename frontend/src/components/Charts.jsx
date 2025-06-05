// frontend/src/components/Charts.jsx
import React, { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';

function Charts({ data, filters, isRakebackEnabled, rakebackPercentage }) {
  const balanceChartRef = useRef(null);
  const profitChartRef = useRef(null);
  const bountyChartRef = useRef(null);

  useEffect(() => {
    if (data.length === 0) return;

    // Баланс с рейкбеком
    let balance = 0;
    const balances = [];
    data.forEach(row => {
      const rakeback = isRakebackEnabled 
        ? row.buyin_commission * (rakebackPercentage / 100) 
        : 0;
      balance += row.net_profit + rakeback;
      balances.push(balance);
    });

    // Баланс
    const balanceCtx = balanceChartRef.current.getContext('2d');
    new Chart(balanceCtx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i + 1),
        datasets: [{
          label: 'Баланс',
          data: balances,
          borderColor: 'blue'
        }]
      }
    });

    // Прибыль
    const profitCtx = profitChartRef.current.getContext('2d');
    new Chart(profitCtx, {
      type: 'bar',
      data: {
        labels: data.map((_, i) => i + 1),
        datasets: [{
          label: 'Чистая прибыль',
          data: data.map(row => row.net_profit),
          backgroundColor: 'green'
        }]
      }
    });

    // Награды за выбивание
    const bountyCtx = bountyChartRef.current.getContext('2d');
    new Chart(bountyCtx, {
      type: 'pie',
      data: {
        labels: ['Топ-награды', 'Обычные'],
        datasets: [{
          data: [
            data.filter(row => row.is_top_bounty).length,
            data.filter(row => !row.is_top_bounty).length
          ],
          backgroundColor: ['gold', 'lightgray']
        }]
      }
    });
  }, [data, filters, isRakebackEnabled, rakebackPercentage]);

  return (
    <div className="charts">
      <canvas ref={balanceChartRef} width="400" height="200"></canvas>
      <canvas ref={profitChartRef} width="400" height="200"></canvas>
      <canvas ref={bountyChartRef} width="400" height="200"></canvas>
    </div>
  );
}

export default Charts;