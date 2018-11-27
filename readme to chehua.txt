一、需要安装node-v0.10.28-x64.msi，运行export.bat

二、只支持文件格式.xlsx(2007及以上版本)导出json

三、excel第1行：标题注释，第2行：json字段名，数据读取是从第3行开始

###【特殊关键字解析】第1行第1列关键字
$OBJECT/$object: 解析json对象
默认是：解析数组对象

四、支持以下数据类型，(eg：字段id，isUse，name，time，address，heroIds，map，words，heroes)
说明				类型				字段规则		填入数据					使用程度
#basic&int 			(所有类型)			id#basic		(1,true,啦啦)				常用
#basic&float 		(所有类型)			id#basic		(1,1.2,2.4,true,啦啦)		常用
#basic&double		(所有类型) 			id#basic		(1,1.2,2.4,true,啦啦)		常用
#bool  				布尔				isUse#bool		true						常用
#string 			字符串				name#string		啦啦						常用
#date 				日期类型			time#date		2015-9-8 15:15:15			偶尔
#object 			对象   				address#{}		id:1;detail:运动公园		偶尔，不支持对象内有数组以及对象嵌套对象防止表格过度复杂。
#number-array  		数字数组			heroIds#[]		1,2,3						偶尔
#boolean-array  	布尔数组			map#[]			true,false					偶尔
#string-array  		字符串数组			words#[]		shit,my god					偶尔
#object-array 		对象数组			heroes#[{}]		id:1;level:2,id:2;level:3	偶尔
#json				json字符串			heroes#json		{"id":1,"level":2}			偶尔

注：
1.basic&int,basic&float,basic&double基本数据类型(bool,string,(int或者float,double))时候，不需要设置会自动判断，也可以明确声明数据类型
2.规则，假如字段是id或name，可以id#number指定是数字，或name#string指定是string

五、key检查，支持primary key（主键）和unique key（唯一键）检查数据合法性，(eg：字段id，name，position，attribute 
说明				类型				字段规则									使用程度
*主键 				primary key			id*primary									常用
*唯一键  			unique key			name*unique[name]							常用
										或position*unique[position,attribute]		常用

注：
1.主键只能有一个，填多个只取第一个当主键
2.唯一键支持多个

六、需要导出的excel文件放在excel文件夹，导出后的文件放在json文件夹

七、json\log注意查看，如果有报错可以检查具体原因
info: 基本输出
warn: 警告语句，一般是key输入有误
error：出错语句，一般主键，唯一键有冲突，填入的数据转化有问题

八、支持OBJECT对象转化，第一行第一列填关键字$object或$OBJECT