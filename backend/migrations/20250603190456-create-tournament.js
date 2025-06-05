'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Tournaments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER
      },
      tournament_hash: {
        type: Sequelize.STRING
      },
      start_time: {
        type: Sequelize.DATE
      },
      weekday: {
        type: Sequelize.INTEGER
      },
      buyin_total: {
        type: Sequelize.FLOAT
      },
      buyin_prize_pool: {
        type: Sequelize.FLOAT
      },
      buyin_commission: {
        type: Sequelize.FLOAT
      },
      buyin_bounty: {
        type: Sequelize.FLOAT
      },
      finish_place: {
        type: Sequelize.INTEGER
      },
      prize_total: {
        type: Sequelize.FLOAT
      },
      prize_place: {
        type: Sequelize.FLOAT
      },
      prize_bounty: {
        type: Sequelize.FLOAT
      },
      kills: {
        type: Sequelize.INTEGER
      },
      duration: {
        type: Sequelize.STRING
      },
      net_profit: {
        type: Sequelize.FLOAT
      },
      is_top_bounty: {
        type: Sequelize.BOOLEAN
      },
      kills_money: {
        type: Sequelize.INTEGER
      },
      kills_nomoney: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Tournaments');
  }
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Tournaments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      tournament_hash: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: false
      },
      weekday: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      buyin_total: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      buyin_prize_pool: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      buyin_commission: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      buyin_bounty: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      finish_place: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      prize_total: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      prize_place: {
        type: Sequelize.FLOAT
      },
      prize_bounty: {
        type: Sequelize.FLOAT
      },
      kills: {
        type: Sequelize.INTEGER
      },
      duration: {
        type: Sequelize.STRING
      },
      net_profit: {
        type: Sequelize.FLOAT
      },
      is_top_bounty: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      kills_money: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      kills_nomoney: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
// Добавляем индексы
    await queryInterface.addIndex('Tournaments', ['userId'], {
      name: 'idx_user_id',
      using: 'BTREE'
    });

    await queryInterface.addIndex('Tournaments', ['buyin_total'], {
      name: 'idx_buyin_total',
      using: 'BTREE'
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('Tournaments');
  }
};