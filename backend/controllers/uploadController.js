// backend/controllers/uploadController.js
const { parseTournamentData } = require('../services/parser');
const Tournament = require('../models').Tournament;
const User = require('../models').User;
const db = require('../models'); // Импорт для доступа к Sequelize.Op

exports.uploadFile = async (req, res) => {
  try {
    console.log('====== Начало обработки загрузки файла ======');
    console.log('Запрос на загрузку файла:', {
      headers: req.headers['content-type'],
      files: req.files ? Object.keys(req.files) : 'нет файлов',
      body: Object.keys(req.body || {})
    });

    // Проверка загрузки файла
    if (!req.files || !req.files.html) {
      console.error('Файл не загружен:', req.files);
      return res.status(400).json({
        success: false,
        message: 'Файл не загружен. Пожалуйста, выберите файл history.html'
      });
    }

    const htmlFile = req.files.html;
    
    console.log('Информация о файле:', {
      name: htmlFile.name,
      size: htmlFile.size,
      mimetype: htmlFile.mimetype,
      md5: htmlFile.md5
    });
    
    // Проверка типа файла
    if (!htmlFile.name.toLowerCase().endsWith('.html')) {
      console.error('Неверный формат файла:', htmlFile.name);
      return res.status(400).json({
        success: false,
        message: 'Неверный формат файла. Пожалуйста, загрузите файл с расширением .html'
      });
    }
    const userTimezone = req.body.timezone || 'UTC'; // 'UTC' как запасной вариант
    console.log(`Получен часовой пояс от пользователя: ${userTimezone}`);

    
    console.log('Файл загружен:', htmlFile.name);

    // Парсинг HTML
    console.log('Начало парсинга HTML файла размером', htmlFile.size, 'байт');
    const htmlContent = htmlFile.data.toString();
    
    // Проверка содержимого файла
    if (!htmlContent || htmlContent.length < 100) {
      console.error('Файл пуст или слишком мал:', htmlContent.length);
      return res.status(400).json({
        success: false,
        message: 'Файл пуст или содержит недостаточно данных для обработки'
      });
    }
    const parserResult = parseTournamentData(htmlContent, userTimezone);
    
    // Проверка на наличие ключевых маркеров в HTML
    if (!htmlContent.includes('<table') || !htmlContent.includes('cdk-table') || !htmlContent.includes('cdk-row')) {
      console.error('Файл не содержит необходимых HTML-элементов таблицы');
      return res.status(400).json({
        success: false,
        message: 'Файл не содержит таблицу с историей турниров PokerCraft. Убедитесь, что вы загружаете правильный файл.'
      });
    }
    
    console.log('Размер HTML контента:', htmlContent.length, 'символов');
    
    
    // Извлекаем данные из результата парсера
    const { tournaments, stats: parserStats, errors: parsingErrors } = parserResult;
    
    console.log('Результаты парсинга:', {
      tournaments: tournaments.length,
      totalRows: parserStats.totalRows,
      parsedRows: parserStats.parsedRows,
      skippedRows: parserStats.skippedRows,
      errors: parsingErrors.length
    });
    
    if (!tournaments || tournaments.length === 0) {
      console.error('Не удалось извлечь данные о турнирах из файла:', {
        errors: parsingErrors.slice(0, 3)
      });
      return res.status(400).json({
        success: false,
        message: 'Не удалось извлечь данные о турнирах из файла. Проверьте, что это корректный файл истории PokerCraft',
        parsingErrors: parsingErrors.slice(0, 10) // Первые 10 ошибок для отладки
      });
    }
    
    console.log(`Извлечено турниров из файла: ${tournaments.length}`);

    // Статистика импорта
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const importErrors = [];
    
    // Получение пользователя
    console.log('Получение пользователя с ID:', req.userId);
    const user = await User.findByPk(req.userId);
    if (!user) {
      console.error('Пользователь не найден:', req.userId);
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Обработка каждого турнира
    console.log('Начало обработки турниров...');
    for (const tour of tournaments) {
      try {
        // Проверка на существование дубликата
        const existing = await Tournament.findOne({
          where: { 
            tournament_hash: tour.tournament_hash,
            userId: req.userId
          }
        });

        if (!existing) {
          // Добавление ID пользователя
          tour.userId = req.userId;
          
          // Создание записи турнира
          await Tournament.create(tour);
          importedCount++;
        } else {
          skippedCount++;
        }
      } catch (tourError) {
        console.error('Ошибка сохранения турнира:', tourError);
        errorCount++;
        importErrors.push({
          hash: tour.tournament_hash,
          date: tour.start_time,
          error: tourError.message
        });
      }
    }

    // Расчет статистики
    const totalProcessed = importedCount + skippedCount + errorCount;
    
    console.log('Результаты импорта:', {
      imported: importedCount,
      skipped: skippedCount,
      errors: errorCount,
      total: totalProcessed
    });
    
    // Подготовка подробной статистики
    const detailedStats = {
      fileInfo: {
        name: htmlFile.name,
        size: Math.round(htmlFile.size / 1024) + ' KB'
      },
      parsing: {
        totalRows: parserStats.totalRows,
        parsedRows: parserStats.parsedRows,
        skippedRows: parserStats.skippedRows,
        errorCount: parsingErrors.length
      },
      import: {
        total: tournaments.length,
        imported: importedCount,
        skipped: skippedCount,
        errors: errorCount,
        percentage: totalProcessed ? Math.round((importedCount / totalProcessed) * 100) : 0
      }
    };
    
    console.log('====== Завершение обработки загрузки файла ======');
    
    // Подготовка ответа
    res.json({
      success: true,
      message: `Обработка файла завершена успешно`,
      data: {
        total: tournaments.length,
        imported: importedCount,
        skipped: skippedCount,
        errors: errorCount,
        percentage: totalProcessed ? Math.round((importedCount / totalProcessed) * 100) : 0
      },
      detailedStats,
      debugInfo: {
        parsingErrors: parsingErrors.slice(0, 5), // Ограничиваем до 5 ошибок для отладки
        importErrors: importErrors.slice(0, 5)    // Ограничиваем до 5 ошибок для отладки
      }
    });
  } catch (error) {
    console.error('Ошибка обработки файла:', error);
    res.status(500).json({
      success: false,
      message: 'Произошла ошибка при обработке файла',
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};

// Получение общей статистики по турнирам пользователя
exports.getStats = async (req, res) => {
  try {
    // Фильтры из запроса
    const { 
      includeRakeback, 
      rakebackPercentage,
      buyin,
      place,
      startDate,
      endDate,
      dayOfWeek
    } = req.query;
    
    const rakebackPercent = parseFloat(rakebackPercentage) || 30;
    
    // Базовое условие - только турниры пользователя
    let whereConditions = { userId: req.userId };
    
    // Добавляем условия фильтрации, если они указаны
    if (buyin) {
      whereConditions.buyin_total = parseFloat(buyin);
    }
    
    if (place) {
      whereConditions.finish_place = parseInt(place);
    }
    
    if (startDate && endDate) {
      whereConditions.start_time = {
        [db.Sequelize.Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      whereConditions.start_time = { 
        [db.Sequelize.Op.gte]: startDate 
      };
    } else if (endDate) {
      whereConditions.start_time = { 
        [db.Sequelize.Op.lte]: endDate 
      };
    }
    
    if (dayOfWeek && dayOfWeek !== '') {
      whereConditions.weekday = parseInt(dayOfWeek);
    }
    
    // Получаем турниры с учетом фильтров
    const tournaments = await Tournament.findAll({
      where: whereConditions
    });

    if (!tournaments || tournaments.length === 0) {
      return res.json({
        success: true,
        message: 'Нет данных о турнирах',
        data: {
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
          rakebackPercentage: rakebackPercent
        }
      });
    }

    // Расчет статистики
    const totalBuyins = tournaments.reduce((sum, row) => sum + row.buyin_total, 0);
    const totalCommission = tournaments.reduce((sum, row) => sum + row.buyin_commission, 0);
    const totalBounties = tournaments.reduce((sum, row) => sum + row.prize_bounty, 0);
    const totalPrizes = tournaments.reduce((sum, row) => sum + row.prize_total, 0);
    const finalResult = tournaments.reduce((sum, row) => sum + row.net_profit, 0);
    
    // Расчет рейкбека
    const totalRakeback = totalCommission * (rakebackPercent / 100);
    
    // ROI с учетом/без учета рейкбека
    const baseRoi = totalBuyins > 0 ? (finalResult / totalBuyins * 100) : 0;
    const adjustedRoi = totalBuyins > 0 ? ((finalResult + (includeRakeback === 'true' ? totalRakeback : 0)) / totalBuyins * 100) : 0;
    
    // Статистика нокаутов
    const totalKnockouts = tournaments.reduce((sum, row) => sum + row.kills, 0);
    const emptyKnockouts = tournaments.reduce((sum, row) => sum + row.kills_nomoney, 0);
    const knockoutsWithPrize = tournaments.reduce((sum, row) => sum + row.kills_money, 0);
    const avgKnockoutPrice = knockoutsWithPrize > 0 ? (totalBounties / knockoutsWithPrize) : 0;

    // Топ-награды
    const topBounties = tournaments.filter(t => t.is_top_bounty).length;

    // Статистика по местам
    const placeStats = {
      first: tournaments.filter(t => t.finish_place === 1).length,
      top3: tournaments.filter(t => t.finish_place > 0 && t.finish_place <= 3).length,
      top10: tournaments.filter(t => t.finish_place > 0 && t.finish_place <= 10).length,
      outOfMoney: tournaments.filter(t => t.finish_place > 10).length
    };

    res.json({
      success: true,
      data: {
        totalTournaments: tournaments.length,
        filteredTournaments: tournaments.length, // Без фильтров показываем все
        totalBuyins: parseFloat(totalBuyins.toFixed(2)),
        totalCommission: parseFloat(totalCommission.toFixed(2)),
        totalBounties: parseFloat(totalBounties.toFixed(2)),
        topBounties,
        totalPrizes: parseFloat(totalPrizes.toFixed(2)),
        finalResult: parseFloat(finalResult.toFixed(2)),
        roi: parseFloat(includeRakeback === 'true' ? adjustedRoi.toFixed(2) : baseRoi.toFixed(2)),
        emptyKnockouts,
        avgKnockoutPrice: parseFloat(avgKnockoutPrice.toFixed(2)),
        totalKnockouts,
        totalRakeback: parseFloat(totalRakeback.toFixed(2)),
        rakebackPercentage: rakebackPercent,
        placeStats,
        // Возвращаем отфильтрованные турниры для графиков
        filteredTournamentsData: tournaments.map(t => ({
          id: t.id,
          start_time: t.start_time,
          buyin_total: t.buyin_total,
          buyin_commission: t.buyin_commission,
          prize_total: t.prize_total,
          prize_bounty: t.prize_bounty,
          net_profit: t.net_profit,
          kills: t.kills,
          kills_money: t.kills_money
        }))
      }
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({
      success: false,
      message: 'Произошла ошибка при получении статистики',
      error: error.message
    });
  }
};