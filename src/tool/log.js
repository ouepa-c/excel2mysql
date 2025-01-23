const {DefaultLoggingDir} = require("../../config/constant")
const path = require("node:path")
const inspector = require("node:inspector")
const fs = require("node:fs")
const os = require("node:os")
let log_instance

class _Log {
    log_dir
    time_stamp
    current_file

    constructor() {
        this.log_dir = path.resolve(process.cwd(), DefaultLoggingDir)
        // make sure
        if (!fs.existsSync(this.log_dir)) {
            fs.mkdirSync(this.log_dir, {recursive: true})
        }
        this.time_stamp = this.getTimestamp(true)
        this.current_file = path.resolve(this.log_dir, this.time_stamp + '.log')

    }

    SUCCESS(c) {
        this.write(c, `[Success] `)
    }

    ERROR(c) {
        this.write(c, `[Error!!!!!!!!!] `)
    }

    WARNING(c) {
        this.write(c, `[WARNING!!!!!!!!!!] `)
    }

    write(c, flag = '') {
        fs.writeFileSync(this.current_file, (`${flag}${this.getTimestamp()} ${c}` + os.EOL), {
            encoding: 'utf8',
            flag: 'a+'
        })
    }

    split() {
        this.write('----------------------------------------'.repeat(7) + '>' + os.EOL)
    }

    end() {
        fs.closeSync(this.current_file)
    }

    getTimestamp(isFile = false) {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        const seconds = String(now.getSeconds()).padStart(2, '0')
        return isFile
            ? `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`
            : `[${year}-${month}-${day} ${hours}:${minutes}:${seconds}]`
    }
}

const Log = new Proxy(_Log, {
    construct(target, argArray, newTarget) {
        if (!log_instance) {
            log_instance = new target(...argArray)
        }
        return log_instance
    }
})

module.exports = {
    Log
}