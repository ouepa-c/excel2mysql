/**
 * @remarks 判断一个字符串是不是日期
 * */
function isDateString(str) {
    const regex1 = /^\d{4}-\d{1,2}-\d{1,2}$/
    const regex2 = /^\d{4}\/\d{1,2}\/\d{1,2}$/
    if (regex1.test(str) || regex2.test(str)) {
        let parts = str.split(/[-/]/)
        let year = parseInt(parts[0], 10)
        let month = parseInt(parts[1], 10)
        let day = parseInt(parts[2], 10)
        if (month < 1 || month > 12) {
            return false
        }
        // 定义每个月的最大天数
        let maxDays
        if (month === 2) {
            // 闰年判断
            if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
                maxDays = 29
            } else {
                maxDays = 28
            }
        } else if (month === 4 || month === 6 || month === 9 || month === 11) {
            maxDays = 30
        } else {
            maxDays = 31
        }
        // 检查日期是否在 1 到 maxDays 之间
        return !(day < 1 || day > maxDays)
    }
    return false
}

module.exports = {
    isDateString
}