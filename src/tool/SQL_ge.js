const {getDBConfig} = require("../readConfig")
const os = require("node:os")

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
            _id
            INT
            UNSIGNED
            AUTO_INCREMENT
            PRIMARY
            KEY,
            ${fields}
        );
    `
}

/**
 * @param tb_name 表名
 * @param title_dataLine 标题和数据
 * */
function sql_insert_table(tb_name, {titleLine, dataLine}) {
    return `INSERT INTO ${tb_name} (${titleLine.join(',')})
            VALUES (${'?,'.repeat(titleLine.length - 1) + '?'});`
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