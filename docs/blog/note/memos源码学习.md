---
title: memos源码学习
createTime: 2026/01/04 10:22:26
permalink: /blog/3v6a9rgu/
---
dbDriver, err := db.NewDBDriver(instanceProfile)
storeInstance := store.New(dbDriver, instanceProfile)

memos 把存储分了两层, 一层是 db 层, 负责和具体的数据库交互, 另一层是 store 层, 负责业务逻辑.

## 前端

把前端的加载逻辑给单独抽离出来了, 通过 `frontend` 包来实现.

```go
 frontend.NewFrontendService(profile, store).Serve(ctx, echoServer)
```

与之想对比的, 我想在就是写在 main 里面的, 而且是先加载的前端, 通过 config 来决定加载什么
