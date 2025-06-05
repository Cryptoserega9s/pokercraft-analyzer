// backend/services/parser.js
const cheerio = require('cheerio');
const crypto = require('crypto');
const dateRegex = /([A-Za-zа-яА-Я]+)\.?\s+(\d+)[,.]?\s+(\d{2}:\d{2})/;

// Таблица призов за место
const prizeTable = {
  0.25: {1: 1, 2: 0.75, 3: 0.5},
  1: {1: 4, 2: 3, 3: 2},
  3: {1: 12, 2: 9, 3: 6},
  10: {1: 40, 2: 30, 3: 20},
  25: {1: 100, 2: 75, 3: 50}
};

// Топ-награды за выбивание
const topBounties = {
  0.25: 2.5,
  1: 10,
  3: 30,
  10: 100,
  25: 250
};

// Словарь месяцев для русского и английского языков
const monthMap = {
  // Русские месяцы с точками
  'янв.': '01', 'фев.': '02', 'мар.': '03', 'апр.': '04',
  'май.': '05', 'июн.': '06', 'июл.': '07', 'авг.': '08',
  'сен.': '09', 'окт.': '10', 'ноя.': '11', 'дек.': '12',
  // Русские месяцы без точек
  'янв': '01', 'фев': '02', 'мар': '03', 'апр': '04',
  'май': '05', 'июн': '06', 'июл': '07', 'авг': '08',
  'сен': '09', 'окт': '10', 'ноя': '11', 'дек': '12',
  // Английские месяцы
  'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
  'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
  'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
};

// Регулярное выражение для парсинга даты
const dateRegex = /([A-Za-zа-яА-Я]+)\s+(\d+),?\s+(\d{2}:\d{2})/;

// Парсинг HTML-файла
function parseTournamentData(htmlContent) {
  const $ = cheerio.load(htmlContent);
  const tournaments = [];

  $('.cdk-row').each((i, row) => {
    const cells = $(row).find('.cdk-cell');
    if (cells.length < 9) return; // Пропустить неполные строки

    // Извлечение данных из ячеек
    const rawTimeText = $(cells[1]).text().trim(); // Ячейка 1: start_time
    const buyinText = $(cells[3]).text().trim();   // Ячейка 3: buyin_total
    const finishPlaceText = $(cells[7]).text().trim(); // Ячейка 7: finish_place
    const prizeText = $(cells[8]).text().trim();    // Ячейка 8: prize_total
    const kills = parseInt($(cells[5]).text().trim().replace(/[^0-9]/g, '')) || 0; // Ячейка 5: kills
    const duration = $(cells[6]).text().trim();    // Ячейка 6: duration

    // Парсинг времени с регулярным выражением
    const match = rawTimeText.match(dateRegex);
    if (!match) {
      console.warn('Не удалось распарсить дату:', rawTimeText);
      return;
    }

    const monthStr = match[1].toLowerCase();
    const day = match[2];
    const time = match[3];

    // Преобразование месяцев
    const cleanedMonthStr = monthStr.replace('.', '');
    const month = monthMap[cleanedMonthStr] || null;

    if (!month) {
      console.warn('Неизвестный месяц:', monthStr);
      return;
    }

    // Формат даты для PostgreSQL
    const formattedDate = `2025-${month}-${day}`;
    const fullDateTime = `${formattedDate} ${time}`;
    
    // Проверка валидности даты
    const dateObj = new Date(fullDateTime);
    if (isNaN(dateObj.getTime())) {
      console.warn('Неверный формат даты:', fullDateTime);
      return;
    }

    // Парсинг бай-ина
    const buyinTotal = parseFloat(buyinText.replace('$', '')) || 0;

    // Парсинг места
    const finishPlace = parseInt(finishPlaceText.replace(/[^0-9]/g, '')) || 0;

    // Парсинг приза
    const prizeTotal = parseFloat(prizeText.replace(/[^0-9.]/g, '')) || 0;

    // Расчёт приза за место
    const prizePlace = prizeTable[buyinTotal]?.[finishPlace] || 0;

    // Расчёт награды за выбивание
    const prizeBounty = finishPlace > 0 ? (prizeTotal - prizePlace) : 0;

    // Расчёт чистой прибыли
    const netProfit = prizeTotal - buyinTotal;

    // Флаг: топ-награда
    const isTopBounty = prizeBounty >= (topBounties[buyinTotal] || 0);

    // Убийства с/без приза
    let killsMoney = 0;
    let killsNoMoney = 0;
    if (finishPlace >= 1 && finishPlace <= 8) {
      killsMoney = kills;
    } else if (finishPlace >= 9 && finishPlace <= 18) {
      killsNoMoney = kills;
    }

    // Генерация хэша для защиты от дубликатов
    const hash = crypto.createHash('sha1')
      .update(`${fullDateTime}${buyinTotal}${finishPlace}${prizeTotal}${kills}`)
      .digest('hex');

    tournaments.push({
      tournament_hash: hash,
      start_time: fullDateTime,
      weekday: dateObj.getDay(), // Возвращаем день недели
      buyin_total: buyinTotal,
      buyin_prize_pool: buyinTotal * 0.5,
      buyin_commission: buyinTotal * 0.08,
      buyin_bounty: buyinTotal * 0.42,
      finish_place: finishPlace,
      prize_total: prizeTotal,
      prize_place: prizePlace,
      prize_bounty: prizeBounty,
      kills,
      duration,
      net_profit: netProfit,
      is_top_bounty: isTopBounty,
      kills_money: killsMoney,
      kills_nomoney: killsNoMoney
    });
  });

  return tournaments;
}

module.exports = { parseTournamentData };