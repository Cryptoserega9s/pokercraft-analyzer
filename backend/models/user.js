// backend/models/user.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      // <<< НОВОЕ ПОЛЕ >>>
      type: DataTypes.STRING,
      defaultValue: 'user', // Значения: 'user' или 'admin'
      allowNull: false
    }
  });

  // <<< НОВЫЙ БЛОК ДЛЯ СВЯЗЕЙ >>>
  User.associate = function(models) {
    // Пользователь имеет много турниров
    User.hasMany(models.Tournament, {
      foreignKey: 'userId',
      as: 'Tournaments' // Псевдоним для использования в запросах
    });
  };

  return User;
};