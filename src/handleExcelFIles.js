const fs = require("node:fs")
const path = require("node:path")
const Excel = require('exceljs')
const {getDBConfig} = require("./readConfig")
const {CUSTOM_DATATYPES} = require("../config/constant")
const {isDateString} = require("./tool/isDateString")
const {DATE, VARCHAR, DECIMAL, sql_create_table, sql_insert_table} = require("./tool/SQL_ge")
const {Log} = require("./tool/log")
const os = require("node:os")
const {raw} = require("mysql")
const [_a1, _a2, ...args] = process.argv

/**
 * @remarks Map<sheetName => {sheetId,titleLine:[],dataLine:[],dataType:[],skip:boolean}>
 * */
const ExcelWorkBookKVMap = new Map()
let excelFileStat
let MYSQL_client

function handleExcelFiles(mysqlClient) {
    const excelFilePath = args[args.length === 1 ? 0 : 1]
    excelFileStat = fs.statSync(excelFilePath)
    MYSQL_client = mysqlClient
    const func = !excelFileStat.isFile() ? isDirectory : isFile
    new Log().SUCCESS(`excel文件路径获取成功 (${excelFilePath})`)
    new Log().split()
    func(excelFilePath)
}

function isFile(excelFilePath) {
    // 仅支持xlsx文件
    if (!path.extname(excelFilePath) === '.xlsx') {
        const msg = `<${excelFilePath}> is not a valid excel(xlsx) file`
        new Log().ERROR(msg)
        throw new Error()
    }
    handleExcelWB(excelFilePath)
}

function isDirectory(excelFilePath) {
    fs.readdirSync(excelFilePath, {
        encoding: "utf8", recursive: false, withFileTypes: true
    })
      .filter(d => path.extname(d.name) === '.xlsx')
      .forEach(d => handleExcelWB(path.join(d.parentPath, d.name)))
}

async function handleExcelWB(ePath) {
    const excelWB = new Excel.Workbook()
    await excelWB.xlsx.readFile(ePath)
    new Log().SUCCESS(`正在打开工作簿-->${ePath}`)
    excelWB.eachSheet((ws, id) => {
        const sheetId = ws.id
        const sheetObject = {titleLine: null, dataLine: [], dataType: [], skip: false}
        new Log().SUCCESS(`已打开工作表-->${ws.name}`)
        ws.getSheetValues().forEach((v, i) => {
            const [_u, ...t] = v
            if (i === 1) {
                sheetObject.titleLine = t
                new Log().SUCCESS(`标题行: [${t}]`)
                new Log().SUCCESS(`标题行长度: [${t.length}]`)
            } else {
                sheetObject.dataLine.push(t)
            }
        })
        new Log().SUCCESS(`数据行: [${sheetObject.dataLine.length}]`)
        ExcelWorkBookKVMap.set(ws.name, {sheetId, ...sheetObject})
    })
    Array.of(...ExcelWorkBookKVMap.keys()).forEach(sheet_name => possibleDataTypes(sheet_name, ExcelWorkBookKVMap))
    new Log().SUCCESS(`数据类型加载完毕 将进行SQL转换`)
    await SQL_CREATE_TABLE(ExcelWorkBookKVMap)
    await SQL_DATA_INSERT(ExcelWorkBookKVMap)
    new Log().split()
}

function SQL_CREATE_TABLE(ExcelWBKVMap) {
    const {promise, resolve} = Promise.withResolvers()
    Array.of(...ExcelWBKVMap.keys()).forEach(sheetName => {
        const sheetOptions = ExcelWBKVMap.get(sheetName)
        if (!sheetOptions.skip) {
            const {titleLine, dataType} = sheetOptions
            const s_create_table = sql_create_table(sheetName, {titleLine, dataType})
            new Log().SUCCESS(`{{${sheetName}}}建表SQL:${os.EOL}${s_create_table}`)
            MYSQL_client.query(s_create_table, (err, result) => {
                if (err) {
                    new Log().ERROR(`{{${sheetName}}}建表失败: [${err}]`)
                    sheetOptions.skip = true
                } else {
                    new Log().SUCCESS(`{{${sheetName}}}建表成功`)
                }
            })
        }
    })
    resolve()
    return promise
}

function SQL_DATA_INSERT(ExcelWBKVMap) {
    // todo BUG:表重复添加数据
    const {promise, resolve} = Promise.withResolvers()
    Array.of(...ExcelWBKVMap.keys()).forEach(sheetName => {
        const sheetOptions = ExcelWBKVMap.get(sheetName)
        if (!sheetOptions.skip) {
            new Log().SUCCESS(`正在上载数据至{{${sheetName}}}`)
            let i = 0
            const {titleLine, dataLine, dataType} = sheetOptions
            for (let i = 0; i < dataLine.length; i++) {
                const d = dataLine[i]
                const insert_str = sql_insert_table(sheetName, {titleLine})
                if (d.length === sheetOptions.titleLine.length) {
                    MYSQL_client.query(insert_str, d, (err) => {
                        if (err) {
                            new Log().ERROR(`{{${sheetName}}}在上载数据时出错，第${i + 1}行:[${d}],[${err}]`)
                        } else {
                            // todo 数据库查询是异步的 计数失效
                            i++
                        }
                    })
                } else {
                    new Log().WARNING(`{{${sheetName}}}在上载数据时出错，第${i + 1}行长度错误:[${d}]`)
                }
            }
            new Log().SUCCESS(`{{${sheetName}}}共${sheetOptions.dataLine.length}行数据,成功写入${i}行.`)
            new Log().split()
        }
    })
    resolve()
    return promise
}

/**
 * @remarks 根据dataLine 判断数据类型
 * @param sheetName 表名
 * @param ExcelWBKVMap 数据存储表
 * */
function possibleDataTypes(sheetName, ExcelWBKVMap) {
    const sheet = ExcelWBKVMap.get(sheetName)
    const custom_types = getDBConfig()[CUSTOM_DATATYPES]
    const cTtypes = custom_types[sheetName]
    const cTkeys = Object.keys(cTtypes || [])
    let msg = ''

    const defaultHandler = (f) => ({
        'string': () => isDateString(f) ? sheet.dataType.push(DATE()) : sheet.dataType.push(VARCHAR()),
        'number': () => sheet.dataType.push(DECIMAL()),
        'undefined': () => {
            new Log().WARNING(`检测到{{${sheetName}}}中有空值字段请检查excel工作表`)
            sheet.dataType.push(VARCHAR())
        }
    })

    // 读取自定义 数据类型[custom_types] 配置
    if (
        !!custom_types
        && !!cTtypes
        && (custom_types.constructor === Object)
        && ([...new Set(cTkeys)].length === sheet.titleLine.length)
    ) {
        sheet.dataType = new Array(custom_types[sheetName].length).fill()
        sheet.titleLine.forEach((t, i) => {
            sheet.dataType[i] = cTtypes[t]
            msg += `"${t}":${cTtypes[t]},`
        })
        new Log().SUCCESS(`获取到{{${sheetName}}}【自定义】数据类型: [${msg}]`)
    }
    // default
    else {
        // todo 完善当数据为空或数据长度不足时的类型匹配
        new Log().SUCCESS(`未获取到{{${sheetName}}}【自定义】数据类型,将根据字段分配数据类型,请确保最新的数据行没有空值`)
        if (sheet.dataLine[sheet.dataLine.length - 1].length !== sheet.titleLine.length) {
            new Log().ERROR(`工作表{{${sheetName}}}最新数据行长度和标题行长度不一，请弥补数据行，该表跳过【skip】`)
            sheet.skip = true
            return
        }
        sheet.dataLine[sheet.dataLine.length - 1].forEach((f, i) => defaultHandler(f)[typeof f]())
        sheet.titleLine.forEach((t, i) => msg += `"${t}":${sheet.dataType[i]},`)
        new Log().SUCCESS(`未获取到{{${sheetName}}}【自定义】数据类型,已分配数据类型: [${msg}]`)
        new Log().split()
    }
}

module.exports = {
    handleExcelFiles
}