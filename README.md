# 前置（notice）

这是一个基于`nodejs`开发的命令行工具，可以指定批量或单一的Excel文件`（仅支持xlsx）`转换成mysql数据表，为了更好的了解这个工具，你需要：

+ 安装`nodejs`版本>=` v22.13.1`（不知道nodejs没关系，下面有保姆级教程）

+ 具备`mysql`基础并了解其规范

+ 确保所有的Excel文件是一个标准的`常规`报表

    + > 第一行是标题行，其余都是数据行（没有合并的单元格！）

+ 确保所有Excel文件中**没有重复的报表**，否则会造成数据重复的问题

+ 确保所有Excel文件中没有空的单元格，在程序执行时有空单元格的数据行会被跳过，导致数据丢失（日志中可见）

+ 如不使用自定义类型，程序在判断数据类型时，是根据报表的**最后一行**判断，所以请补齐最后一行数据

    + 日期默认为`DATE`，数字默认为`DECIMAL`，字符串默认为`VARCHAR`，空单元格默认为`VARCHAR`。
  + 如果需要使用`DATETIME`或`TIMESTAMP`等其他数据类型，请参考<u>配置文件中的`custom_types`</u>

+ 确保最后一行数据的数据类型，代表所有数据行的数据类型

+ 确保你的MYSQL服务开启了native_password，参考[ERROR 1524 (HY000): Plugin ‘mysql_native_password‘ is not loaded](https://blog.csdn.net/xiaohua616/article/details/139477112).



由于excel和mysql之间的巨大鸿沟和性能原因，以上规则略微繁琐，但这是一劳永逸的工具，往下看吧~

# 配置文件（config）

在桌面上新建一个文件，后缀为`.json`，名称尽量使用英文命名，如`config.json`,然后将此代码复制到文件中

```json
{
  "host": "localhost",
  "port": "3306",
  "user": "root",
  "password": "123456",
  "database": "shop_data",
  "connectTimeout": 5,
  "varchar": 255,
  "decimal": [
    10,
    4
  ],
  "custom_types": {
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

**配置解释**：

> host：主机
>
> port：端口
>
> user：mysql用户
>
> password：密码
>
> database：数据库
>
> connectTimeout：数据库链接超时时间
>
> varchar：在没有传入自定义类型时，默认采用的字符串长度。提示，`百分比`也会使用varchar
>
> decimal：在没有传入自定义类型时，默认采用的数字精度
>
> custom_types：自定义表的数据类型，一个表即为工作簿中的一个工作表，如果你需要使用自定义数据类型，请补全所有字段的数据类型，参考本用法。

# 用法(Usage)

安装nodejs最新版本`（>=v22.13.1）`,[NodeJS安装](https://nodejs.org/en).

1. 下载项目到本地

![1](./docs/images/1.jpg)

2. 解压缩

![2](./docs/images/8.jpg)

3. 进入该目录

![3](./docs/images/9.jpg)

4. `shift`+右键打开命令行（最好是管理员模式）

![4](./docs/images/4.jpg)

5. 输入`node -v`，看下是否可以正常显示版本号，如果不行请上网自行搜索**`如何安装nodejs`**。

6. 输入`npm i`，安装所需要的依赖，然后等待片刻

![5](./docs/images/3.jpg)

7. 然后会发现多了node_modules目录

![6](./docs/images/2.jpg)

8. 运行程序，一共有两个参数 输入`npm start <配置文件地址> <excel或者excel目录的地址>`,然后回车

![7](./docs/images/10.jpg)

9. 出现这个报错，表示你没有关闭其中的某些excel文件，建议关闭所有excel窗口

![8](./docs/images/6.jpg)

10. 继续执行，出现这个表示执行成功，然后返回到程序的文件夹

![9](./docs/images/5.jpg)

11. 你会发现在上一层多了一个日志文件

![10](./docs/images/7.jpg)

# 常见的问题(Q/A)

