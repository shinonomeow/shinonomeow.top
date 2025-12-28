---
title: Go 正则表达式性能对比：标准库 vs regexp2 前瞻
createTime: 2025/10/04 17:36:07
permalink: /article/xbp8dxg2/
---


在解析动漫标题时，经常需要从标题中提取字幕组信息。例如：

这个标题中包含了 5 个字幕组名称，它们都在同一个方括号内，用空格或 `&` 分隔。

<!-- more -->

```
[百冬练习组&LoliHouse 猎户手抄部 喵萌奶茶屋 萌樱字幕组] 元祖！邦多利酱 / GANSO BanG Dream Chan - 01 [WebRip 1080p HEVC-10bit AAC][简繁内封字幕] [复制磁连]
```

## 问题

正则匹配有一个问题是他会"消耗"匹配到的字符，也就是说每次匹配到一个字幕组后，下一次匹配时，这个字幕组就不再是字符串的一部分了。
`[百冬练习组&LoliHouse 猎户手抄部 喵萌奶茶屋 萌樱字幕组] 元祖！邦多利酱 / GANSO BanG Dream Chan - 01 [WebRip 1080p HEVC-10bit AAC][简繁内封字幕] [复制磁连]`
会变成
`LoliHouse 猎户手抄部 喵萌奶茶屋 萌樱字幕组] 元祖！邦多利酱 / GANSO BanG Dream Chan - 01 [WebRip 1080p HEVC-10bit AAC][简繁内封字幕] [复制磁连]`
这样前边界就失效了
Go 标准库的 `regexp` 不支持前瞻（lookahead）等高级正则特性，而 `dlclark/regexp2` 支持。那么在需要提取多个重叠匹配的场景下，哪种方式性能更好？

## 两种实现方案

### 方案一：标准库循环替换

```go
for {
    loc := stdRe.FindStringSubmatchIndex(title)
    if loc == nil {
        break
    }
    match := stdRe.FindStringSubmatch(title)
    if len(match) > 1 {
        groups = append(groups, match[1])
    }
    // 只替换第一个匹配
    title = title[:loc[0]] + "[]" + title[loc[1]:]
}
```

**思路**：找一个匹配 → 替换第一个 → 继续找 → 直到没有匹配

### 方案二：regexp2 前瞻

```go
title := testTitle
m, _ := regexp2LookaheadRe.FindStringMatch(title)
for m != nil {
    if len(m.Groups()) > 1 {
        groups = append(groups, m.Groups()[1].String())
    }
    m, _ = regexp2LookaheadRe.FindNextMatch(m)
}
title, _ = regexp2LookaheadRe.Replace(title, "[]", -1, -1)
```

**思路**：使用前瞻 `(?=boundaryEnd)` 不消耗边界字符，一次性找到所有匹配

## 正则表达式

```go
const (
    splitPattern  = `★／/_&（）\s\-\.\[\]\(\)`
    boundaryStart = `[` + splitPattern + `]`
    boundaryEnd   = boundaryStart
    boundaryEndOpt = `(?=` + boundaryEnd + `)` // 前瞻版本

    // 字幕组匹配模式
    groupPattern = boundaryStart + `(?i)(ANi|LoliHouse|SweetSub|百冬练习组|猎户手抄部|喵萌奶茶屋|萌樱字幕组|...)` + boundaryEnd

    // 前瞻版本
    groupPatternLookahead = boundaryStart + `(?i)(ANi|LoliHouse|SweetSub|百冬练习组|猎户手抄部|喵萌奶茶屋|萌樱字幕组|...)` + boundaryEndOpt
)
```

## 测试结果

### 正确性测试

两种方法都能正确提取出 5 个字幕组：

```
Standard regexp found 5 groups:
  Group 1: 百冬练习组
  Group 2: LoliHouse
  Group 3: 猎户手抄部
  Group 4: 喵萌奶茶屋
  Group 5: 萌樱字幕组

Regexp2 lookahead found 5 groups:
  Group 1: 百冬练习组
  Group 2: LoliHouse
  Group 3: 猎户手抄部
  Group 4: 喵萌奶茶屋
  Group 5: 萌樱字幕组
```

### 性能测试

在 Apple M2 上的 benchmark 结果：

```
BenchmarkStdRegexpMultipleMatches-8      49119     23472 ns/op      432 B/op       8 allocs/op
BenchmarkRegexp2Lookahead-8              17910     66794 ns/op     4144 B/op      52 allocs/op
```

| 指标 | 标准库循环替换 | regexp2 前瞻 | regexp2 比标准库 |
|------|--------------|-------------|-----------------|
| **速度** | 23472 ns/op | 66794 ns/op | **慢 185%** |
| **内存** | 432 B/op | 4144 B/op | **多 9.6 倍** |
| **分配次数** | 8 次 | 52 次 | **多 6.5 倍** |
| **吞吐量** | 49119 次 | 17910 次 | **少 63%** |

## 结论

在我们这种简单的需求下, 即使在需要匹配多个重叠字幕组的场景下，Go 标准库的"找一个→替换第一个→循环"方式仍然远优于 `dlclark/regexp2` 的前瞻实现：

- ✅ **速度快 2.85 倍**
- ✅ **内存占用少 9.6 倍**
- ✅ **分配次数少 6.5 倍**

### 建议

1. **优先使用标准库 `regexp`**：即使需要循环处理，性能仍然更优
2. **只在必要时使用 `regexp2`**：仅当确实需要前瞻、后顾、命名分组等标准库不支持的特性时
3. **性能敏感场景**：标准库的简单循环往往比复杂的正则特性更高效

## 代码仓库

完整的测试代码：

```go
package test

import (
 "regexp"
 "testing"

 regexp2 "github.com/dlclark/regexp2"
)

const testTitle = "[百冬练习组&LoliHouse 猎户手抄部 喵萌奶茶屋 萌樱字幕组] 元祖！邦多利酱 / GANSO BanG Dream Chan - 01 [WebRip 1080p HEVC-10bit AAC][简繁内封字幕] [复制磁连]"

// patterns.go 中的边界定义和字幕组正则
const (
 splitPattern  = `★／/_&（）\s\-\.\[\]\(\)`
 boundaryStart = `[` + splitPattern + `]`
 boundaryEnd   = boundaryStart
 boundaryEndOpt = `(?=` + boundaryEnd + `)`

 // GroupRe 的模式（来自 patterns.go）
 groupPattern = boundaryStart + `(?i)(ANi|LoliHouse|SweetSub|Pre-S|H-Enc|TOC|Billion Meta Lab|Lilith-Raws|DBD-Raws|NEO·QSW|SBSUB|MagicStar|7³ACG|KitaujiSub|Doomdos|Prejudice-Studio|GM-Team|VCB-Studio|` +
  `神椿观测站|极影字幕社|百冬练习组|猎户手抄部|喵萌奶茶屋|萌樱字幕组|三明治摆烂组|绿茶字幕组|梦蓝字幕组|幻樱字幕组|织梦字幕组|北宇治字组|北宇治字幕组|霜庭云花Sub|氢气烤肉架|豌豆字幕组|豌豆|DBD|` +
  `风之圣殿字幕组|黒ネズミたち|桜都字幕组|漫猫字幕组|猫恋汉化组|黑白字幕组|猎户压制部|猎户手抄部|沸班亚马制作组|星空字幕组|光雨字幕组|樱桃花字幕组|动漫国字幕组|动漫国|千夏字幕组|SW字幕组|澄空学园|` +
  `华盟字幕社|诸神字幕组|雪飘工作室|❀拨雪寻春❀|夜莺家族|YYQ字幕组|APTX4869|Prejudice-Studio|丸子家族)` + boundaryEnd

 // regexp2 使用前瞻的模式
 groupPatternLookahead = boundaryStart + `(?i)(ANi|LoliHouse|SweetSub|Pre-S|H-Enc|TOC|Billion Meta Lab|Lilith-Raws|DBD-Raws|NEO·QSW|SBSUB|MagicStar|7³ACG|KitaujiSub|Doomdos|Prejudice-Studio|GM-Team|VCB-Studio|` +
  `神椿观测站|极影字幕社|百冬练习组|猎户手抄部|喵萌奶茶屋|萌樱字幕组|三明治摆烂组|绿茶字幕组|梦蓝字幕组|幻樱字幕组|织梦字幕组|北宇治字组|北宇治字幕组|霜庭云花Sub|氢气烤肉架|豌豆字幕组|豌豆|DBD|` +
  `风之圣殿字幕组|黒ネズミたち|桜都字幕组|漫猫字幕组|猫恋汉化组|黑白字幕组|猎户压制部|猎户手抄部|沸班亚马制作组|星空字幕组|光雨字幕组|樱桃花字幕组|动漫国字幕组|动漫国|千夏字幕组|SW字幕组|澄空学园|` +
  `华盟字幕社|诸神字幕组|雪飘工作室|❀拨雪寻春❀|夜莺家族|YYQ字幕组|APTX4869|Prejudice-Studio|丸子家族)` + boundaryEndOpt
)

var (
 stdRe              = regexp.MustCompile(groupPattern)
 regexp2LookaheadRe = regexp2.MustCompile(groupPatternLookahead, 0)
)

// 使用标准库 regexp 多次匹配找到所有 group（模拟 meta_parser.go 的 findallSubTitle）
func BenchmarkStdRegexpMultipleMatches(b *testing.B) {
 b.ResetTimer()
 for i := 0; i < b.N; i++ {
  title := testTitle
  groups := make([]string, 0)

  // 找一个，replace 一次，循环直到没找到
  for {
   loc := stdRe.FindStringSubmatchIndex(title)
   if loc == nil {
    break
   }
   match := stdRe.FindStringSubmatch(title)
   if len(match) > 1 {
    groups = append(groups, match[1])
   }
   // 只替换第一个匹配
   title = title[:loc[0]] + "[]" + title[loc[1]:]
  }
  _ = groups
  _ = title
 }
}

// 使用 dlclark/regexp2 的前瞻匹配
// 使用前瞻可以在一次匹配中找到所有重叠的匹配
func BenchmarkRegexp2Lookahead(b *testing.B) {
 b.ResetTimer()
 for i := 0; i < b.N; i++ {
  title := testTitle
  groups := make([]string, 0)
  m, _ := regexp2LookaheadRe.FindStringMatch(title)
  for m != nil {
   if len(m.Groups()) > 1 {
    groups = append(groups, m.Groups()[1].String())
   }
   m, _ = regexp2LookaheadRe.FindNextMatch(m)
  }
  // 也做 replace 操作，保持公平
  title, _ = regexp2LookaheadRe.Replace(title, "[]", -1, -1)
  _ = groups
  _ = title
 }
}

// 测试正确性 - 标准库（模拟 meta_parser.go 的实现）
func TestStdRegexpCorrectness(t *testing.T) {
 title := testTitle
 groups := make([]string, 0)

 // 找一个，replace 一次，循环直到没找到
 for {
  loc := stdRe.FindStringSubmatchIndex(title)
  if loc == nil {
   break
  }
  match := stdRe.FindStringSubmatch(title)
  if len(match) > 1 {
   groups = append(groups, match[1])
  }
  // 只替换第一个匹配
  title = title[:loc[0]] + "[]" + title[loc[1]:]
  t.Logf("After replace: %s", title)
 }

 t.Logf("Standard regexp found %d groups:", len(groups))
 for i, group := range groups {
  t.Logf("  Group %d: %s", i+1, group)
 }
}

// 测试正确性 - regexp2 前瞻匹配
func TestRegexp2LookaheadCorrectness(t *testing.T) {
 groups := make([]string, 0)
 m, _ := regexp2LookaheadRe.FindStringMatch(testTitle)
 for m != nil {
  if len(m.Groups()) > 1 {
   groups = append(groups, m.Groups()[1].String())
  }
  m, _ = regexp2LookaheadRe.FindNextMatch(m)
 }

 t.Logf("Regexp2 lookahead found %d groups:", len(groups))
 for i, group := range groups {
  t.Logf("  Group %d: %s", i+1, group)
 }
}
```

运行测试：

```bash
# 正确性测试
go test -v ./test -run=Correctness

# 性能测试
go test -bench=. ./test -benchmem
```

---

**测试环境**：

- CPU: Apple M2
- OS: macOS (Darwin 24.6.0)
- Go: 1.x
- regexp2: v1.11.5
