const {readConfig, getDBConfig} = require("./src/readConfig")
const {link2Mysql} = require("./src/link2mysql")
const {handleExcelFiles} = require("./src/handleExcelFIles")
const {registerLogger} = require("./src/tool/log");

const [_a1, _a2, ...args] = process.argv

async function start() {
    const mysqlClient = await link2Mysql(readConfig(args.length === 1, args))
    handleExcelFiles(mysqlClient)
}

start()