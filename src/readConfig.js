const fs = require("node:fs")
const {
    DefaultDataBaseConfigurationFileName,
    DefaultDataBaseConfiguration,
    CUSTOM_DATATYPES
} = require("../config/constant")
const path = require("node:path")
const {Log} = require("./tool/log")
let db_config = {}

/**
 * @remarks 读取数据库的配置
 * @param isDefaultDBConfig 是否获取默认的配置文件地址
 * */
function readConfig(isDefaultDBConfig, args) {
    let c = ""
    let p = path.resolve(process.cwd(), isDefaultDBConfig ? DefaultDataBaseConfigurationFileName : args[0])
    try {
        // 读取默认配置
        c = fs.readFileSync(p, {encoding: 'utf8'})
        if (!c) {
            // 文件无内容
            const msg = `[Wrong Content]${p} has no content`
            throw new Error(msg)
        }
        db_config = configurationResolver(JSON.parse(c))
        new Log().SUCCESS(`配置文件读取成功 (config_path:${p})`)
        return db_config
    } catch (err) {
        new Log().ERROR(err)
    }
}

/**
 * @remarks 检查配置文件是否正确
 * */
function configurationResolver(config) {
    const keys = Object.keys(config)
    DefaultDataBaseConfiguration.forEach(k => {
        if (!keys.includes(k)) {
            const msg = `[Wrong Content] No such key=> "${k}" found in configuration`
            throw new Error(msg)
        }
    })
    return config
}

function getDBConfig() {
    return db_config
}

module.exports = {
    readConfig,
    getDBConfig
}