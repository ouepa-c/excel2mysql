const {getDBConfig} = require("../readConfig")
const os = require("node:os")
const {FIELD_ID} = require("../../config/constant")

/**
 * @param tb_name 表名
 * @param title_datatype 标题和数据类型
 * */
function sql_create_table(tb_name, {titleLine, dataType}) {
    let fields = ''
    titleLine.forEach((t, i) => {
        fields += `${t}\t${dataType[i]}${i === titleLine.length - 1 ? os.EOL : ','}`
    })

    return `
        CREATE TABLE IF NOT EXISTS ${tb_name}
        (
            ${FIELD_ID},
            ${fields}
        ) ENGINE = innoDB CHARSET utf8mb4;
    `
}

/**
 * @param tb_name 表名
 * @param titleLine 标题
 * @param data 数据行
 * */
function sql_insert_table(tb_name, titleLine, data) {
    const titles = titleLine.filter((t, i) => !!data[i])
    return `INSERT INTO ${tb_name} (${titles.join(',')})
            VALUES (${'?,'.repeat(titles.length - 1) + '?'});`
}

function VARCHAR(num = getDBConfig()['varchar']) {
    return `VARCHAR(${+num})`
}

function DECIMAL(arr = getDBConfig()['decimal']) {
    return `DECIMAL(${arr[0]},${arr[1]})`
}

function DATE() {
    return 'DATE'
}

module.exports = {
    sql_create_table,
    sql_insert_table,
    VARCHAR,
    DECIMAL,
    DATE
}