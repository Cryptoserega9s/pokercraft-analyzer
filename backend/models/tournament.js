'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Tournament extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Турнир принадлежит одному пользователю
      Tournament.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user' // Псевдоним для использования в запросах
      });
    }
  }
  Tournament.init({
    userId: DataTypes.INTEGER,
    tournament_hash: DataTypes.STRING,
    start_time: DataTypes.DATE,
    weekday: DataTypes.INTEGER,
    buyin_total: DataTypes.FLOAT,
    buyin_prize_pool: DataTypes.FLOAT,
    buyin_commission: DataTypes.FLOAT,
    buyin_bounty: DataTypes.FLOAT,
    finish_place: DataTypes.INTEGER,
    prize_total: DataTypes.FLOAT,
    prize_place: DataTypes.FLOAT,
    prize_bounty: DataTypes.FLOAT,
    kills: DataTypes.INTEGER,
    duration: DataTypes.STRING,
    net_profit: DataTypes.FLOAT,
    is_top_bounty: DataTypes.BOOLEAN,
    kills_money: DataTypes.INTEGER,
    kills_nomoney: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Tournament',
  });
  return Tournament;
};