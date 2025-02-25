# 前置(notice)

> 这是一款基于nodejs(>=18.5)开发的命令行工具，主要用于将电商、财务等各种数据报表转换成mysql数据库，同时支持**批量转换**、**旧表新增**、**自动判断数据类型**。
>
> 只需要一个简单的配置文件，即可实现以上功能~

# 工作流程(flow)
1. 首先，程序会根据传入的配置文件链接数据库（这里需要MySQL服务开启``native password``功能，[参考此处](https://blog.csdn.net/xiaohua616/article/details/139477112)）
2. 根据传入的excel文件或目录检索所有.xlsx结尾的文件（非递归，只检索第一层目录）
3. 遍历所有excel工作簿的所有工作表(sheet)，将每一个工作表(sheet)视为一个MySQL的table
4. 根据工作表的名称创建MySQL table，加入了`IF NOT EXISTS`。**注意，如果有相同的工作表名称，他们的数据会被合并**


# 配置文件(config)

创建.json为后缀的文件，将下面代码复制到文件中（记得删除注释"// anything"）。以下是各参数解释：
```json
{
  "host": "localhost",// mysql主机
  "port": "3306",// mysql端口
  "user": "root",// mysql用户名
  "password": "123456",// mysql密码，这里需要MysqlServer开启native password功能，下面会提到~
  "database": "shop_data",// 数据库（提前创建好的，程序不会帮你创建数据库）
  "connectTimeout": 5,// 数据库链接超时时间
  "varchar": 255,// 未传入自定义类型时，默认的字符串长度
  "decimal": [10,4],// 未传入自定义类型时，默认的数字精度
  "custom_types": {// 表自定义类型
    "表1": {
      "店铺名称": "VARCHAR(50)",
      "日期": "DATE",
      "销售额": "DECIMAL(10,4)",
      "浏览量": "DECIMAL(10,4)",
      "访客": "DECIMAL(10,4)",
      "转化率": "VARCHAR(50)",
      "客单价": "DECIMAL(10,4)",
      "老客销售额": "DECIMAL(10,4)",
      "老客销售占比": "VARCHAR(50)",
      "退款金额": "DECIMAL(10,4)",
      "退款率": "VARCHAR(50)",
      "推广费": "DECIMAL(10,4)"
    },
    "表2": {
      "店铺名称": "VARCHAR(50)",
      "日期": "DATE",
      "销售额": "DECIMAL(10,4)",
      "浏览量": "DECIMAL(10,4)",
      "访客": "DECIMAL(10,4)",
      "转化率": "VARCHAR(50)",
      "客单价": "DECIMAL(10,4)",
      "老客销售额": "DECIMAL(10,4)",
      "老客销售占比": "VARCHAR(50)",
      "退款金额": "DECIMAL(10,4)",
      "退款率": "VARCHAR(50)",
      "推广费": "DECIMAL(10,4)"
    }
  }
}

```
