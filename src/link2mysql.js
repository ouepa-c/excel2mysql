const mysql = require("mysql")
const {Log} = require("./tool/log");

function link2Mysql(db_config) {
    const {promise, resolve} = Promise.withResolvers()
    const {host, port, user, password, database, connectTimeout} = db_config
    const mysqlClient = mysql.createConnection({
        multipleStatements: true,
        host,
        port,
        user,
        password,
        database,
        connectTimeout
    })
    mysqlClient.connect((err, args) => {
        err && console.error(err)
        new Log().SUCCESS(`数据库链接成功 (HOST:${host}, DATABASE:${database}, USER:${user}, PORT:${port})`)
        resolve(mysqlClient)
    })
    return promise
}

module.exports = {
    link2Mysql
}