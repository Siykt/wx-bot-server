# 微信机器人服务端

基于 koa + prisma + graphql 的服务端

## Getting started

1. 安装依赖

```sh
yarn
```

win64 版本:

下载 chromium

> 已锁定 chromium 版本, 可自行寻找相关镜像

https://storage.googleapis.com/chromium-browser-snapshots/Win_x64/982053/chrome-win.zip

解压 zip 文件至 chrome 目录, 保证 `./chrome/chrome.exe` 为可执行程序

2. 创建 .env

默认配置参考:

```text
APP_HOST="http://localhost:10001"
APP_PREFIX="wx_bot"

STORAGE_ADAPTER=local
STORAGE_PATH="../public/"

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
DATABASE_URL=mysql://root:123456@127.0.0.1:3306/wx_bot
```

3. 同步数据库

```sh
yarn prisma db push
```

4. Start

```sh
yarn dev
```

or

```sh
yarn start
```
