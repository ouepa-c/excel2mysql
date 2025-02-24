const {readConfig, getDBConfig} = require("./src/readConfig")
const {link2Mysql} = require("./src/link2mysql")
const {handleExcelFiles} = require("./src/handleExcelFIles")
const {registerLogger, Log} = require("./src/tool/log")
const readline = require("node:readline")
const {AVATAR} = require("./config/constant")
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})
const askQuestions = (question) => new Promise((resolve) => {
    rl.question(question, answer => {
        resolve(answer)
    })
})
const args = []

async function start() {
    readline.emitKeypressEvents(process.stdin)
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true)
    }
    args.push(await askQuestions('请输入配置文件地址:'))
    args.push(await askQuestions('请输入Excel文件或目录地址(仅支持xlsx):'))
    const config = await readConfig(args.length === 1, args)
    handleExcelFiles(await link2Mysql(config), args)
    console.log(AVATAR)
    console.log(`程序执行完毕 按任意键退出......`)
    process.stdin.on('keypress', (str, key) => {
        if (key) {
            rl.close()
            process.exit(0)
        }
    })
}

start()