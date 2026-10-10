STAR 自动跳转网站 - Render 部署说明

项目文件：
- server.js
- package.json
- public/admin.html

Render Web Service 设置：
Build Command: npm install
Start Command: npm start

必须设置的环境变量：
ADMIN_PASSWORD = 你自己的管理员密码
SESSION_SECRET = 一段足够长的随机字符串

可选：
DATA_DIR = /var/data

如果设置 DATA_DIR=/var/data，必须为 Render 服务添加 Persistent Disk，挂载路径为 /var/data。
如果不配置持久化磁盘，跳转网址保存在应用文件目录中，重新部署或重启后可能丢失。

部署后：
普通用户：首页 /
管理员后台：/admin

后台登录后填写完整网址，例如 https://example.com ，然后保存。
仅允许 http:// 或 https:// 开头的目标网址。
