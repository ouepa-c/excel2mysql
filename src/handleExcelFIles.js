const fs = require("node:fs")
const path = require("node:path")
const Excel = require('exceljs')
const {getDBConfig} = require("./readConfig")
const {CUSTOM_DATATYPES} = require("../config/constant")
const {isDateString} = require("./tool/isDateString")
const {DATE, VARCHAR, DECIMAL, sql_create_table, sql_insert_table} = require("./tool/SQL_ge")
const {Log} = require("./tool/log")
const os = require("node:os")

/**
 * @remarks Map<sheetName => {sheetId,titleLine:[],dataLine:[],dataType:[],skip:boolean}>
 * */
const ExcelWorkBookKVMap = new Map()
let excelFileStat
let MYSQL_client

function handleExcelFiles(mysqlClient, args) {
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
        throw new Error(msg)
    }
    handleExcelWB(excelFilePath)
}

function isDirectory(excelFilePath) {
    fs.readdirSync(excelFilePath, {
        encoding: "utf8", recursive: false, withFileTypes: true
    })
      .filter(d => path.extname(d.name) === '.xlsx')
      .forEach(d => handleExcelWB(path.join(excelFilePath, d.name)))
}

async function handleExcelWB(ePath) {
    const custom_types = getDBConfig()[CUSTOM_DATATYPES]
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
                // 截断数据行超出
                sheetObject.dataLine.push(t.slice(0, sheetObject.titleLine.length))
            }
        })
        new Log().SUCCESS(`数据行: [${sheetObject.dataLine.length}]`)
        ExcelWorkBookKVMap.set(ws.name, {sheetId, ...sheetObject})
    })
    Array.of(...ExcelWorkBookKVMap.keys())
         .forEach(sheet_name =>
             possibleDataTypes(sheet_name, ExcelWorkBookKVMap,
                 !!custom_types[sheet_name] ? custom_types[sheet_name] : {}
             )
         )
    new Log().SUCCESS(`所有表格数据类型加载完毕 将进行建表`)
    await SQL_CREATE_TABLE(ExcelWorkBookKVMap)
    new Log().SUCCESS(`建表步骤完成 将进行数据插入`)
    await SQL_DATA_INSERT(ExcelWorkBookKVMap)
    new Log().split()
}

/**
 * @remarks 根据dataLine 判断数据类型
 * @param sheetName 表名
 * @param ExcelWBKVMap 数据存储表
 * @param custom_types 自定义数据类型
 * */
function possibleDataTypes(sheetName, ExcelWBKVMap, custom_types) {
    const sheet_options = ExcelWBKVMap.get(sheetName)
    let msg = ''

    const defaultHandler = (f) => ({
        'string': () => isDateString(f) ? sheet_options.dataType.push(DATE()) : sheet_options.dataType.push(VARCHAR()),
        'number': () => sheet_options.dataType.push(DECIMAL()),
        'undefined': () => sheet_options.dataType.push(VARCHAR()),
        'object': () => new Log().ERROR(`在{{${sheetName}}}中发现了特殊数据格式，请检查是否没有将【日期】格式转换为【文本】格式`)
    })

    // 读取[custom_types]
    if (
        (custom_types.constructor === Object)
        && ([...new Set(Object.keys(custom_types))].length === sheet_options.titleLine.length)
    ) {
        sheet_options.dataType = new Array(Object.keys(custom_types).length).fill()
        sheet_options.titleLine.forEach((t, i) => {
            sheet_options.dataType[i] = custom_types[t]
            msg += `"${t}":${custom_types[t]},`
        })
        new Log().SUCCESS(`获取到{{${sheetName}}}【自定义】数据类型: [${msg}]`)
    }
    // default
    else {
        new Log().SUCCESS(`未成功获取到{{${sheetName}}}【自定义】数据类型,将根据字段分配数据类型,请确保最新的数据行没有空值`)
        const latest_line = sheet_options.dataLine[sheet_options.dataLine.length - 1]
        if (latest_line.length !== sheet_options.titleLine.length) {
            new Log().ERROR(`工作表{{${sheetName}}}最后一行数据长度和标题行长度不一，程序根据最后一行数据判断数据类型，请补全，该表跳过【skip=true】`)
            sheet_options.skip = true
            return
        }
        latest_line.forEach((f, i) => defaultHandler(f)[typeof f]())
        sheet_options.titleLine.forEach((t, i) => msg += `"${t}":${sheet_options.dataType[i]},`)
        new Log().SUCCESS(`未获取到{{${sheetName}}}【自定义】数据类型,已分配数据类型: [${msg}]`)
        new Log().split()
    }
}

function SQL_CREATE_TABLE(ExcelWBKVMap) {
    return new Promise((resolve, reject) => {
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
                    }
                })
            }
        })
        resolve()
    })
}

function SQL_DATA_INSERT(ExcelWBKVMap) {
    return new Promise((resolve, reject) => {
        const ExcelTableKeys = Array.of(...ExcelWBKVMap.keys())
        ExcelTableKeys.forEach((sheetName, sIdx) => {
            const sheetOptions = ExcelWBKVMap.get(sheetName)
            if (!sheetOptions.skip) {
                new Log().SUCCESS(`正在上载数据至{{${sheetName}}}`)
                const {titleLine, dataLine, dataType} = sheetOptions
                // 遍历数据行
                f:for (let i = 0; i < dataLine.length; i++) {
                    const d = dataLine[i]
                    const insert_str = sql_insert_table(sheetName, titleLine, d)
                    MYSQL_client.query(insert_str, d.filter(t => !!t), (err) => {
                        if (err) {
                            new Log().ERROR(`{{${sheetName}}}在上载数据时出错，第${i + 2}行:[${dataLine[i]}],[${insert_str}],[${err}]`)
                        }
                    })
                }
                new Log().SUCCESS(`{{${sheetName}}}数据循环完毕${(sIdx === ExcelTableKeys.length - 1) ? '' : `,将循环{{${ExcelTableKeys[sIdx + 1]}}`}`)
                ExcelWBKVMap.get(sheetName).skip = true
            }
        })
        resolve()
    })
}

module.exports = {
    handleExcelFiles
}