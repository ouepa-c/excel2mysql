const {readConfig, getDBConfig} = require("./src/readConfig")
const {link2Mysql} = require("./src/link2mysql")
const {handleExcelFiles} = require("./src/handleExcelFIles")
const {registerLogger, Log} = require("./src/tool/log")
const readline = require("node:readline")
const {AVATAR} = require("./config/constant")

const [_a1, _a2, ...args] = process.argv

async function start() {
    readline.emitKeypressEvents(process.stdin)
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true)
    }
    const mysqlClient = await link2Mysql(readConfig(args.length === 1, args))
    handleExcelFiles(mysqlClient)
    console.log(AVATAR)
    console.log(`程序执行完毕 按任意键退出......`)
    process.stdin.on('keypress', (str, key) => (key) && process.exit())
}

start()