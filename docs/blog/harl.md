---
title: harl
createTime: 2025/11/23 15:30:11
permalink: /blog/6r2w8ilf/
---

## 状态空间

### 单飞控制

前面三维是相对信息, 主要是上层控制传入的

这个训练的时候设定一个点, 然后让飞机飞到这个点去, 就可以来判断飞机的控制能力

```python
# 自身信息（9维）
0.  ego delta altitude      (单位: km)       - 相对高度差
1.  ego delta heading       (单位: rad)      - 相对航向角
2.  ego delta velocities_u  (单位: m/h)      - 相对速度差

3.  ego_altitude            (单位: 5km)      - 绝对高度
4.  ego_roll_sin                              - 横滚角正弦值
5.  ego_roll_cos                              - 横滚角余弦值
6.  ego_pitch_sin                             - 俯仰角正弦值
7.  ego_pitch_cos                             - 俯仰角余弦值

8.  ego v_body_x            (单位: m/h)      - 机体坐标系速度X
9.  ego v_body_y            (单位: m/h)      - 机体坐标系速度Y
10. ego v_body_z            (单位: m/h)      - 机体坐标系速度Z
11. ego_vc                  (单位: m/h)      - 真空速
```

单人作战(无武器)

```python
# 自身信息（9维）
0.  ego_altitude            (单位: 5km)      - 高度
1.  ego_roll_sin                              - 横滚角正弦
2.  ego_roll_cos                              - 横滚角余弦
3.  ego_pitch_sin                             - 俯仰角正弦
4.  ego_pitch_cos                             - 俯仰角余弦
5.  ego v_body_x            (单位: m/h)      - 速度X
6.  ego v_body_y            (单位: m/h)      - 速度Y
7.  ego v_body_z            (单位: m/h)      - 速度Z
8.  ego_vc                  (单位: m/h)      - 真空速

# 相对敌机信息（6维）
9.  delta_v_body_x          (单位: m/h)      - 速度差
10. delta_altitude          (单位: km)       - 高度差
11. ego_AO                  (单位: rad)      - 攻击角（Aspect Angle）[0, π]
12. ego_TA                  (单位: rad)      - 目标角（Target Angle）[0, π]
13. relative_distance       (单位: 10km)     - 相对距离
14. side_flag                                - 侧面标志（1/0/-1）
```

### 单人导弹作战任务

```python
# 自身信息（9维）
0-8.   (同上面的 0-8)

# 相对敌机信息（6维）
9-14.  (同上面的 9-14)

# 相对导弹信息（6维）
15. delta_v_body_x_missile  (单位: m/h)      - 导弹速度差
16. delta_altitude_missile  (单位: km)       - 导弹高度差
17. missile_AO              (单位: rad)      - 导弹攻击角
18. missile_TA              (单位: rad)      - 导弹目标角
19. missile_distance        (单位: 10km)     - 导弹相对距离
20. missile_side_flag                        - 导弹侧面标志
```

### 多人对抗任务

```python
# 自身信息（9维）
0-8.   (自己的信息，同上)

# 每个其他智能体的相对信息（每个6维）
9-14.   (第1个队友/敌机信息)
15-20.  (第2个队友/敌机信息)
21-26.  (第3个队友/敌机信息)

# 对于 2v2：
# 0-8:   自身信息（9维）
# 9-14:  队友1信息（6维）
# 15-20: 敌机1信息（6维）
# 21-26: 敌机2信息（6维）
总计 27 维
```
