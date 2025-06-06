// backend/services/parser.js
const cheerio = require('cheerio');
const crypto = require('crypto');
const { zonedTimeToUtc, toDate } = require('date-fns-tz');

function parseDurationToSeconds(durationStr) {
    if (!durationStr || typeof durationStr !== 'string') {
        return 0;
    }
    const parts = durationStr.split(':').map(part => parseInt(part, 10) || 0);
    let seconds = 0;
    if (parts.length === 3) { // ЧЧ:ММ:СС
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) { // ММ:СС
        seconds = parts[0] * 60 + parts[1];
    }
    return seconds;
}

// Таблица призов за место
const prizeTable = {
  // Формат: [бай-ин]: { [место]: приз }
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
  // Русские месяцы с точкой и без
  'янв.': '01', 'янв': '01', 'январь': '01', 'января': '01',
  'февр.': '02', 'фев': '02', 'февраль': '02', 'февраля': '02', 'февр': '02',
  'мар.': '03', 'мар': '03', 'март': '03', 'марта': '03',
  'апр.': '04', 'апр': '04', 'апрель': '04', 'апреля': '04',
  'мая.': '05', 'мая': '05', 'май': '05',
  'июн.': '06', 'июн': '06', 'июнь': '06', 'июня': '06',
  'июл.': '07', 'июл': '07', 'июль': '07', 'июля': '07',
  'авг.': '08', 'авг': '08', 'август': '08', 'августа': '08',
  'сен.': '09', 'сен': '09', 'сентябрь': '09', 'сентября': '09',
  'окт.': '10', 'окт': '10', 'октябрь': '10', 'октября': '10',
  'ноя.': '11', 'ноя': '11', 'ноябрь': '11', 'ноября': '11',
  'дек.': '12', 'дек': '12', 'декабрь': '12', 'декабря': '12',
  // Английские месяцы
  'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
  'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
  'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
};

// Регулярное выражение для парсинга даты
const dateRegex = /([A-Za-zа-яА-Я]+)\.? (\d+),? (\d{2}:\d{2})/;

// Парсинг HTML-файла
function parseTournamentData(htmlContent, timezone) {
  if (!timezone) {
    throw new Error('Часовой пояс (timezone) не был передан в парсер.');
  }
  const $ = cheerio.load(htmlContent);
  const tournaments = [];
  const parsingErrors = [];

  let totalTournaments = 0;
  let skippedTournaments = 0;
  let parsedRowsCount = 0;

  $('.cdk-row').each((i, row) => {
    const cells = $(row).find('.cdk-cell');
    
    if (cells.length < 9) {
      const errorMsg = `Строка ${i+1}: Недостаточно ячеек (${cells.length}) → пропущена`;
      console.warn(`❌ ${errorMsg}`);
      parsingErrors.push({
        row: i+1,
        type: 'INVALID_STRUCTURE',
        message: errorMsg,
        details: `Ожидалось 9 или более ячеек, получено ${cells.length}`
      });
      skippedTournaments++;
      return;
    }

    totalTournaments++;

    try {
      // Извлечение данных из ячеек
      const rawTimeText = $(cells[1]).text().trim(); // Ячейка 1: start_time
      const buyinCell = $(cells[3]);
      const buyinText = buyinCell.find('app-buy-in').text().trim() || buyinCell.text().trim();
      const finishPlaceCell = $(cells[7]);
      const finishPlaceText = finishPlaceCell.find('li').text().trim() || finishPlaceCell.text().trim();
      const prizeCell = $(cells[8]);
      const prizeAppText = prizeCell.find('app-prize').text().trim() || '';
      const prizeCellText = prizeCell.text().trim();

      // Парсинг времени
      const match = rawTimeText.match(dateRegex);
      if (!match) {
        const errorMsg = `Не удалось распарсить дату: "${rawTimeText}"`;
        console.warn(`❌ Строка ${i+1}: ${errorMsg}`);
        parsingErrors.push({
          row: i+1,
          type: 'INVALID_DATE_FORMAT',
          message: errorMsg,
          details: `Текст не соответствует ожидаемому формату даты: ${rawTimeText}`
        });
        skippedTournaments++;
        return;
      }

      let monthStr = match[1].toLowerCase();
      const day = match[2];
      const time = match[3];

      // Удаление точки и приведение к стандартному формату
      monthStr = monthStr.replace('.', '');
      const cleanedMonthStr = monthStr;

      // Поиск месяца в словаре
      const month = monthMap[cleanedMonthStr] || null;

      if (!month) {
        const errorMsg = `Неизвестный месяц: "${monthStr}"`;
        console.warn(`❌ Строка ${i+1}: ${errorMsg}`);
        parsingErrors.push({
          row: i+1,
          type: 'UNKNOWN_MONTH',
          message: errorMsg,
          details: `Месяц "${monthStr}" отсутствует в словаре месяцев`
        });
        skippedTournaments++;
        return;
      }



      // Формат даты для PostgreSQL
      const currentYear = new Date().getFullYear();
      
      // --- ЕДИНСТВЕННЫЙ ПРАВИЛЬНЫЙ СПОСОБ СОЗДАНИЯ ДАТЫ ---
      const dateStringInUserTz = `${currentYear}-${month}-${day.padStart(2, '0')} ${time}`;
      const dateObj = toDate(dateStringInUserTz, { timeZone: timezone });
      
      // Проверка валидности даты
      if (isNaN(dateObj.getTime())) {
        const errorMsg = `Неверная дата: "${dateStringInUserTz}" в поясе ${timezone}`;
        console.warn(`❌ Строка ${i+1}: ${errorMsg}`);
        parsingErrors.push({
          row: i+1, type: 'INVALID_DATE', message: errorMsg,
          details: `Созданная дата недействительна`
        });
        skippedTournaments++;
        return;
      }


      // Парсинг бай-ина
      const buyinTotal = parseFloat(buyinText.replace('$', '')) || 0;
      if (buyinTotal === 0) {
        const warningMsg = `Возможно некорректный бай-ин: ${buyinText} → преобразовано в 0`;
        console.warn(`⚠️ Строка ${i+1}: ${warningMsg}`);
        parsingErrors.push({
          row: i+1,
          type: 'POSSIBLE_INVALID_BUYIN',
          message: warningMsg,
          details: `Исходный текст: "${buyinText}"`
        });
      }

      // Парсинг места
      const finishPlaceMatch = finishPlaceText.match(/(\d+)(?:-м|th|st|nd|rd)/i);
      const finishPlace = finishPlaceMatch 
        ? parseInt(finishPlaceMatch[1]) 
        : finishPlaceText.match(/\d+/) 
          ? parseInt(finishPlaceText.match(/\d+/)[0]) 
          : 0;

      if (finishPlace === 0) {
        const warningMsg = `Место не найдено в тексте: "${finishPlaceText}" → finish_place = 0`;
        console.warn(`⚠️ Строка ${i+1}: ${warningMsg}`);
        parsingErrors.push({
          row: i+1,
          type: 'PLACE_NOT_FOUND',
          message: warningMsg,
          details: `Исходный текст: "${finishPlaceText}"`
        });
      }

      // Парсинг убийств
      const killsText = $(cells[5]).text().trim();
      const kills = parseInt(killsText.replace(/[^0-9]/g, '')) || 0;

      // Парсинг продолжительности
      const duration = $(cells[6]).text().trim();
      if (!duration.match(/\d+:\d+:\d+/) && !duration.match(/\d+:\d+/)) {
        const warningMsg = `Необычный формат продолжительности: "${duration}"`;
        console.warn(`⚠️ Строка ${i+1}: ${warningMsg}`);
        parsingErrors.push({
          row: i+1,
          type: 'UNUSUAL_DURATION_FORMAT',
          message: warningMsg,
          details: `Ожидался формат HH:MM:SS или MM:SS`
        });
      }

      // Парсинг приза
      let prizeTotal = 0;
      if (prizeAppText.includes('$')) {
        prizeTotal = parseFloat(prizeAppText.replace(/[^0-9.]/g, '')) || 0;
      } else if (prizeCellText.includes('$')) {
        prizeTotal = parseFloat(prizeCellText.replace(/[^0-9.]/g, '')) || 0;
      } else if (prizeCellText.includes('–')) {
        prizeTotal = 0;
      }
      prizeTotal = Math.round(prizeTotal * 100) / 100;
      
      // Расчёт приза за место
      let prizePlace = finishPlace > 0 && finishPlace <= 3 
        ? (prizeTable[buyinTotal]?.[finishPlace] || 0) 
        : 0;
      prizePlace = Math.round(prizePlace * 100) / 100;
      
      // Расчёт награды за выбивание
      let prizeBounty = finishPlace > 0 ? (prizeTotal - prizePlace) : 0;
      prizeBounty = Math.round(prizeBounty * 100) / 100;

      // Расчёт чистой прибыли
      let netProfit = prizeTotal - buyinTotal;
      netProfit = Math.round(netProfit * 100) / 100;

      // Флаг: топ-награда
      const isTopBounty = finishPlace > 0 && prizeBounty >= (topBounties[buyinTotal] || 0);

      // Убийства с/без приза
      let killsMoney = 0;
      let killsNoMoney = 0;
      if (finishPlace >= 1 && finishPlace <= 8) {
        killsMoney = kills;
      } else if (finishPlace >= 9 && finishPlace <= 18) {
        killsNoMoney = kills;
      }

      const durationStr = $(cells[6]).text().trim();
      const durationInSeconds = parseDurationToSeconds(durationStr);

      // Генерация хэша для защиты от дубликатов
      const hash = crypto.createHash('sha1')
        .update(`${dateStringInUserTz}${buyinTotal}${finishPlace}${prizeTotal}${kills}`)
        .digest('hex');

      tournaments.push({
        tournament_hash: hash,
        start_time: dateObj.toISOString(),
        weekday: dateObj.getDay(), // 0=Воскресенье, 6=Суббота
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
        kills_nomoney: killsNoMoney,
        duration_seconds: durationInSeconds
      });

      parsedRowsCount++;
    } catch (error) {
      const errorMsg = `Ошибка при обработке строки ${i+1}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      parsingErrors.push({
        row: i+1,
        type: 'PARSING_ERROR',
        message: errorMsg,
        details: error.stack
      });
      skippedTournaments++;
    }
  });

  console.log(`✅ Всего строк с турнирами: ${totalTournaments}`);
  console.log(`✅ Успешно обработано строк: ${parsedRowsCount}`);
  console.log(`❌ Пропущено строк: ${skippedTournaments}`);
  console.log(`📊 Обработано турниров: ${tournaments.length}`);

  if (parsingErrors.length > 0) {
    console.log(`⚠️ Обнаружено ${parsingErrors.length} ошибок при парсинге`);
  }

  return {
    tournaments,
    stats: {
      totalRows: totalTournaments,
      parsedRows: parsedRowsCount,
      skippedRows: skippedTournaments
    },
    errors: parsingErrors
  };
}

module.exports = { parseTournamentData };