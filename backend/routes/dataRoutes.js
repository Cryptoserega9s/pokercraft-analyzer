// backend/routes/dataRoutes.js

const express = require('express');
const router = express.Router();
const { sequelize, Tournament, Sequelize } = require('../models');
const { authenticate } = require('../middleware/authMiddleware');
const { Op } = Sequelize;

// --- Маршрут для получения списка турниров с фильтрами, сортировкой и пагинацией ---
router.get('/', authenticate, async (req, res) => {
    try {
        const {
            page = 1, limit = 25,
            sortField = 'start_time', sortDirection = 'desc',
            buyin, place, startDate, endDate, dayOfWeek, startTime, endTime
        } = req.query;

        const whereClause = { userId: req.user.id };

        if (buyin) whereClause.buyin_total = parseFloat(buyin);
        if (startDate && endDate) whereClause.start_time = { [Op.between]: [new Date(startDate), new Date(endDate)] };
        if (dayOfWeek) whereClause.weekday = parseInt(dayOfWeek);
        if (startTime && endTime) {
            whereClause[Op.and] = (whereClause[Op.and] || []).concat(
                sequelize.where(sequelize.fn('TO_CHAR', sequelize.col('start_time'), 'HH24:MI'), { [Op.between]: [startTime, endTime] })
            );
        }

        if (place) {
            if (place === 'itm') whereClause.prize_total = { [Op.gt]: 0 };
            else if (place === 'no_itm') whereClause.prize_total = { [Op.eq]: 0 };
            else if (place === 'top4-6') whereClause.finish_place = { [Op.between]: [4, 6] };
            else if (!isNaN(parseInt(place))) whereClause.finish_place = parseInt(place);
        }

        const allowedSortFields = ['start_time', 'buyin_total', 'prize_total', 'prize_bounty', 'finish_place', 'kills', 'duration'];
        const orderField = allowedSortFields.includes(sortField) ? sortField : 'start_time';
        const orderDirection = sortDirection.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const { count, rows } = await Tournament.findAndCountAll({
            where: whereClause,
            order: [[orderField, orderDirection]],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            data: rows,
            total: count,
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit))
        });

    } catch (error) {
        console.error('Ошибка получения данных турниров:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
});


// --- Маршрут для получения агрегированной статистики ---
router.get('/stats', authenticate, async (req, res) => {
    try {
        const { buyin, place, startDate, endDate, dayOfWeek, startTime, endTime, includeRakeback, rakebackPercentage = '30' } = req.query;
        const whereClause = { userId: req.user.id };

        if (buyin) whereClause.buyin_total = parseFloat(buyin);
        if (startDate && endDate) whereClause.start_time = { [Op.between]: [new Date(startDate), new Date(endDate)] };
        if (dayOfWeek) whereClause.weekday = parseInt(dayOfWeek);
        if (startTime && endTime) {
             whereClause[Op.and] = (whereClause[Op.and] || []).concat(
                sequelize.where(sequelize.fn('TO_CHAR', sequelize.col('start_time'), 'HH24:MI'), { [Op.between]: [startTime, endTime] })
            );
        }

        if (place) {
            if (place === 'itm') whereClause.prize_total = { [Op.gt]: 0 };
            else if (place === 'no_itm') whereClause.prize_total = { [Op.eq]: 0 };
            else if (place === 'top4-6') whereClause.finish_place = { [Op.between]: [4, 6] };
            else if (!isNaN(parseInt(place))) whereClause.finish_place = parseInt(place);
        }

        const stats = await Tournament.findOne({
            where: whereClause,
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalTournaments'],
                [sequelize.fn('SUM', sequelize.col('buyin_total')), 'totalBuyins'],
                [sequelize.fn('SUM', sequelize.col('buyin_commission')), 'totalCommission'],
                [sequelize.fn('SUM', sequelize.col('prize_total')), 'totalPrizes'],
                [sequelize.fn('SUM', sequelize.col('prize_bounty')), 'totalBounties'],
                [sequelize.fn('SUM', sequelize.col('net_profit')), 'finalResult'],
                [sequelize.fn('SUM', sequelize.col('kills')), 'totalKnockouts'],
                // --- ДОБАВЛЕНО: Расчет Топ-нокаутов ---
                [sequelize.fn('COUNT', sequelize.literal("CASE WHEN prize_bounty >= buyin_total * 10 THEN 1 END")), 'topKnockouts']
            ],
            raw: true
        });
        
        // Sequelize может вернуть null, если по фильтрам ничего не найдено
        if (!stats || !stats.totalTournaments) {
            return res.json({ totalTournaments: 0, /* ... и другие поля с нулями ... */ });
        }
        
        // --- БЛОК РАСЧЕТОВ В JAVASCRIPT ---

        // Расчет ROI
        const roi = stats.totalBuyins > 0 ? ((stats.finalResult || 0) / stats.totalBuyins) * 100 : 0;
        
        // Расчет рейкбека
        let rakebackReceived = 0;
        if (includeRakeback === 'true') {
            rakebackReceived = (stats.totalCommission || 0) * (parseFloat(rakebackPercentage) / 100);
        }

        // --- ДОБАВЛЕНО: Расчет ROI с рейкбеком ---
        const finalResultWithRakeback = (stats.finalResult || 0) + rakebackReceived;
        const roiWithRakeback = stats.totalBuyins > 0 ? (finalResultWithRakeback / stats.totalBuyins) * 100 : 0;

        // --- ФИНАЛЬНЫЙ JSON ДЛЯ ОТПРАВКИ ---
        res.json({
            ...stats,
            roi: parseFloat(roi.toFixed(2)),
            rakebackReceived: parseFloat(rakebackReceived.toFixed(2)),
            rakebackPercentage: parseFloat(rakebackPercentage),
            // --- ДОБАВЛЕНЫ НОВЫЕ ПОЛЯ ---
            roiWithRakeback: parseFloat(roiWithRakeback.toFixed(2)),
            topKnockouts: parseInt(stats.topKnockouts) || 0 // Убедимся, что это число
        });

    } catch (error) {
        console.error('Ошибка при расчете статистики:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
});


module.exports = router;