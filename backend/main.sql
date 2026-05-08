CREATE DATABASE IF NOT EXISTS sapedb;
USE sapedb;

CREATE TABLE IF NOT EXISTS user (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(240) NOT NULL,
<<<<<<< HEAD
    gmail VARCHAR(240) NOT NULL,
=======
    email VARCHAR(240) NOT NULL,
>>>>>>> 146ac3d (banco de dados feito e funcionando, para colocar para rodar so da cd backend e depois npm run dev)
    password VARCHAR(240) NOT NULL
);