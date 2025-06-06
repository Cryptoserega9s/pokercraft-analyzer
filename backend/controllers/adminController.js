// backend/controllers/adminController.js
const { User, Tournament, sequelize, Sequelize } = require('../models');
const { Op } = Sequelize;

// Функция getAllUsers остается без изменений
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: [
                'id', 'email', 'role', 'createdAt',
                [sequelize.fn('COUNT', sequelize.col('Tournaments.id')), 'tournamentsCount'],
                [sequelize.fn('SUM', sequelize.col('Tournaments.net_profit')), 'totalNetProfit']
            ],
            include: [{ model: Tournament, attributes: [], as: 'Tournaments' }],
            group: ['User.id'],
            order: [['createdAt', 'DESC']],
            raw: true
        });

        const formattedUsers = users.map(user => ({
            id: user.id, email: user.email, role: user.role,
            registrationDate: user.createdAt,
            tournamentsCount: parseInt(user.tournamentsCount, 10) || 0,
            totalNetProfit: parseFloat(user.totalNetProfit) || 0
        }));

        res.json({ success: true, data: formattedUsers });
    } catch (error) {
        console.error('Ошибка получения списка пользователей:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера при получении пользователей' });
    }
};

// --- ОБНОВЛЕННАЯ ФУНКЦИЯ getUserStats ---
exports.getUserStats = async (req, res) => {
    const { userId } = req.params;
    try {
        // <<< НАЧАЛО БЛОКА ФИЛЬТРАЦИИ >>>
        const { buyin, place, startDate, endDate, dayOfWeek, startTime, endTime, includeRakeback, rakebackPercentage = '30' } = req.query;
        const whereClause = { userId }; // Базовое условие - всегда для конкретного пользователя

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
            else if (!isNaN(parseInt(place))) whereClause.finish_place = parseInt(place);
        }
        // <<< КОНЕЦ БЛОКА ФИЛЬТРАЦИИ >>>

        const stats = await Tournament.findOne({
            where: whereClause, // <<< ИСПОЛЬЗУЕМ ФИЛЬТРЫ
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalTournaments'],
                [sequelize.fn('SUM', sequelize.col('buyin_total')), 'totalBuyins'],
                [sequelize.fn('SUM', sequelize.col('buyin_commission')), 'totalCommission'],
                [sequelize.fn('SUM', sequelize.col('prize_total')), 'totalPrizes'],
                [sequelize.fn('SUM', sequelize.col('prize_bounty')), 'totalBounties'],
                [sequelize.fn('SUM', sequelize.col('net_profit')), 'finalResult'],
                [sequelize.fn('SUM', sequelize.col('kills')), 'totalKnockouts'],
                [sequelize.fn('COUNT', sequelize.literal("CASE WHEN is_top_bounty = true THEN 1 END")), 'topKnockouts']
            ],
            raw: true
        });

        const user = await User.findByPk(userId, { attributes: ['id', 'email', 'createdAt'] });

        if (!stats || !stats.totalTournaments) {
            return res.json({ success: true, data: { totalTournaments: 0, user } });
        }
        
        const roi = stats.totalBuyins > 0 ? ((stats.finalResult || 0) / stats.totalBuyins) * 100 : 0;
        stats.roi = parseFloat(roi.toFixed(2));
        
        res.json({ success: true, data: { ...stats, user } });

    } catch (error) {
        console.error(`Ошибка получения статистики для пользователя ${userId}:`, error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

// --- ОБНОВЛЕННАЯ ФУНКЦИЯ getUserTournaments ---
exports.getUserTournaments = async (req, res) => {
    const { userId } = req.params;
    try {
        // <<< НАЧАЛО БЛОКА ФИЛЬТРАЦИИ >>>
        const { page = 1, limit = 10000, sortField = 'start_time', sortDirection = 'desc',
                buyin, place, startDate, endDate, dayOfWeek, startTime, endTime } = req.query;
        const whereClause = { userId };

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
            else if (!isNaN(parseInt(place))) whereClause.finish_place = parseInt(place);
        }
        // <<< КОНЕЦ БЛОКА ФИЛЬТРАЦИИ >>>

        const { count, rows } = await Tournament.findAndCountAll({
            where: whereClause, // <<< ИСПОЛЬЗУЕМ ФИЛЬТРЫ
            order: [[sortField, sortDirection]],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            data: rows, total: count, currentPage: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit))
        });
    } catch (error) {
        console.error(`Ошибка получения турниров для пользователя ${userId}:`, error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};