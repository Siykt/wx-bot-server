# 微信机器人服务端

基于 koa + prisma + graphql 的服务端

## Getting started

1. 安装依赖

```sh
yarn
```

2. 创建 .env

默认配置参考:

```text
APP_HOST="http://localhost:10001"
APP_PREFIX="wx_bot"

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
